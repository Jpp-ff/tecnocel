/**
 * requireAuth.middleware.js — Responsabilidad ÚNICA: proteger rutas que requieren sesión activa.
 * Se usa en las rutas de inventario, movimientos y órdenes una vez conectadas a Sheets.
 */
const authService = require('../services/auth.service');

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const sesion = authService.verificarSesion(token);
  if (!sesion) return res.status(401).json({ success: false, message: 'Debes iniciar sesión.' });
  req.usuario = sesion;
  next();
}

module.exports = { requireAuth };
