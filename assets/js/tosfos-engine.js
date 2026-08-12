import { loadDaf, qs } from "./content.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function mountTosfos() {
  const id = qs("id");
  const root = document.getElementById("tosfos-root");
  if (!id) {
    root.innerHTML = `<div class="note">No amud specified. <a href="index.html">Back to the library</a>.</div>`;
    return;
  }

  let daf;
  try {
    daf = await loadDaf(id);
  } catch {
    root.innerHTML = `<div class="note">Couldn't load "${esc(id)}" yet. <a href="index.html">Back to the library</a>.</div>`;
    return;
  }

  document.title = `Tosfos — ${daf.ref} — Daf Study`;
  document.getElementById("h1").textContent = `Tosfos — ${daf.ref}`;
  document.getElementById("subtitle").textContent = daf.title || "";

  const tosfos = daf.tosfos || [];
  if (!tosfos.length) {
    root.innerHTML = `<div class="note">No Tosfos added for this amud yet. <a href="daf.html?id=${esc(id)}">Back to ${esc(id)}</a>.</div>`;
    return;
  }

  root.innerHTML = `
    <div class="tosfos-list">
      ${tosfos
        .map(
          (t) => `
        <details class="tosfos-card">
          <summary>
            <div class="tosfos-head-row">
              <span class="tosfos-dh">${t.dh}</span>
              <span class="tosfos-dh-en">D"H ${esc(t.dhEn)}</span>
              <span class="tosfos-toggle"></span>
            </div>
            <p class="tosfos-summary">${esc(t.summary)}</p>
          </summary>
          <div class="tosfos-points">
            ${t.points
              .map(
                (p) => `
              <div class="tosfos-point type-${p.type}${p.sub ? " sub" : ""}">
                <span class="tosfos-point-label">${esc(p.label)}</span>
                ${p.he ? `<p class="quote">${p.he}</p>` : ""}
                <p class="en">${p.en}</p>
              </div>`
              )
              .join("")}
          </div>
        </details>`
        )
        .join("")}
    </div>
    <div class="btn-row" style="justify-content:space-between; margin-top:2rem;">
      <a class="btn btn-ghost" href="daf.html?id=${esc(id)}">← Back to ${esc(id)}</a>
      <a class="btn" href="index.html">Library</a>
    </div>
    <p class="note" style="max-width:none; margin-top:2rem;"><b>Source —</b> ${esc(daf.sources || "")}</p>`;
}
