import { loadManifest, loadDaf } from "./content.js";
import { saveScore } from "./store.js";

const QUIZ_ID = "classify";
const ROUNDS = 10;

// Maps our internal script-turn types onto the five moves the user asked for.
const TYPE_MAP = {
  question: "Question",
  answer: "Answer",
  challenge: "Attack",
  resolution: "Defense",
  source: "Proof",
};
const CATEGORIES = ["Question", "Answer", "Attack", "Defense", "Proof"];

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

async function collectTurns() {
  const manifest = await loadManifest();
  const flat = manifest.dapim.flatMap((d) => d.amudim.filter((a) => a.status === "available"));
  const dafs = await Promise.all(flat.map((a) => loadDaf(a.id).catch(() => null)));
  const turns = [];
  dafs.forEach((d) => {
    if (!d?.script) return;
    d.script.forEach((t) => {
      if (TYPE_MAP[t.type]) turns.push({ ...t, dafId: d.id, category: TYPE_MAP[t.type] });
    });
  });
  return turns;
}

export async function mountClassify() {
  const root = document.getElementById("drill-root");
  const allTurns = await collectTurns();
  document.getElementById("vocab-count").textContent = `${allTurns.length} moves in the pool, from every amud built so far`;

  const order = shuffle(allTurns).slice(0, Math.min(ROUNDS, allTurns.length));
  const session = { i: 0, correct: 0 };

  function renderRound() {
    const turn = order[session.i];
    root.innerHTML = `
      <div class="drill-shell" style="text-align:left;">
        <div class="btn-row" style="justify-content:space-between; margin-bottom:1.4rem;">
          <span class="gloss-text" style="font-family:var(--sans); font-size:0.8rem;">Move ${session.i + 1} / ${order.length} · from ${esc(turn.dafId)}</span>
        </div>
        ${turn.quote ? `<p class="quote" style="font-size:1.15rem;">${turn.quote}</p>` : ""}
        <p style="font-size:1rem; color:var(--ink-soft);">${turn.gloss}</p>
        <div class="quiz-options" style="margin-top:1.2rem;">
          ${CATEGORIES.map((c) => `<button class="quiz-opt" data-cat="${c}">${c}</button>`).join("")}
        </div>
        <div id="classify-explain-slot"></div>
        <div class="btn-row" id="classify-actions" style="justify-content:center; margin-top:1rem;"></div>
      </div>`;

    root.querySelectorAll(".quiz-opt").forEach((btn) => {
      btn.addEventListener("click", () => choose(btn, turn));
    });
  }

  function choose(btn, turn) {
    const chosen = btn.dataset.cat;
    const correct = chosen === turn.category;
    root.querySelectorAll(".quiz-opt").forEach((b) => {
      b.disabled = true;
      if (b.dataset.cat === turn.category) b.classList.add("correct");
      else if (b === btn) b.classList.add("incorrect");
    });
    if (correct) session.correct += 1;
    document.getElementById("classify-explain-slot").innerHTML = `<div class="quiz-explain">This was tagged <b>${turn.category}</b> — from ${esc(turn.speaker || turn.dafId)}.</div>`;
    document.getElementById("classify-actions").innerHTML = `<button class="btn btn-primary" id="btn-classify-next">${session.i < order.length - 1 ? "Next →" : "Finish →"}</button>`;
    document.getElementById("btn-classify-next").addEventListener("click", () => {
      session.i += 1;
      if (session.i < order.length) renderRound();
      else finishSession();
    });
  }

  async function finishSession() {
    await saveScore({
      quizId: QUIZ_ID,
      daf: "drills",
      title: "Classify the Move",
      correct: session.correct,
      total: order.length,
      revealed: 0,
      skipped: 0,
    });
    root.innerHTML = `
      <div class="drill-shell">
        <div class="score-num">${session.correct}/${order.length}</div>
        <div class="score-sub">moves classified correctly</div>
        <div class="btn-row" style="justify-content:center; margin-top:1.4rem;">
          <a class="btn btn-primary" href="classify.html">Drill again</a>
          <a class="btn btn-ghost" href="drills.html">Back to drills</a>
        </div>
      </div>`;
  }

  renderRound();
}
