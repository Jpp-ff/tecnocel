/**
 * inventario.controller.js — Responsabilidad ÚNICA: exponer las rutas HTTP
 * del inventario. No contiene lógica de negocio; delega todo al servicio.
 * Todas las rutas requieren una sesión activa (requireAuth).
 */
const router = require('express').Router();
const inventarioService = require('../services/inventario.service');
const { requireAuth } = require('../middlewares/requireAuth.middleware');

router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const inventario = await inventarioService.listar();
    res.json({ success: true, data: inventario });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const pieza = await inventarioService.agregar(req.body);
    res.status(201).json({ success: true, data: pieza });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const resultado = await inventarioService.actualizar(req.params.id, req.body);
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const resultado = await inventarioService.eliminar(req.params.id);
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

// Ajuste manual desde el panel (botones + / -)
router.post('/:id/ajustar', async (req, res) => {
  try {
    const { cantidad, motivo } = req.body;
    const resultado = await inventarioService.ajustarStock(req.params.id, Number(cantidad), motivo);
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

// Descuento automático desde el escáner PWA al leer un código QR
router.post('/:id/usar', async (req, res) => {
  try {
    const resultado = await inventarioService.descontarStock(req.params.id, req.body.motivo);
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

router.get('/movimientos/recientes', async (_req, res) => {
  try {
    const movimientos = await inventarioService.listarMovimientos();
    res.json({ success: true, data: movimientos });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
