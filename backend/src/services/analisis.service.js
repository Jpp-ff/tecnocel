/**
 * analisis.service.js — Responsabilidad ÚNICA: leer los resultados que el
 * análisis de Python ya dejó guardados en Google Sheets (hojas
 * "Predicciones_Demanda", "Predicciones_Merma", "Predicciones_Conversion")
 * y empaquetarlos en un único archivo Excel descargable.
 *
 * Este servicio NO ejecuta Python ni entrena ningún modelo — solo lee lo
 * que el script analytics/analizar.py ya calculó (manualmente o vía la
 * tarea programada de GitHub Actions) y lo entrega en un formato que
 * cualquier persona del negocio puede abrir con un clic, sin tocar código.
 */
const ExcelJS = require('exceljs');
const sheetsRepo = require('../repositories/sheets.repository');

const HOJAS_PREDICCIONES = [
  { hoja: 'Predicciones_Demanda', tituloExcel: 'Demanda de pantallas' },
  { hoja: 'Predicciones_Merma', tituloExcel: 'Merma por modelo' },
  { hoja: 'Predicciones_Conversion', tituloExcel: 'Conversión de cotizaciones' },
];

class AnalisisService {
  /** Devuelve un buffer de Excel (.xlsx) listo para descargar, con una pestaña por cada tipo de análisis. */
  async generarExcelDescargable() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tecnocel — Panel de Inventario';
    workbook.created = new Date();

    for (const { hoja, tituloExcel } of HOJAS_PREDICCIONES) {
      const hojaExcel = workbook.addWorksheet(tituloExcel);
      let datos;
      try {
        datos = await sheetsRepo.getAllComoObjetos(hoja);
      } catch (e) {
        datos = []; // si esa hoja aún no existe (nunca se ha corrido el análisis), la dejamos vacía
      }

      if (datos.length === 0) {
        hojaExcel.addRow(['Aún no hay datos de este análisis. Corre analytics/analizar.py al menos una vez.']);
        continue;
      }

      const columnas = Object.keys(datos[0]);
      hojaExcel.addRow(columnas).font = { bold: true };
      hojaExcel.getRow(1).eachCell(celda => {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE91E8C' } };
        celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });
      datos.forEach(fila => hojaExcel.addRow(columnas.map(c => fila[c])));
      hojaExcel.columns.forEach(columna => { columna.width = 22; });
    }

    return workbook.xlsx.writeBuffer();
  }
}

module.exports = new AnalisisService();