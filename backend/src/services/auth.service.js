/**
 * auth.service.js — Responsabilidad ÚNICA: lógica de negocio de autenticación.
 * Contiene registro, inicio de sesión, recuperación y restablecimiento de contraseña.
 * No sabe nada de HTTP (eso es trabajo del controlador) ni de dónde se guardan
 * los datos (eso es trabajo del repositorio).
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const usuariosRepo = require('../repositories/usuarios.repository');
const sesionesRepo = require('../repositories/sesiones.repository');
const { enviarCorreoRecuperacion } = require('../config/mailer');

const RONDAS_BCRYPT = 12; // costo de encriptación recomendado para producción
const DURACION_TOKEN_RESET_MIN = 30;

// ── Protección básica contra fuerza bruta ─────────────────────────
// Registra intentos fallidos por correo en memoria; tras 5 intentos,
// bloquea temporalmente ese correo durante 10 minutos.
const intentosFallidos = new Map(); // email -> { conteo, bloqueadoHasta }
const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 10;

function _verificarBloqueo(email) {
  const registro = intentosFallidos.get(email);
  if (registro && registro.bloqueadoHasta && Date.now() < registro.bloqueadoHasta) {
    const minutosRestantes = Math.ceil((registro.bloqueadoHasta - Date.now()) / 60000);
    throw new Error(`Demasiados intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto(s).`);
  }
}
function _registrarFallo(email) {
  const registro = intentosFallidos.get(email) || { conteo: 0 };
  registro.conteo++;
  if (registro.conteo >= MAX_INTENTOS) {
    registro.bloqueadoHasta = Date.now() + BLOQUEO_MIN * 60000;
    registro.conteo = 0;
  }
  intentosFallidos.set(email, registro);
}
function _limpiarFallos(email) {
  intentosFallidos.delete(email);
}

class AuthService {
  async registrar({ nombre, email, password }) {
    if (!nombre || !email || !password) throw new Error('Nombre, correo y contraseña son requeridos.');
    if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    if (usuariosRepo.buscarPorEmail(email)) throw new Error('Ya existe una cuenta con ese correo.');

    const esPrimerUsuario = usuariosRepo.obtenerTodos().length === 0;
    const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
    const usuario = {
      id: 'USR-' + Date.now(),
      nombre,
      email: email.toLowerCase(),
      passwordHash,
      // El primer usuario que se registra en todo el sistema queda como dueño/administrador,
      // aprobado automáticamente (alguien tiene que poder aprobar a los demás). Todos los
      // que se registren después quedan como técnicos, pendientes de aprobación del dueño.
      rol: esPrimerUsuario ? 'admin' : 'tecnico',
      estado: esPrimerUsuario ? 'aprobado' : 'pendiente',
      fechaRegistro: new Date().toISOString(),
    };
    usuariosRepo.crear(usuario);

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      estado: usuario.estado,
      mensaje: esPrimerUsuario
        ? 'Cuenta de administrador creada correctamente.'
        : 'Cuenta creada. Un administrador debe aprobar tu acceso antes de que puedas iniciar sesión.',
    };
  }

  async iniciarSesion({ email, password }) {
    if (!email || !password) throw new Error('Correo y contraseña son requeridos.');
    _verificarBloqueo(email);

    const usuario = usuariosRepo.buscarPorEmail(email);
    if (!usuario) { _registrarFallo(email); throw new Error('Correo o contraseña incorrectos.'); }

    const coincide = await bcrypt.compare(password, usuario.passwordHash);
    if (!coincide) { _registrarFallo(email); throw new Error('Correo o contraseña incorrectos.'); }

    if (usuario.estado === 'pendiente') {
      throw new Error('Tu cuenta está pendiente de aprobación por el administrador del taller.');
    }
    if (usuario.estado === 'denegado') {
      throw new Error('Tu acceso fue denegado. Habla con el administrador del taller si crees que es un error.');
    }

    _limpiarFallos(email);
    const token = crypto.randomBytes(32).toString('hex');
    sesionesRepo.crear(token, { email: usuario.email, nombre: usuario.nombre, id: usuario.id, rol: usuario.rol });
    return { token, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, id: usuario.id };
  }

  cerrarSesion(token) {
    sesionesRepo.eliminar(token);
  }

  verificarSesion(token) {
    if (!token) return null;
    return sesionesRepo.obtener(token);
  }

  async solicitarRecuperacion(email) {
    const usuario = usuariosRepo.buscarPorEmail(email);
    // Por seguridad, no revelamos si el correo existe o no en la respuesta pública
    if (!usuario) return;

    const token = crypto.randomBytes(24).toString('hex');
    const expira = Date.now() + DURACION_TOKEN_RESET_MIN * 60000;
    usuariosRepo.guardarTokenReset(usuario.email, token, expira);

    const enlace = `${process.env.FRONTEND_RESET_URL}?token=${token}`;
    await enviarCorreoRecuperacion(usuario.email, usuario.nombre, enlace);
  }

  async restablecerPassword(token, nuevaPassword) {
    if (!nuevaPassword || nuevaPassword.length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
    const registro = usuariosRepo.buscarToken(token);
    if (!registro) throw new Error('El enlace de recuperación no es válido.');
    if (Date.now() > registro.expira) { usuariosRepo.eliminarToken(token); throw new Error('El enlace de recuperación ha expirado. Solicita uno nuevo.'); }

    const nuevoHash = await bcrypt.hash(nuevaPassword, RONDAS_BCRYPT);
    usuariosRepo.actualizarPassword(registro.email, nuevoHash);
    usuariosRepo.eliminarToken(token);
  }

  // ── Solo para administradores (verificado por requireAdmin en el controlador) ──
  listarUsuarios() {
    return usuariosRepo.obtenerTodos().map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      estado: u.estado || 'aprobado', // usuarios creados antes de este cambio, por compatibilidad
      fechaRegistro: u.fechaRegistro,
    })); // nunca se incluye passwordHash
  }

  cambiarEstadoUsuario(idObjetivo, nuevoEstado, idSolicitante) {
    if (!['aprobado', 'denegado', 'pendiente'].includes(nuevoEstado)) {
      throw new Error('Estado no válido.');
    }
    if (idObjetivo === idSolicitante) {
      throw new Error('No puedes cambiar el estado de tu propia cuenta.');
    }
    const actualizado = usuariosRepo.actualizarEstado(idObjetivo, nuevoEstado);
    if (!actualizado) throw new Error('Usuario no encontrado.');
    return { id: actualizado.id, nombre: actualizado.nombre, estado: actualizado.estado };
  }
}

module.exports = new AuthService();