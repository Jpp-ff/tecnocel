/**
 * analisis.controller.js — Responsabilidad ÚNICA: exponer la ruta HTTP para
 * descargar el análisis de IA ya calculado, en formato Excel.
 */
const router = require('express').Router();
const analisisService = require('../services/analisis.service');
const { requireAuth } = require('../middlewares/requireAuth.middleware');

router.use(requireAuth);

router.get('/descargar', async (_req, res) => {
  try {
    const buffer = await analisisService.generarExcelDescargable();
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tecnocel-analisis-ia-${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;