/**
 * forms.js
 * Responsabilidad ÚNICA: manejar el formulario de cotización
 */
import { construirMensajeWA } from '../services/whatsapp.js';

export function initForms() {
  const btnWA = document.getElementById('btnEnviarWA');
  if (!btnWA) return;
  btnWA.addEventListener('click', enviarCotizacion);
}

function enviarCotizacion() {
  const nombre    = document.getElementById('nombre')?.value.trim();
  const telefono  = document.getElementById('telefono')?.value.trim();
  const disp      = document.getElementById('dispositivo')?.value;
  const problema  = document.getElementById('problema')?.value.trim();

  if (!nombre || !disp || !problema) {
    alert('Por favor completa nombre, dispositivo y descripción del problema.');
    return;
  }

  const url = construirMensajeWA({ nombre, telefono, dispositivo: disp, problema });
  window.open(url, '_blank');
}
