/**
 * auth.controller.js — Responsabilidad ÚNICA: exponer las rutas HTTP de autenticación.
 * No contiene lógica de negocio; delega todo a auth.service.js.
 */
const router = require('express').Router();
const authService = require('../services/auth.service');
const { requireAuth } = require('../middlewares/requireAuth.middleware');
const { requireAdmin } = require('../middlewares/requireAdmin.middleware');

router.post('/registro', async (req, res) => {
  try {
    const usuario = await authService.registrar(req.body);
    res.status(201).json({ success: true, data: usuario });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const resultado = await authService.iniciarSesion(req.body);
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

router.post('/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  authService.cerrarSesion(token);
  res.json({ success: true });
});

router.get('/verificar', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const sesion = authService.verificarSesion(token);
  if (!sesion) return res.status(401).json({ success: false, message: 'Sesión inválida o expirada.' });
  res.json({ success: true, data: sesion });
});

router.post('/recuperar', async (req, res) => {
  try {
    await authService.solicitarRecuperacion(req.body.email);
    // Respuesta genérica siempre exitosa, para no revelar qué correos existen
    res.json({ success: true, message: 'Si el correo existe, se envió un enlace de recuperación.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo enviar el correo. Intenta más tarde.' });
  }
});

router.post('/restablecer', async (req, res) => {
  try {
    await authService.restablecerPassword(req.body.token, req.body.password);
    res.json({ success: true, message: 'Contraseña restablecida correctamente.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Solo administrador: ver y gestionar el acceso de los trabajadores ──
router.get('/usuarios', requireAuth, requireAdmin, (_req, res) => {
  try {
    const usuarios = authService.listarUsuarios();
    res.json({ success: true, data: usuarios });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/usuarios/:id/estado', requireAuth, requireAdmin, (req, res) => {
  try {
    const resultado = authService.cambiarEstadoUsuario(req.params.id, req.body.estado, req.usuario.id);
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;