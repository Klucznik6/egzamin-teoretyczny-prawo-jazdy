/* =============================================================
   search.js — Smart Search
   ----------------------------------------------------------------
   Moduł wyszukiwarki przeszukujący pełną treść (innerText) sekcji.
   Po znalezieniu wyniku:
     1. wszystkie dopasowane fragmenty są podświetlane <mark>,
     2. strona płynnie scrolluje do pierwszej sekcji z dopasowaniem,
     3. ta sekcja dostaje na 2s klasę .highlight (flash tła).
   Esc czyści wyszukiwanie. Debounce 200 ms.
   ============================================================= */
(function () {
  const input    = document.getElementById('search');
  const counter  = document.getElementById('searchCount');
  const content  = document.querySelector('.content');
  if (!input || !counter || !content) return;

  // Tagi pomijane przy walce po DOM (nie chcemy rwać struktury layoutu).
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'MARK', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'BUTTON']);
  const FLASH_MS = 2000;

  /** Escape znaków specjalnych regexa. */
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Usuwa wszystkie wcześniej dodane <mark> i scala sąsiadujące węzły tekstowe. */
  function clearMarks(root) {
    const marks = root.querySelectorAll('mark');
    marks.forEach(m => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    // Usuń klasę highlight z poprzednio podświetlonej sekcji
    root.querySelectorAll('section.highlight').forEach(s => s.classList.remove('highlight'));
  }

  /** Rekurencyjnie podświetla dopasowania w drzewie DOM. Zwraca liczbę dopasowań. */
  function highlight(node, regex) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (!text || !text.trim()) return 0;
      regex.lastIndex = 0;
      if (!regex.test(text)) return 0;

      regex.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let count = 0;
      let m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
        }
        const mark = document.createElement('mark');
        mark.textContent = m[0];
        frag.appendChild(mark);
        lastIdx = m.index + m[0].length;
        count++;
        if (m[0].length === 0) regex.lastIndex++;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
      return count;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return 0;
    const tag = node.tagName;
    if (SKIP_TAGS.has(tag)) return 0;
    if (tag.toLowerCase() === 'svg') return 0;

    let total = 0;
    const children = Array.from(node.childNodes);
    for (const child of children) total += highlight(child, regex);
    return total;
  }

  /** Płynny scroll do sekcji + 2s flash tła. */
  function scrollAndFlash(section) {
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.classList.add('highlight');
    setTimeout(() => section.classList.remove('highlight'), FLASH_MS);
  }

  /** Główna pętla — uruchamiana z debounce 200 ms. */
  let timer;
  function run() {
    clearMarks(content);
    const q = input.value.trim();
    if (q.length < 2) { counter.textContent = ''; return; }

    const regex = new RegExp(escapeRegex(q), 'gi');
    const count = highlight(content, regex);

    if (count > 0) {
      counter.textContent = count + ' ' +
        (count === 1 ? 'dopasowanie' : (count < 5 ? 'dopasowania' : 'dopasowań'));

      // Znajdź pierwszą sekcję zawierającą dopasowanie i przewiń do niej
      const firstMark = content.querySelector('mark');
      if (firstMark) {
        const parentSection = firstMark.closest('section');
        scrollAndFlash(parentSection);
      }
    } else {
      counter.textContent = 'brak wyników';
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  });

  // Esc czyści input i wszystkie podświetlenia
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      clearMarks(content);
      counter.textContent = '';
    }
  });
})();
