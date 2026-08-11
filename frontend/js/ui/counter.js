/**
 * counter.js
 * Responsabilidad ÚNICA: animar contadores numéricos
 */
function animateCount(el) {
  const target = parseInt(el.dataset.target);
  const suffix = el.querySelector('span').outerHTML;
  let count = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    count = Math.min(count + step, target);
    el.innerHTML = count + suffix;
    if (count >= target) clearInterval(timer);
  }, 24);
}

export function initCounter() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCount(e.target); observer.unobserve(e.target); }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num[data-target]').forEach(el => observer.observe(el));
}
