/**
 * estatus.handler.js — Responsabilidad ÚNICA: responder cuando un cliente
 * pregunta por el estatus de su equipo. Usa el número de WhatsApp desde el
 * que escribe para encontrar sus órdenes en "Ordenes_Servicio", sin tener
 * que pedirle que teclee su nombre o modelo (menos fricción, cero errores
 * de escritura).
 */
const ordenesService = require('../../services/ordenes.service');

const ETIQUETAS_ESTADO = {
  pendiente: 'En espera de diagnóstico',
  en_reparacion: 'En reparación',
  listo: 'Listo para recoger',
  entregado: 'Entregado',
};

function formatearFecha(fechaIso) {
  if (!fechaIso) return '';
  return new Date(fechaIso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function consultar(sock, telefono, enviar) {
  const ordenes = await ordenesService.buscarPorTelefono(telefono);

  if (ordenes.length === 0) {
    return enviar(
      'No encontramos ninguna cotización registrada con este número.\n\n' +
      'Si tu equipo lo dejaste en el taller sin escribirnos antes por aquí, ' +
      'llama directo al taller o escribe 0 para hablar con un técnico.'
    );
  }

  // Mostramos hasta las 3 órdenes más recientes de ese cliente
  const recientes = ordenes.slice(0, 3);
  const lineas = recientes.map(o => {
    const estado = ETIQUETAS_ESTADO[o.estado] || o.estado;
    return (
      `Folio ${o.id_orden}\n` +
      `Equipo: ${o.dispositivo} (${o.modelo_especifico})\n` +
      `Estatus: ${estado}\n` +
      `Recibido: ${formatearFecha(o.fecha_cotizacion)}`
    );
  });

  return enviar('Estatus de tu equipo:\n\n' + lineas.join('\n\n'));
}

module.exports = { consultar };