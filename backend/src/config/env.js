/**
 * env.js — Responsabilidad ÚNICA: centralizar y validar variables de entorno
 * Si falta alguna variable crítica, el servidor no arranca
 */
require('dotenv').config();

const REQUIRED = ['SHEETS_ID', 'GOOGLE_CREDENTIALS_JSON', 'SECRET_KEY'];

REQUIRED.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Variable de entorno faltante: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  port:        process.env.PORT || 3000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',
  sheetsId:    process.env.SHEETS_ID,
  googleCreds: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
  secretKey:   process.env.SECRET_KEY,
  adminHash:   process.env.ADMIN_PASSWORD_HASH,
};
