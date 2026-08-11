/**
 * sheets.repository.js — Responsabilidad ÚNICA: acceso genérico a datos en
 * Google Sheets. Ningún servicio del sistema debe hablar directamente con
 * la API de Google — todos pasan por aquí, para que el día que cambiemos
 * de motor de almacenamiento, sea el único archivo que se modifique.
 */
const { getSheetsClient } = require('../config/sheets');

const SHEETS_ID = process.env.SHEETS_ID;

class SheetsRepository {
  /** Agrega una fila nueva al final de la hoja indicada. */
  async append(hoja, fila) {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: `${hoja}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] },
    });
  }

  /** Devuelve todas las filas de una hoja, incluyendo el encabezado en la posición 0. */
  async getAll(hoja) {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: `${hoja}!A1:Z`,
    });
    return res.data.values || [];
  }

  /** Devuelve las filas ya convertidas a objetos, usando la fila 1 como encabezado. */
  async getAllComoObjetos(hoja) {
    const filas = await this.getAll(hoja);
    if (filas.length === 0) return [];
    const [encabezado, ...datos] = filas;
    return datos.map(fila => {
      const obj = {};
      encabezado.forEach((columna, i) => { obj[columna] = fila[i] ?? ''; });
      return obj;
    });
  }

  /** Sobrescribe una fila completa dado su número (1-indexado, incluyendo encabezado). */
  async updateRow(hoja, numeroFila, fila) {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEETS_ID,
      range: `${hoja}!A${numeroFila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] },
    });
  }

  /**
   * Busca el número de fila (1-indexado, contando encabezado) donde la
   * columna "id" coincide con el valor dado. Devuelve -1 si no existe.
   */
  async encontrarFilaPorId(hoja, columnaId, valorId) {
    const filas = await this.getAll(hoja);
    if (filas.length === 0) return { numeroFila: -1, fila: null };
    const encabezado = filas[0];
    const indiceColumna = encabezado.indexOf(columnaId);
    if (indiceColumna === -1) return { numeroFila: -1, fila: null };

    for (let i = 1; i < filas.length; i++) {
      if (filas[i][indiceColumna] === valorId) {
        return { numeroFila: i + 1, fila: filas[i], encabezado };
      }
    }
    return { numeroFila: -1, fila: null, encabezado };
  }
  /** Obtiene el ID numérico interno de una hoja a partir de su nombre (necesario para borrar filas). */
  async obtenerIdHoja(nombreHoja) {
    const sheets = await getSheetsClient();
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_ID });
    const hoja = metadata.data.sheets.find(h => h.properties.title === nombreHoja);
    if (!hoja) throw new Error(`No se encontró la hoja "${nombreHoja}" en el Google Sheets.`);
    return hoja.properties.sheetId;
  }

  /** Borra una fila por completo (numeroFila es 1-indexado, incluyendo encabezado). */
  async deleteRow(hoja, numeroFila) {
    const sheets = await getSheetsClient();
    const sheetId = await this.obtenerIdHoja(hoja);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEETS_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: numeroFila - 1,
              endIndex: numeroFila,
            },
          },
        }],
      },
    });
  }

}

module.exports = new SheetsRepository();