/**
 * estadoConversacion.js — Responsabilidad ÚNICA: recordar en qué paso de la
 * conversación va cada cliente (por número de teléfono), mientras dura el
 * flujo de cotización. Vive en memoria — si el bot se reinicia, los clientes
 * a medias de una cotización simplemente empiezan de nuevo al escribir otra vez.
 */
const estados = new Map(); // telefono -> { paso, datos }

function obtener(telefono) {
  return estados.get(telefono) || null;
}
function iniciar(telefono) {
  const estado = { paso: 1, datos: {} };
  estados.set(telefono, estado);
  return estado;
}
function actualizar(telefono, estado) {
  estados.set(telefono, estado);
}
function terminar(telefono) {
  estados.delete(telefono);
}

module.exports = { obtener, iniciar, actualizar, terminar };