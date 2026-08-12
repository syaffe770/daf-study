import { loadManifest } from "./content.js";
import { bestScoreFor } from "./store.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function amudCard(a, dafLabel) {
  const locked = a.status === "locked";
  if (locked) {
    return `
      <div class="card locked">
        <div class="card-eyebrow">${esc(dafLabel)} · ${a.amud.toUpperCase()} <span class="badge badge-locked">locked</span></div>
        <h3>${esc(a.title)}</h3>
        <p>Not built yet — unlocks as we work forward through the masechta.</p>
      </div>`;
  }
  const best = bestScoreFor(`${a.id}-practice`);
  const pct = best ? Math.round((best.correct / best.total) * 100) : 0;
  return `
    <a class="card" href="daf.html?id=${a.id}">
      <div class="card-eyebrow">${esc(dafLabel)} · ${a.amud.toUpperCase()} <span class="badge ${best ? "badge-done" : "badge-todo"}">${best ? "quizzed" : "not started"}</span></div>
      <h3>${esc(a.title)}</h3>
      <p>${best ? `Best score: ${best.correct}/${best.total}` : "Read the amud, then take the quiz."}</p>
      ${best ? `<div class="progress-bar"><span style="width:${pct}%"></span></div>` : ""}
    </a>`;
}

export async function mountLibrary() {
  const mount = document.getElementById("library-root");
  const manifest = await loadManifest();
  let html = "";
  for (const d of manifest.dapim) {
    html += `
      <section>
        <div class="section-head">
          <span class="section-num">${String(d.daf).padStart(2, "0")}</span>
          <h2>${esc(d.label)}</h2>
          <div class="section-dash"></div>
        </div>
        ${d.theme && d.theme !== "Coming soon" ? `<p class="gloss-text" style="margin:-0.6rem 0 1rem;">${esc(d.theme)}</p>` : ""}
        <div class="card-grid">
          ${d.amudim.map((a) => amudCard(a, d.label)).join("")}
        </div>
      </section>`;
  }
  mount.innerHTML = html;
}
