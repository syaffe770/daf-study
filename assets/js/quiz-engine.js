import { loadQuiz, qs } from "./content.js";
import { saveScore, whoAmI } from "./store.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function mountQuiz() {
  const id = qs("id");
  const root = document.getElementById("quiz-root");
  if (!id) {
    root.innerHTML = `<div class="note">No quiz specified. <a href="quizzes.html">Browse all quizzes</a>.</div>`;
    return;
  }

  let quiz;
  try {
    quiz = await loadQuiz(id);
  } catch (err) {
    root.innerHTML = `<div class="note">Couldn't load that quiz yet. <a href="quizzes.html">Browse all quizzes</a>.</div>`;
    return;
  }

  document.title = `${quiz.title} — Daf Study`;
  document.getElementById("h1").textContent = quiz.title;
  document.getElementById("subtitle").textContent = `${quiz.questions.length} questions · multiple choice, with a show-answer option any time`;
  const sourceEl = document.getElementById("quiz-source");
  if (sourceEl) sourceEl.textContent = quiz.source || "";

  const state = {
    i: 0,
    correct: 0,
    revealed: 0,
    skipped: 0,
    answered: false,
  };

  function renderQuestion() {
    const total = quiz.questions.length;
    const q = quiz.questions[state.i];
    root.innerHTML = `
      <div class="quiz-shell">
        <div class="quiz-progress">
          <span>Question ${state.i + 1} / ${total}</span>
          <div class="bar"><span style="width:${(state.i / total) * 100}%"></span></div>
        </div>
        <p class="quiz-q">${esc(q.q)}</p>
        <div class="quiz-options">
          ${q.options
            .map(
              (opt, idx) => `<button class="quiz-opt" data-idx="${idx}">${esc(opt)}</button>`
            )
            .join("")}
        </div>
        <div id="quiz-explain-slot"></div>
        <div class="btn-row" id="quiz-actions">
          <button class="btn btn-ghost" id="btn-show">Show answer</button>
          <button class="btn btn-ghost" id="btn-skip" style="margin-inline-start:auto;">Skip →</button>
        </div>
      </div>`;

    state.answered = false;
    root.querySelectorAll(".quiz-opt").forEach((btn) => {
      btn.addEventListener("click", () => choose(Number(btn.dataset.idx)));
    });
    document.getElementById("btn-show").addEventListener("click", reveal);
    document.getElementById("btn-skip").addEventListener("click", skip);
  }

  function lockOptions() {
    root.querySelectorAll(".quiz-opt").forEach((b) => (b.disabled = true));
  }

  function showExplain(q) {
    document.getElementById("quiz-explain-slot").innerHTML = `<div class="quiz-explain">${esc(q.explain)}</div>`;
    document.getElementById("quiz-actions").innerHTML = `<button class="btn btn-primary" id="btn-next" style="margin-inline-start:auto;">${state.i < quiz.questions.length - 1 ? "Next →" : "See results →"}</button>`;
    document.getElementById("btn-next").addEventListener("click", next);
  }

  function choose(idx) {
    if (state.answered) return;
    state.answered = true;
    const q = quiz.questions[state.i];
    const opts = root.querySelectorAll(".quiz-opt");
    opts[q.correct].classList.add("correct");
    if (idx !== q.correct) {
      opts[idx].classList.add("incorrect");
    } else {
      state.correct += 1;
    }
    lockOptions();
    showExplain(q);
  }

  function reveal() {
    if (state.answered) return;
    state.answered = true;
    state.revealed += 1;
    const q = quiz.questions[state.i];
    const opts = root.querySelectorAll(".quiz-opt");
    opts[q.correct].classList.add("reveal-correct");
    lockOptions();
    showExplain(q);
  }

  function skip() {
    if (state.answered) return;
    state.skipped += 1;
    next();
  }

  async function next() {
    if (state.i < quiz.questions.length - 1) {
      state.i += 1;
      renderQuestion();
    } else {
      await finish();
    }
  }

  async function finish() {
    const total = quiz.questions.length;
    const record = await saveScore({
      quizId: quiz.id,
      daf: quiz.daf,
      title: quiz.title,
      correct: state.correct,
      revealed: state.revealed,
      skipped: state.skipped,
      total,
      profile: whoAmI(),
    });
    const pct = Math.round((state.correct / total) * 100);
    root.innerHTML = `
      <div class="quiz-shell quiz-result">
        <div class="score-num">${pct}%</div>
        <div class="score-sub">${state.correct} of ${total} correct</div>
        <div class="score-tally">
          <div><b>${state.correct}</b>correct</div>
          <div><b>${state.revealed}</b>revealed</div>
          <div><b>${state.skipped}</b>skipped</div>
        </div>
        <div class="btn-row" style="justify-content:center;">
          <button class="btn btn-primary" id="btn-retry">Retake quiz</button>
          <a class="btn" href="daf.html?id=${quiz.daf}">Back to ${esc(quiz.daf)}</a>
          <a class="btn btn-ghost" href="quizzes.html">All quizzes</a>
        </div>
      </div>`;
    document.getElementById("btn-retry").addEventListener("click", () => {
      state.i = 0; state.correct = 0; state.revealed = 0; state.skipped = 0;
      renderQuestion();
    });
  }

  renderQuestion();
}
