/**
 * nav.js
 * Responsabilidad ÚNICA: comportamiento de la barra de navegación
 */
export function initNav() {
  const nav = document.getElementById('mainNav');
  const bar = document.getElementById('progressBar');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
    if (bar) {
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      bar.style.width = pct + '%';
    }
  });
}
