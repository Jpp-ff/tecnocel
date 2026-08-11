/**
 * ordenes.controller.js — Responsabilidad ÚNICA: exponer las rutas HTTP de
 * las órdenes de servicio. Protegidas con sesión, igual que inventario.
 */
const router = require('express').Router();
const ordenesService = require('../services/ordenes.service');
const { requireAuth } = require('../middlewares/requireAuth.middleware');

router.use(requireAuth);

router.get('/', async (_req, res) => {
  try {
    const ordenes = await ordenesService.listar();
    res.json({ success: true, data: ordenes });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/estado', async (req, res) => {
  try {
    const resultado = await ordenesService.cambiarEstado(req.params.id, req.body.estado, req.body.notas);
    res.json({ success: true, data: resultado });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;