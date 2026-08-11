/**
 * ordenes.service.js — Responsabilidad ÚNICA: lógica de negocio de las
 * órdenes de servicio (cotizaciones). No sabe nada de WhatsApp ni de HTTP
 * — el bot y los controladores del panel consumen este servicio por igual.
 */
const sheetsRepo = require('../repositories/sheets.repository');

const HOJA_ORDENES = 'Ordenes_Servicio';
const TRANSICIONES_VALIDAS = {
  pendiente: ['en_reparacion'],
  en_reparacion: ['listo'],
  listo: ['entregado'],
  entregado: [],
};

class OrdenesService {
  async crear({ nombreCliente, telefono, dispositivo, modeloEspecifico, problema }) {
    const orden = {
      id_orden: 'ORD-' + Date.now(),
      nombre_cliente: nombreCliente,
      telefono,
      dispositivo,
      modelo_especifico: modeloEspecifico || '',
      problema,
      estado: 'pendiente',
      fecha_cotizacion: new Date().toISOString(),
      fecha_listo: '',
      fecha_entrega: '',
      notas_entrega: '',
      notificado: '',
    };
    await sheetsRepo.append(HOJA_ORDENES, [
      orden.id_orden, orden.nombre_cliente, orden.telefono, orden.dispositivo,
      orden.modelo_especifico, orden.problema, orden.estado, orden.fecha_cotizacion,
      orden.fecha_listo, orden.fecha_entrega, orden.notas_entrega, orden.notificado,
    ]);
    return orden;
  }

  async listar() {
    return sheetsRepo.getAllComoObjetos(HOJA_ORDENES);
  }

  async cambiarEstado(idOrden, nuevoEstado, notas) {
    const { numeroFila, fila, encabezado } = await sheetsRepo.encontrarFilaPorId(HOJA_ORDENES, 'id_orden', idOrden);
    if (numeroFila === -1) {
      const error = new Error('Orden no encontrada.');
      error.status = 404;
      throw error;
    }

    const idxEstado = encabezado.indexOf('estado');
    const estadoActual = fila[idxEstado];
    const permitidas = TRANSICIONES_VALIDAS[estadoActual] || [];
    if (!permitidas.includes(nuevoEstado)) {
      const error = new Error(`No se puede pasar de "${estadoActual}" a "${nuevoEstado}".`);
      error.status = 400;
      throw error;
    }

    const filaActualizada = [...fila];
    filaActualizada[idxEstado] = nuevoEstado;
    const ahora = new Date().toISOString();

    if (nuevoEstado === 'listo') {
      const idx = encabezado.indexOf('fecha_listo');
      filaActualizada[idx] = ahora;
      const idxNotificado = encabezado.indexOf('notificado');
      filaActualizada[idxNotificado] = ''; // el bot lo detectará y notificará al cliente
    }
    if (nuevoEstado === 'entregado') {
      filaActualizada[encabezado.indexOf('fecha_entrega')] = ahora;
      if (notas) filaActualizada[encabezado.indexOf('notas_entrega')] = notas;
    }

    await sheetsRepo.updateRow(HOJA_ORDENES, numeroFila, filaActualizada);
    return { id_orden: idOrden, estado: nuevoEstado };
  }

  /** Usado por la opción "Consultar estatus" del bot: busca las órdenes de ese cliente por su número. */
  async buscarPorTelefono(telefono) {
    const ordenes = await this.listar();
    return ordenes
      .filter(o => o.telefono === telefono)
      .sort((a, b) => new Date(b.fecha_cotizacion) - new Date(a.fecha_cotizacion));
  }

  /** Usado por el bot: órdenes que ya están "listo" pero aún no se avisó al cliente. */
  async listarPendientesDeNotificar() {
    const ordenes = await this.listar();
    return ordenes.filter(o => o.estado === 'listo' && o.notificado !== 'si');
  }

  async marcarComoNotificada(idOrden) {
    const { numeroFila, fila, encabezado } = await sheetsRepo.encontrarFilaPorId(HOJA_ORDENES, 'id_orden', idOrden);
    if (numeroFila === -1) return;
    const filaActualizada = [...fila];
    filaActualizada[encabezado.indexOf('notificado')] = 'si';
    await sheetsRepo.updateRow(HOJA_ORDENES, numeroFila, filaActualizada);
  }
}

module.exports = new OrdenesService();