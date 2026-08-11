/**
 * sheets.js — Responsabilidad ÚNICA: autenticar y exponer un cliente de
 * Google Sheets API reutilizable (patrón Singleton).
 *
 * Las credenciales se pueden dar de DOS formas (se prueban en este orden,
 * igual que en analytics/src/carga_datos.py, para mantener consistencia
 * en todo el proyecto):
 *   1) GOOGLE_CREDENTIALS_PATH en el .env → ruta a tu archivo .json descargado
 *      (RECOMENDADO: evita cualquier problema de copiar/pegar la clave privada)
 *   2) GOOGLE_CREDENTIALS_JSON en el .env → el JSON completo pegado en una línea
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

let _clienteSheets = null;

function _obtenerCredenciales() {
  const rutaCredenciales = process.env.GOOGLE_CREDENTIALS_PATH;
  if (rutaCredenciales) {
    const rutaAbsoluta = path.isAbsolute(rutaCredenciales)
      ? rutaCredenciales
      : path.join(__dirname, '../../', rutaCredenciales);
    if (!fs.existsSync(rutaAbsoluta)) {
      throw new Error(`GOOGLE_CREDENTIALS_PATH apunta a "${rutaAbsoluta}" pero ese archivo no existe.`);
    }
    return JSON.parse(fs.readFileSync(rutaAbsoluta, 'utf-8'));
  }

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  }

  throw new Error('No se encontraron credenciales de Google Sheets. Configura GOOGLE_CREDENTIALS_PATH o GOOGLE_CREDENTIALS_JSON en tu .env.');
}

async function getSheetsClient() {
  if (_clienteSheets) return _clienteSheets; // Singleton: una sola autenticación por proceso

  const credenciales = _obtenerCredenciales();
  const auth = new google.auth.GoogleAuth({
    credentials: credenciales,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _clienteSheets = google.sheets({ version: 'v4', auth });
  return _clienteSheets;
}

module.exports = { getSheetsClient };