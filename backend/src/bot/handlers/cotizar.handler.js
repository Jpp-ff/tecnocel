/**
 * cotizar.handler.js — Responsabilidad ÚNICA: conducir el flujo conversacional
 * de cotización paso a paso, guardar la orden en Google Sheets al terminar,
 * y avisar al propietario del taller por WhatsApp de la nueva solicitud.
 */
const ordenesService = require('../../services/ordenes.service');
const estadoConversacion = require('../estadoConversacion');

const TIPOS_DISPOSITIVO = {
  '1': 'Smartphone',
  '2': 'Tablet',
  '3': 'Laptop/PC',
  '4': 'Consola',
};

async function iniciar(sock, telefono, enviar) {
  estadoConversacion.iniciar(telefono);
  await enviar(
    'Cotización de reparación\n\n¿Qué tipo de dispositivo es?\n\n' +
    '1 - Smartphone\n2 - Tablet\n3 - Laptop/PC\n4 - Consola'
  );
}

async function continuar(sock, telefono, texto, enviar) {
  const estado = estadoConversacion.obtener(telefono);
  if (!estado) return iniciar(sock, telefono, enviar);

  if (estado.paso === 1) {
    estado.datos.dispositivo = TIPOS_DISPOSITIVO[texto.trim()] || texto.trim();
    estado.paso = 2;
    estadoConversacion.actualizar(telefono, estado);
    return enviar('¿Cuál es el modelo específico? (Ej: iPhone 13, Galaxy A54, PS5 Slim)');
  }

  if (estado.paso === 2) {
    estado.datos.modeloEspecifico = texto.trim();
    estado.paso = 3;
    estadoConversacion.actualizar(telefono, estado);
    return enviar('¿Cuál es el problema que presenta?');
  }

  if (estado.paso === 3) {
    estado.datos.problema = texto.trim();
    estado.paso = 4;
    estadoConversacion.actualizar(telefono, estado);
    return enviar('¿Cuál es tu nombre?');
  }

  if (estado.paso === 4) {
    estado.datos.nombreCliente = texto.trim();
    estadoConversacion.terminar(telefono);

    const orden = await ordenesService.crear({
      nombreCliente: estado.datos.nombreCliente,
      telefono,
      dispositivo: estado.datos.dispositivo,
      modeloEspecifico: estado.datos.modeloEspecifico,
      problema: estado.datos.problema,
    });

    await enviar(
      'Cotización registrada.\n\n' +
      'Folio: ' + orden.id_orden + '\n' +
      'Dispositivo: ' + orden.dispositivo + ' (' + orden.modelo_especifico + ')\n' +
      'Problema: ' + orden.problema + '\n\n' +
      'Te contactamos pronto con el presupuesto. Gracias ' + orden.nombre_cliente + '.'
    );

    await notificarPropietario(sock, orden);
    return;
  }
}

/**
 * Crea la orden directo cuando el mensaje ya viene con todos los datos
 * (el formulario de la landing page), sin repetirle preguntas al cliente
 * que ya las contestó en la página.
 */
async function crearDesdeFormularioWeb(sock, telefono, datos, enviar) {
  const orden = await ordenesService.crear({
    nombreCliente: datos.nombre,
    telefono,
    dispositivo: datos.dispositivo || 'No especificado',
    modeloEspecifico: datos.modeloEspecifico,
    problema: datos.problema,
  });

  await enviar(
    'Recibimos tu cotización desde la página. Folio: ' + orden.id_orden + '\n\n' +
    'Dispositivo: ' + orden.dispositivo + (orden.modelo_especifico ? ' (' + orden.modelo_especifico + ')' : '') + '\n' +
    'Problema: ' + orden.problema + '\n\n' +
    'Te contactamos pronto con el presupuesto. Gracias ' + orden.nombre_cliente + '.'
  );

  await notificarPropietario(sock, orden);
}

async function notificarPropietario(sock, orden) {
  const numeroPropietario = process.env.OWNER_WHATSAPP_NUMBER;
  if (!numeroPropietario) return; // si no está configurado, simplemente no avisa

  const destino = numeroPropietario.includes('@') ? numeroPropietario : numeroPropietario + '@s.whatsapp.net';
  const mensaje =
    'Nueva cotización recibida\n\n' +
    'Cliente: ' + orden.nombre_cliente + '\n' +
    'Tel: ' + orden.telefono.replace('@s.whatsapp.net', '') + '\n' +
    'Dispositivo: ' + orden.dispositivo + ' (' + orden.modelo_especifico + ')\n' +
    'Problema: ' + orden.problema + '\n' +
    'Folio: ' + orden.id_orden;

  try {
    await sock.sendMessage(destino, { text: mensaje });
  } catch (e) {
    console.error('No se pudo notificar al propietario:', e.message);
  }
}

module.exports = { iniciar, continuar, crearDesdeFormularioWeb };