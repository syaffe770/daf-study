import { loadDaf, loadManifest, qs } from "./content.js";
import { buildPhases } from "./study-templates.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function findPrevDaf(manifest, currentId) {
  const flat = manifest.dapim.flatMap((d) => d.amudim.filter((a) => a.status !== "locked"));
  const i = flat.findIndex((a) => a.id === currentId);
  if (i <= 0) return null;
  try {
    return await loadDaf(flat[i - 1].id);
  } catch {
    return null;
  }
}

export async function mountStudy() {
  const id = qs("id");
  const mode = qs("mode") === "partner" ? "partner" : "solo";
  const root = document.getElementById("study-root");
  if (!id) {
    root.innerHTML = `<div class="note">No amud specified. <a href="index.html">Back to the library</a>.</div>`;
    return;
  }

  let daf, manifest, prevDaf;
  try {
    daf = await loadDaf(id);
    manifest = await loadManifest();
    prevDaf = await findPrevDaf(manifest, id);
  } catch (err) {
    root.innerHTML = `<div class="note">Couldn't load "${esc(id)}" yet. <a href="index.html">Back to the library</a>.</div>`;
    return;
  }

  document.title = `Study session — ${daf.ref} — Daf Study`;
  document.getElementById("h1").textContent = `Study session — ${daf.ref}`;
  document.getElementById("subtitle").textContent =
    mode === "partner"
      ? "Havruta mode — each on your own screen, moving through the phases together."
      : "Solo mode — self-guided, same phases, self-check prompts.";

  const phases = buildPhases(daf, prevDaf);
  if (!phases.length) {
    root.innerHTML = `<div class="note">No study phases available for this amud yet.</div>`;
    return;
  }

  const state = { phaseIdx: 0, cardIdx: 0, role: "A", revealed: false, revealed2: false };

  function currentPhase() {
    return phases[state.phaseIdx];
  }
  function currentCard() {
    return currentPhase().cards[state.cardIdx];
  }

  function roleLabel() {
    return state.role === "A" ? "Explainer / Presenter" : "Clarifier / Red-teamer";
  }

  function renderModeBar() {
    const phase = currentPhase();
    return `
      <div class="study-topbar">
        <div class="study-phase-pills">
          ${phases
            .map(
              (p, i) =>
                `<span class="study-pill ${i === state.phaseIdx ? "active" : ""} ${i < state.phaseIdx ? "done" : ""}">${i + 1}. ${esc(p.title)}</span>`
            )
            .join("")}
        </div>
        ${mode === "partner" ? `<button class="btn btn-ghost" id="btn-swap-role">Swap roles</button>` : ""}
      </div>
      <div class="study-method">
        <div class="study-method-name">${esc(phase.method)}</div>
        <p class="gloss-text" style="margin:0.3rem 0 0;">${esc(phase.blurb)}</p>
        ${mode === "partner" ? `<div class="role-badge">You are: <b>${roleLabel()}</b></div>` : ""}
      </div>`;
  }

  function promptFor(card) {
    if (mode === "solo") return card.solo;
    return state.role === "A" ? card.partnerA : card.partnerB;
  }

  function renderCardBody(card, kind) {
    if (kind === "machloket") {
      return `
        <p class="quiz-q" style="font-size:1.05rem;">${esc(promptFor(card))}</p>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-family:var(--sans); font-size:0.9rem;">
            <thead><tr style="text-align:left; color:var(--ink-faint); border-bottom:1px solid var(--line);">
              <th style="padding:0.5rem 0.6rem;">Who</th><th style="padding:0.5rem 0.6rem;">Claim</th><th style="padding:0.5rem 0.6rem;">Root basis</th>
            </tr></thead>
            <tbody>
              ${card.matrix
                .map(
                  (row) => `
                <tr style="border-bottom:1px solid var(--line-soft); vertical-align:top;">
                  <td style="padding:0.6rem;"><b>${esc(row.who)}</b></td>
                  <td style="padding:0.6rem;">${row.claim}</td>
                  <td style="padding:0.6rem; ${state.revealed ? "" : "filter:blur(5px); user-select:none;"}">${row.basis}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${!state.revealed ? `<div class="btn-row" style="margin-top:1rem;"><button class="btn btn-primary" id="btn-reveal">Reveal the root basis</button></div>` : ""}
      `;
    }

    if (kind === "backward") {
      return `
        ${card.anchorText ? `<div class="quiz-explain" style="margin-bottom:1rem;"><b>${esc(card.anchorLabel)}:</b> ${card.anchorText}</div>` : ""}
        <p class="quiz-q" style="font-size:1.05rem;">${esc(promptFor(card))}</p>
        <p class="gloss-text">Nothing to reveal here — this one's on you. Move on when you've said it out loud (or typed it).</p>
      `;
    }

    if (kind === "redteam") {
      return `
        <p class="quiz-q" style="font-size:1.05rem;">${esc(promptFor(card))}</p>
        ${
          !state.revealed
            ? `<div class="btn-row"><button class="btn btn-primary" id="btn-reveal">Reveal the actual challenge</button></div>`
            : `
          <div class="quiz-explain" style="margin-bottom:0.8rem;">
            <b>${esc(card.revealLabel)}:</b>
            ${card.revealQuote ? `<p class="quote" style="margin:0.4rem 0;">${card.revealQuote}</p>` : ""}
            ${card.reveal}
          </div>
          ${
            card.resolution && !state.revealed2
              ? `<div class="btn-row"><button class="btn btn-primary" id="btn-reveal2">Reveal how it's resolved</button></div>`
              : card.resolution
                ? `<div class="quiz-explain"><b>${esc(card.resolutionLabel)}:</b> ${card.resolution}</div>`
                : ""
          }`
        }
      `;
    }

    // recount / decode
    return `
      ${card.quote ? `<p class="quote" style="margin-bottom:0.6rem;">${card.quote}</p>` : ""}
      <p class="quiz-q" style="font-size:1.05rem;">${esc(promptFor(card))}</p>
      ${
        !state.revealed
          ? `<div class="btn-row"><button class="btn btn-primary" id="btn-reveal">Reveal</button></div>`
          : `<div class="quiz-explain">${card.reveal}</div>`
      }
    `;
  }

  function nextIsLast() {
    return state.phaseIdx === phases.length - 1 && state.cardIdx === currentPhase().cards.length - 1;
  }

  function render() {
    const phase = currentPhase();
    const card = currentCard();
    root.innerHTML = `
      <div class="quiz-shell study-shell">
        ${renderModeBar()}
        <div class="quiz-progress">
          <span>Card ${state.cardIdx + 1} / ${phase.cards.length}</span>
          <div class="bar"><span style="width:${(state.cardIdx / phase.cards.length) * 100}%"></span></div>
        </div>
        ${renderCardBody(card, card.kind)}
        <div class="btn-row" style="justify-content:space-between; margin-top:1.4rem;">
          <a class="btn btn-ghost" href="daf.html?id=${id}">← Exit to amud</a>
          <button class="btn btn-primary" id="btn-next">${nextIsLast() ? "Finish session" : "Next →"}</button>
        </div>
      </div>`;

    document.getElementById("btn-swap-role")?.addEventListener("click", () => {
      state.role = state.role === "A" ? "B" : "A";
      render();
    });
    document.getElementById("btn-reveal")?.addEventListener("click", () => {
      state.revealed = true;
      render();
    });
    document.getElementById("btn-reveal2")?.addEventListener("click", () => {
      state.revealed2 = true;
      render();
    });
    document.getElementById("btn-next").addEventListener("click", next);
  }

  function next() {
    const phase = currentPhase();
    if (state.cardIdx < phase.cards.length - 1) {
      state.cardIdx += 1;
      state.revealed = false;
      state.revealed2 = false;
      render();
    } else if (state.phaseIdx < phases.length - 1) {
      state.phaseIdx += 1;
      state.cardIdx = 0;
      state.revealed = false;
      state.revealed2 = false;
      render();
    } else {
      finish();
    }
  }

  function finish() {
    root.innerHTML = `
      <div class="quiz-shell quiz-result">
        <div class="score-num">✓</div>
        <div class="score-sub">Session complete — ${esc(daf.ref)}</div>
        <div class="btn-row" style="justify-content:center; margin-top:1.4rem;">
          <a class="btn" href="daf.html?id=${id}">Back to ${esc(id)}</a>
          <a class="btn btn-ghost" href="index.html">Library</a>
        </div>
      </div>`;
  }

  render();
}
