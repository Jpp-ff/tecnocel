/**
 * landingParser.js — Responsabilidad ÚNICA: reconocer el mensaje ya
 * estructurado que la landing page manda por WhatsApp (el formulario de
 * cotización del sitio), y extraer sus datos, para que el bot NO vuelva a
 * preguntarle al cliente lo que ya escribió en la página.
 *
 * Si el mensaje no coincide con ese formato, devuelve null, y el bot sigue
 * su flujo normal de conversación (menú, cotización paso a paso, etc.) sin
 * ningún cambio.
 */

function extraerCampo(texto, etiqueta) {
  const regex = new RegExp(etiqueta + ':\\s*(.+)', 'i');
  const coincidencia = texto.match(regex);
  return coincidencia ? coincidencia[1].trim() : '';
}

/**
 * Devuelve { nombre, dispositivo, modeloEspecifico, problema } si el texto
 * coincide con el formato del formulario web, o null si no coincide.
 */
function intentarParsear(texto) {
  const pareceMensajeDeLaPagina =
    /quiero cotizar una reparaci[oó]n/i.test(texto) &&
    /nombre:/i.test(texto) &&
    /problema:/i.test(texto);

  if (!pareceMensajeDeLaPagina) return null;

  const nombre = extraerCampo(texto, 'Nombre');
  const dispositivo = extraerCampo(texto, 'Dispositivo');
  const modeloEspecifico = extraerCampo(texto, 'Modelo');
  const problema = extraerCampo(texto, 'Problema');

  // Si faltan los datos esenciales, mejor no forzar el parseo — que siga el flujo normal
  if (!nombre || !problema) return null;

  return { nombre, dispositivo, modeloEspecifico, problema };
}

module.exports = { intentarParsear };