/**
 * cotizacion.service.js — Responsabilidad ÚNICA: lógica de negocio de cotizaciones
 * No sabe nada de HTTP ni de cómo se almacenan los datos
 */
const repo = require('../repositories/sheets.repository');

class CotizacionService {
  async crear(datos) {
    const cotizacion = {
      id:          Date.now().toString(),
      nombre:      datos.nombre,
      telefono:    datos.telefono || '',
      dispositivo: datos.dispositivo,
      problema:    datos.problema,
      fecha:       new Date().toLocaleString('es-MX'),
      estado:      'Pendiente',
    };

    // Guardar en Google Sheets
    await repo.append('Cotizaciones', [
      cotizacion.id, cotizacion.nombre, cotizacion.telefono,
      cotizacion.dispositivo, cotizacion.problema,
      cotizacion.fecha, cotizacion.estado,
    ]);

    return cotizacion;
  }

  async listar() {
    const filas = await repo.getAll('Cotizaciones');
    return filas.slice(1).map(f => ({ // saltar encabezado
      id: f[0], nombre: f[1], telefono: f[2],
      dispositivo: f[3], problema: f[4], fecha: f[5], estado: f[6],
    }));
  }
}

module.exports = new CotizacionService();
