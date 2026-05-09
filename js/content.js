/* =============================================================
   content.js — Moduły UI (poza wyszukiwarką i quizem)
   ----------------------------------------------------------------
   Trzy niezależne IIFE:
     1. Pasek postępu czytania — szerokość proporcjonalna do scroll/maxScroll
     2. Tryb skupienia — toggle ukrywający sidebar (zapamiętywany w localStorage)
     3. Aktywna pozycja w spisie treści — IntersectionObserver podświetla link
   ============================================================= */

/* 1. Pasek postępu czytania ---------------------------------- */
(function () {
  const bar = document.getElementById('progressBar');
  if (!bar) return;

  function update() {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (scrolled / max) * 100 : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* 2. Tryb skupienia ------------------------------------------ */
(function () {
  const btn = document.querySelector('.btn[data-action="focus"]');
  if (!btn) return;

  const KEY = 'pjb_focus_mode';

  function apply(on) {
    document.body.classList.toggle('focus-mode', on);
    btn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* prywatne okno */ }
  }

  let saved = '0';
  try { saved = localStorage.getItem(KEY) || '0'; } catch (e) { /* ignore */ }
  apply(saved === '1');

  btn.addEventListener('click', () => apply(!document.body.classList.contains('focus-mode')));
})();

/* 3. Aktywna pozycja w spisie treści ------------------------- */
(function () {
  const links = document.querySelectorAll('.sidebar a[href^="#"]');
  if (!links.length) return;

  const map = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const sec = document.getElementById(id);
    if (sec) map.set(sec, a);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const link = map.get(e.target);
      if (!link) return;
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

  map.forEach((_, sec) => observer.observe(sec));
})();
