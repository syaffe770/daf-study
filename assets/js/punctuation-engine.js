import { loadDrill } from "./content.js";
import { saveScore } from "./store.js";

const MARKS = [",", ".", "?"];
const ROUNDS = 8;
const QUIZ_ID = "punctuation";

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

function parseTemplate(template) {
  const parts = [];
  const re = /\{\{([,.?])\}\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(template))) {
    parts.push({ text: template.slice(last, m.index), mark: m[1] });
    last = re.lastIndex;
  }
  parts.push({ text: template.slice(last), mark: null });
  return parts;
}

export async function mountPunctuation() {
  const root = document.getElementById("drill-root");
  const set = await loadDrill("punctuation");
  document.getElementById("vocab-count").textContent = `${set.sentences.length} sentences in this set`;

  const order = shuffle(set.sentences).slice(0, Math.min(ROUNDS, set.sentences.length));
  const session = { i: 0, correctBlanks: 0, totalBlanks: 0 };

  function renderRound() {
    const sentence = order[session.i];
    const parts = parseTemplate(sentence.template);
    const answered = new Array(parts.length).fill(null);

    let html = `<div class="drill-shell" style="text-align:left;">
      <div class="btn-row" style="justify-content:space-between; margin-bottom:1.4rem;">
        <span class="gloss-text" style="font-family:var(--sans); font-size:0.8rem;">Sentence ${session.i + 1} / ${order.length}</span>
      </div>
      <p class="punct-sentence he" id="punct-sentence" dir="rtl">`;
    parts.forEach((p, idx) => {
      html += esc(p.text);
      if (p.mark !== null) {
        html += `<button class="punct-blank" data-idx="${idx}" data-correct="${p.mark}">___</button>`;
      }
    });
    html += `</p><div id="punct-picker"></div>
      <div class="btn-row" id="punct-actions" style="justify-content:center; margin-top:1.2rem;"></div>
    </div>`;
    root.innerHTML = html;

    const blanks = Array.from(root.querySelectorAll(".punct-blank"));
    session.totalBlanks += blanks.length;

    function checkDone() {
      if (answered.every((v, idx) => blanks.find((b) => Number(b.dataset.idx) === idx) === undefined || v !== null)) {
        document.getElementById("punct-actions").innerHTML = `<button class="btn btn-primary" id="btn-punct-next">${session.i < order.length - 1 ? "Next →" : "Finish →"}</button>`;
        document.getElementById("btn-punct-next").addEventListener("click", () => {
          session.i += 1;
          if (session.i < order.length) renderRound();
          else finishSession();
        });
      }
    }

    blanks.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const picker = document.getElementById("punct-picker");
        picker.innerHTML = `<div class="btn-row" style="justify-content:center; gap:0.5rem;">${MARKS.map((m) => `<button class="btn punct-mark-btn" data-mark="${m}">${m === "," ? "," : m}</button>`).join("")}</div>`;
        picker.querySelectorAll(".punct-mark-btn").forEach((mb) => {
          mb.addEventListener("click", () => {
            const chosen = mb.dataset.mark;
            const correct = btn.dataset.correct;
            const idx = Number(btn.dataset.idx);
            btn.textContent = chosen;
            btn.disabled = true;
            btn.classList.add(chosen === correct ? "punct-correct" : "punct-incorrect");
            if (chosen !== correct) {
              btn.title = `Correct: "${correct}"`;
            } else {
              session.correctBlanks += 1;
            }
            answered[idx] = chosen;
            picker.innerHTML = "";
            checkDone();
          });
        });
      });
    });
  }

  async function finishSession() {
    await saveScore({
      quizId: QUIZ_ID,
      daf: "drills",
      title: "Punctuation Drill",
      correct: session.correctBlanks,
      total: session.totalBlanks,
      revealed: 0,
      skipped: 0,
    });
    root.innerHTML = `
      <div class="drill-shell">
        <div class="score-num">${session.correctBlanks}/${session.totalBlanks}</div>
        <div class="score-sub">blanks placed correctly</div>
        <div class="btn-row" style="justify-content:center; margin-top:1.4rem;">
          <a class="btn btn-primary" href="punctuation.html">Drill again</a>
          <a class="btn btn-ghost" href="drills.html">Back to drills</a>
        </div>
      </div>`;
  }

  renderRound();
}
