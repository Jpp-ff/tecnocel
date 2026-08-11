/**
 * whatsapp.js
 * Responsabilidad ÚNICA: construir URLs de WhatsApp
 * No sabe nada del DOM ni del formulario
 */
const WA_NUMBER = '521TUNUMERO'; // ← Cambia por tu número real

export function construirMensajeWA({ nombre, telefono, dispositivo, problema }) {
  const texto = encodeURIComponent(
    `¡Hola Tecnocel! Quiero cotizar una reparación:\n\n` +
    `👤 *Nombre:* ${nombre}\n` +
    `📞 *Tel:* ${telefono || 'No proporcionado'}\n` +
    `📱 *Dispositivo:* ${dispositivo}\n` +
    `🔧 *Problema:* ${problema}\n\n` +
    `_Cotización enviada desde tecnocel.com.mx_`
  );
  return `https://wa.me/${WA_NUMBER}?text=${texto}`;
}
