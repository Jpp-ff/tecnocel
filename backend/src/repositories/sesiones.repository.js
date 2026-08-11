/**
 * sesiones.repository.js — Responsabilidad ÚNICA: gestionar tokens de sesión activos.
 * Se mantiene en memoria (Map). Si el servidor se reinicia, las sesiones activas
 * se cierran y los usuarios deben volver a iniciar sesión — comportamiento
 * aceptable para un taller pequeño y evita depender de una base de datos extra.
 *
 * Las sesiones expiran solas después de un tiempo, para que un token robado
 * (por ejemplo, si alguien deja su celular desbloqueado y otra persona copia
 * el token desde las herramientas del navegador) no sirva para siempre.
 */
const sesiones = new Map(); // token -> { email, nombre, id, rol, creada }

const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

class SesionesRepository {
  crear(token, datos) {
    sesiones.set(token, { ...datos, creada: Date.now() });
  }

  obtener(token) {
    const sesion = sesiones.get(token);
    if (!sesion) return null;

    if (Date.now() - sesion.creada > DURACION_SESION_MS) {
      sesiones.delete(token); // sesión vencida, se limpia sola
      return null;
    }
    return sesion;
  }

  eliminar(token) {
    sesiones.delete(token);
  }
}

module.exports = new SesionesRepository();