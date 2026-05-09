/* =============================================================
   search.js — Smart Search z nawigacją Enter
   ----------------------------------------------------------------
   Moduł wyszukiwarki przeszukujący pełną treść (innerText) sekcji.

   Działanie:
     1. Wpisanie ≥ 2 znaków (debounce 200 ms) podświetla wszystkie
        wystąpienia w treści tagiem <mark>.
     2. Strona płynnie scrolluje do pierwszego dopasowania, sekcja
        z wynikiem dostaje na 2 s klasę .highlight (flash tła).
     3. Wciśnięcie Enter w polu wyszukiwarki przeskakuje do KOLEJNEGO
        wystąpienia (cyklicznie). Aktualne dopasowanie ma klasę
        mark.current (pomarańczowe tło + obramowanie).
     4. Esc czyści wyszukiwanie.

   Licznik pokazuje „X z Y" dla aktualnego wystąpienia.
   ============================================================= */
(function () {
  const input    = document.getElementById('search');
  const counter  = document.getElementById('searchCount');
  const content  = document.querySelector('.content');
  if (!input || !counter || !content) return;

  // Tagi pomijane przy walce po DOM (nie chcemy rwać struktury layoutu).
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'MARK', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'BUTTON']);
  const FLASH_MS = 2000;

  // Stan wyszukiwarki — lista <mark> w kolejności DOM + wskaźnik aktualnego
  let matches = [];
  let currentIndex = -1;

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
    matches = [];
    currentIndex = -1;
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

  /** Aktualizuje licznik („X z Y" lub liczba dopasowań). */
  function updateCounter() {
    if (matches.length === 0) { counter.textContent = ''; return; }
    if (currentIndex < 0) {
      const n = matches.length;
      counter.textContent = n + ' ' +
        (n === 1 ? 'dopasowanie' : (n < 5 ? 'dopasowania' : 'dopasowań')) +
        ' · Enter, aby przejść';
    } else {
      counter.textContent = (currentIndex + 1) + ' z ' + matches.length +
        ' · Enter = następne';
    }
  }

  /** Ustawia aktualny <mark> i scrolluje do niego (z flashem sekcji przy pierwszym wejściu). */
  function focusMatch(index, flashSection) {
    if (matches.length === 0) return;
    matches.forEach(m => m.classList.remove('current'));
    const target = matches[index];
    if (!target) return;
    target.classList.add('current');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (flashSection) {
      const sec = target.closest('section');
      if (sec) {
        sec.classList.add('highlight');
        setTimeout(() => sec.classList.remove('highlight'), FLASH_MS);
      }
    }
    currentIndex = index;
    updateCounter();
  }

  /** Główna pętla — uruchamiana z debounce po wpisaniu znaków. */
  let timer;
  function run() {
    clearMarks(content);
    const q = input.value.trim();
    if (q.length < 2) { counter.textContent = ''; return; }

    const regex = new RegExp(escapeRegex(q), 'gi');
    const count = highlight(content, regex);

    if (count > 0) {
      matches = Array.from(content.querySelectorAll('mark'));
      currentIndex = -1;
      updateCounter();
      // Auto-przewiń do pierwszego wyniku, ale nie zaznaczaj go jako "current"
      // — pierwszy Enter stanie się świadomym przeskokiem na #1.
      const firstSection = matches[0] && matches[0].closest('section');
      if (firstSection) {
        firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        firstSection.classList.add('highlight');
        setTimeout(() => firstSection.classList.remove('highlight'), FLASH_MS);
      }
    } else {
      counter.textContent = 'brak wyników';
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  });

  /** Klawiatura: Enter = następne wystąpienie, Shift+Enter = poprzednie, Esc = czyść. */
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      clearMarks(content);
      counter.textContent = '';
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Jeżeli wpisano nowe zapytanie, ale debounce jeszcze nie zakończył pracy
      // — wymuszamy natychmiastowe wyszukiwanie.
      if (matches.length === 0 && input.value.trim().length >= 2) {
        clearTimeout(timer);
        run();
        // Po `run()` pierwszy Enter ma od razu skoczyć na #1.
        if (matches.length > 0) focusMatch(0, false);
        return;
      }
      if (matches.length === 0) return;
      const next = e.shiftKey
        ? (currentIndex - 1 + matches.length) % matches.length
        : (currentIndex + 1) % matches.length;
      focusMatch(next, false);
    }
  });
})();
