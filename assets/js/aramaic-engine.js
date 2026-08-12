import { loadVocabSet } from "./content.js";
import { recordVocabAttempt, getVocabProgress } from "./store.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

const ROUNDS = 10;

export async function mountAramaic() {
  const root = document.getElementById("drill-root");
  const set = await loadVocabSet("core");

  document.getElementById("vocab-count").textContent = `${set.words.length} words in this set`;

  const session = { i: 0, streak: 0, correct: 0, order: [], answered: false };
  for (let n = 0; n < ROUNDS; n++) session.order.push(set.words[Math.floor(Math.random() * set.words.length)]);

  function renderRound() {
    const word = session.order[session.i];
    const distractors = pick(
      set.words.filter((w) => w.id !== word.id),
      3
    ).map((w) => w.meaning);
    const options = shuffle([word.meaning, ...distractors]);
    session.answered = false;

    root.innerHTML = `
      <div class="drill-shell">
        <div class="btn-row" style="justify-content:space-between; margin-bottom:1.4rem;">
          <span class="gloss-text" style="font-family:var(--sans); font-size:0.8rem;">Round ${session.i + 1} / ${ROUNDS}</span>
          <span class="streak-pill">🔥 streak ${session.streak}</span>
        </div>
        <div class="drill-word">${word.he}</div>
        <div class="drill-hint">${esc(word.translit)} · what does this mean?</div>
        <div class="drill-options">
          ${options.map((opt) => `<button class="quiz-opt" data-opt="${esc(opt)}">${esc(opt)}</button>`).join("")}
        </div>
        <div id="drill-explain-slot"></div>
        <div class="btn-row" id="drill-actions" style="justify-content:center; margin-top:1rem;">
          <button class="btn btn-ghost" id="btn-drill-skip">Skip →</button>
        </div>
      </div>`;

    root.querySelectorAll(".quiz-opt").forEach((btn) => {
      btn.addEventListener("click", () => choose(btn, word));
    });
    document.getElementById("btn-drill-skip").addEventListener("click", () => advance());
  }

  function choose(btn, word) {
    if (session.answered) return;
    session.answered = true;
    const correct = btn.dataset.opt === word.meaning;
    root.querySelectorAll(".quiz-opt").forEach((b) => {
      b.disabled = true;
      if (b.dataset.opt === word.meaning) b.classList.add("correct");
      else if (b === btn) b.classList.add("incorrect");
    });
    session.streak = correct ? session.streak + 1 : 0;
    if (correct) session.correct += 1;
    recordVocabAttempt(word.id, correct);
    document.getElementById("drill-actions").innerHTML = `<button class="btn btn-primary" id="btn-drill-next">${session.i < ROUNDS - 1 ? "Next →" : "Finish →"}</button>`;
    document.getElementById("btn-drill-next").addEventListener("click", () => advance());
  }

  function advance() {
    if (session.i < ROUNDS - 1) {
      session.i += 1;
      renderRound();
    } else {
      renderSummary();
    }
  }

  function renderSummary() {
    root.innerHTML = `
      <div class="drill-shell">
        <div class="score-num">${session.correct}/${ROUNDS}</div>
        <div class="score-sub">best streak this session: ${session.streak}</div>
        <div class="btn-row" style="justify-content:center; margin-top:1.4rem;">
          <button class="btn btn-primary" id="btn-again">Drill again</button>
          <a class="btn btn-ghost" href="index.html">Back to library</a>
        </div>
      </div>`;
    document.getElementById("btn-again").addEventListener("click", () => {
      session.i = 0; session.streak = 0; session.correct = 0;
      session.order = [];
      for (let n = 0; n < ROUNDS; n++) session.order.push(set.words[Math.floor(Math.random() * set.words.length)]);
      renderRound();
    });
  }

  renderRound();
}
