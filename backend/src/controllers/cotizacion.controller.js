/**
 * cotizacion.controller.js — Responsabilidad ÚNICA: manejar rutas HTTP de cotizaciones
 * No contiene lógica de negocio
 */
const router  = require('express').Router();
const service = require('../services/cotizacion.service');
const { validarCotizacion } = require('../middlewares/validate.middleware');

router.post('/', validarCotizacion, async (req, res, next) => {
  try {
    const resultado = await service.crear(req.body);
    res.status(201).json({ success: true, data: resultado });
  } catch (err) { next(err); }
});

router.get('/', async (_req, res, next) => {
  try {
    const lista = await service.listar();
    res.json({ success: true, data: lista });
  } catch (err) { next(err); }
});

module.exports = router;
