/* =============================================================
   quiz.js — Szybki test
   ----------------------------------------------------------------
   Każde pytanie (.quiz-question) ma:
     data-answer  — "tak" lub "nie"
     data-explain — pełne wyjaśnienie wyświetlane po kliknięciu
   Po kliknięciu przycisku TAK/NIE pojawia się zielona/czerwona
   karta z odpowiedzią i objaśnieniem.

   Eksportowana funkcja resetQuiz(quizId) czyści wszystkie odpowiedzi
   w wybranym quizie (lub we wszystkich, gdy quizId niepodany).
   Każdy quiz ma przycisk „Resetuj" obok tytułu.
   ============================================================= */

/**
 * Resetuje stan jednego lub wszystkich quizów.
 * @param {string} [quizId] — identyfikator pojedynczego quizu (.quick-quiz#id).
 *                            Pominięcie resetuje wszystkie quizy na stronie.
 */
function resetQuiz(quizId) {
  const root = quizId
    ? document.getElementById(quizId)
    : document;
  if (!root) return;

  const quizzes = quizId
    ? [root]
    : root.querySelectorAll('.quick-quiz');

  quizzes.forEach(quiz => {
    // Wyczyść zaznaczenia przycisków
    quiz.querySelectorAll('.quiz-btn.selected').forEach(b => b.classList.remove('selected'));
    // Ukryj feedbacki i wyczyść klasy correct/wrong
    quiz.querySelectorAll('.quiz-feedback').forEach(fb => {
      fb.classList.remove('shown', 'correct', 'wrong');
      fb.textContent = '';
    });
  });
}

// Eksport do globalu (umożliwia wywołanie z konsoli i z onclick)
window.resetQuiz = resetQuiz;

(function () {
  // 1. Inicjalizacja przycisków „Resetuj" w nagłówku każdego quizu
  document.querySelectorAll('.quick-quiz').forEach(quiz => {
    const resetBtn = quiz.querySelector('.quiz-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => resetQuiz(quiz.id));
    }
  });

  // 2. Inicjalizacja pojedynczych pytań — obsługa kliknięcia TAK/NIE
  document.querySelectorAll('.quiz-question').forEach(q => {
    const correct = (q.dataset.answer || '').toLowerCase();
    const explain = q.dataset.explain || '';
    const buttons = q.querySelectorAll('.quiz-btn');
    const fb = q.querySelector('.quiz-feedback');
    if (!fb || !correct) return;

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = (btn.dataset.value || '').toLowerCase();
        const ok = choice === correct;

        // Wizualne zaznaczenie wybranego przycisku
        buttons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Feedback z wyjaśnieniem (zielony / czerwony)
        fb.classList.remove('correct', 'wrong');
        fb.classList.add('shown', ok ? 'correct' : 'wrong');
        const prefix = ok ? '✓ Tak, zgadza się.' : '✗ Niepoprawnie.';
        fb.innerHTML = '<strong>' + prefix + '</strong> ' + explain;
      });
    });
  });
})();
