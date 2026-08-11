/**
 * validate.middleware.js — Responsabilidad ÚNICA: validar entradas de la API
 */
const { body, validationResult } = require('express-validator');

const validarCotizacion = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido'),
  body('dispositivo').notEmpty().withMessage('El dispositivo es requerido'),
  body('problema').trim().isLength({ min: 10 }).withMessage('Describe el problema (mín. 10 caracteres)'),
  (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ success: false, errores: errores.array() });
    next();
  },
];

module.exports = { validarCotizacion };
