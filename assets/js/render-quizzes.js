import { loadManifest, loadQuiz } from "./content.js";
import { getScores, bestScoreFor } from "./store.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function renderPractice() {
  const manifest = await loadManifest();
  const mount = document.getElementById("practice-root");
  const cards = await Promise.all(
    manifest.quizzes.practice.map(async (qid) => {
      try {
        const q = await loadQuiz(qid);
        const best = bestScoreFor(qid);
        return `
          <a class="card" href="quiz.html?id=${qid}">
            <div class="card-eyebrow">${esc(q.daf)} <span class="badge ${best ? "badge-done" : "badge-todo"}">${best ? "attempted" : "not started"}</span></div>
            <h3>${esc(q.title)}</h3>
            <p>${q.questions.length} questions${best ? ` · best ${best.correct}/${best.total}` : ""}</p>
          </a>`;
      } catch {
        return "";
      }
    })
  );
  mount.innerHTML = cards.join("") || `<p class="gloss-text">No practice quizzes yet.</p>`;
}

function renderMilestone(manifest) {
  const mount = document.getElementById("milestone-root");
  if (!manifest.quizzes.milestone.length) {
    mount.innerHTML = `
      <div class="card locked">
        <div class="card-eyebrow">Milestone <span class="badge badge-locked">locked</span></div>
        <h3>Daf 2–12 cumulative quiz</h3>
        <p>Unlocks once daf 3–12 are built — a bigger quiz pulling from across the whole run.</p>
      </div>`;
    return;
  }
  mount.innerHTML = manifest.quizzes.milestone.map((m) => `<div class="card">${esc(m)}</div>`).join("");
}

async function renderHistory() {
  const mount = document.getElementById("history-root");
  const scores = await getScores();
  if (!scores.length) {
    mount.innerHTML = `<p class="gloss-text">No quizzes taken yet on this device.</p>`;
    return;
  }
  mount.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-family:var(--sans); font-size:0.88rem;">
        <thead>
          <tr style="text-align:left; color:var(--ink-faint); border-bottom:1px solid var(--line);">
            <th style="padding:0.5rem 0.6rem;">Date</th>
            <th style="padding:0.5rem 0.6rem;">Who</th>
            <th style="padding:0.5rem 0.6rem;">Quiz</th>
            <th style="padding:0.5rem 0.6rem;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${scores
            .slice(0, 25)
            .map(
              (s) => `
            <tr style="border-bottom:1px solid var(--line-soft);">
              <td style="padding:0.5rem 0.6rem;">${fmtDate(s.ts)}</td>
              <td style="padding:0.5rem 0.6rem;">${esc(s.profile || "—")}</td>
              <td style="padding:0.5rem 0.6rem;">${esc(s.title || s.quizId)}</td>
              <td style="padding:0.5rem 0.6rem; font-variant-numeric: tabular-nums;">${s.correct}/${s.total}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

export async function mountQuizzesHub() {
  const manifest = await loadManifest();
  await Promise.all([renderPractice(), renderHistory()]);
  renderMilestone(manifest);
}
