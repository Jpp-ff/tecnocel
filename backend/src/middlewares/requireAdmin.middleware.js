/**
 * requireAdmin.middleware.js — Responsabilidad ÚNICA: proteger rutas que
 * solo el dueño/administrador del taller puede usar (aprobar o denegar
 * cuentas, ver la lista de trabajadores). Se usa DESPUÉS de requireAuth,
 * que ya deja `req.usuario` disponible con los datos de la sesión.
 */
function requireAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({ success: false, message: 'Solo el administrador puede realizar esta acción.' });
  }
  next();
}

module.exports = { requireAdmin };