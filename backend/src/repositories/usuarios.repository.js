/**
 * usuarios.repository.js — Responsabilidad ÚNICA: acceso a datos de usuarios.
 *
 * NOTA TÉCNICA: por ahora los usuarios se guardan en un archivo JSON local
 * (backend/data/usuarios.json), con la misma estructura de columnas que
 * después usará la hoja "Usuarios" de Google Sheets: id, nombre, email,
 * password_hash, fecha_registro, rol. Cuando conectemos Sheets, esta es
 * la única pieza que cambia — el resto del sistema de login no se toca.
 */
const fs = require('fs');
const path = require('path');

const CARPETA_DATOS = path.join(__dirname, '../../data');
const ARCHIVO = path.join(CARPETA_DATOS, 'usuarios.json');
const ARCHIVO_TOKENS = path.join(CARPETA_DATOS, 'reset_tokens.json');

function _asegurarCarpeta() {
  if (!fs.existsSync(CARPETA_DATOS)) fs.mkdirSync(CARPETA_DATOS, { recursive: true });
}

function _leerArchivo(ruta) {
  _asegurarCarpeta();
  if (!fs.existsSync(ruta)) return [];
  const contenido = fs.readFileSync(ruta, 'utf-8').trim();
  return contenido ? JSON.parse(contenido) : [];
}
function _escribirArchivo(ruta, data) {
  _asegurarCarpeta();
  fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf-8');
}

class UsuariosRepository {
  obtenerTodos() {
    return _leerArchivo(ARCHIVO);
  }

  buscarPorEmail(email) {
    const usuarios = this.obtenerTodos();
    return usuarios.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  buscarPorId(id) {
    const usuarios = this.obtenerTodos();
    return usuarios.find(u => u.id === id) || null;
  }

  crear(usuario) {
    const usuarios = this.obtenerTodos();
    usuarios.push(usuario);
    _escribirArchivo(ARCHIVO, usuarios);
    return usuario;
  }

  actualizarEstado(id, nuevoEstado) {
    const usuarios = this.obtenerTodos();
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx === -1) return null;
    usuarios[idx].estado = nuevoEstado;
    _escribirArchivo(ARCHIVO, usuarios);
    return usuarios[idx];
  }

  actualizarPassword(email, nuevoHash) {
    const usuarios = this.obtenerTodos();
    const idx = usuarios.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return false;
    usuarios[idx].passwordHash = nuevoHash;
    _escribirArchivo(ARCHIVO, usuarios);
    return true;
  }

  // ── Tokens de recuperación de contraseña ──────────────────────
  guardarTokenReset(email, token, expira) {
    const tokens = _leerArchivo(ARCHIVO_TOKENS).filter(t => t.email !== email);
    tokens.push({ email, token, expira });
    _escribirArchivo(ARCHIVO_TOKENS, tokens);
  }

  buscarToken(token) {
    const tokens = _leerArchivo(ARCHIVO_TOKENS);
    return tokens.find(t => t.token === token) || null;
  }

  eliminarToken(token) {
    const tokens = _leerArchivo(ARCHIVO_TOKENS).filter(t => t.token !== token);
    _escribirArchivo(ARCHIVO_TOKENS, tokens);
  }
}

module.exports = new UsuariosRepository();