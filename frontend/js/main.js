/**
 * main.js — Punto de entrada único del frontend
 * Responsabilidad: inicializar todos los módulos UI
 * SOLID: S — orquesta, no implementa lógica de negocio
 */
import { initCursor }    from './ui/cursor.js';
import { initNav }       from './ui/nav.js';
import { initReveal }    from './ui/reveal.js';
import { initCounter }   from './ui/counter.js';
import { initForms }     from './ui/forms.js';

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initReveal();
  initCounter();
  initForms();
});
