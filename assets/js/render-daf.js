import { loadDaf, loadManifest, qs } from "./content.js";
import { buildFlowSVG } from "./render-flow.js";
import { bestScoreFor } from "./store.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMishnah(m) {
  if (!m) return "";
  return `
    <section id="mishnah">
      <div class="section-head"><span class="section-num">01</span><h2>The Mishnah</h2><div class="section-dash"></div></div>
      <div class="mishnah-block">
        <div class="he-line">${m.he}</div>
        <div class="gloss">${m.gloss}</div>
      </div>
    </section>`;
}

function renderBefore(before, num) {
  if (!before || !before.length) return "";
  return `
    <section id="before">
      <div class="section-head"><span class="section-num">${num}</span><h2>Before you learn it</h2><div class="section-dash"></div></div>
      <div class="note" style="max-width:none;">${before.map((p) => `<p style="margin:0 0 0.6rem;">${p}</p>`).join("")}</div>
    </section>`;
}

function renderOpinions(opinions, num) {
  if (!opinions || !opinions.length) return "";
  return `
    <section id="opinions">
      <div class="section-head"><span class="section-num">${num}</span><h2>The opinions, side by side</h2><div class="section-dash"></div></div>
      <div class="opinions-grid">
        ${opinions
          .map(
            (o) => `
          <div class="opinion-card">
            <div class="who">${esc(o.who)} <span class="stance stance-${o.stanceClass}">${esc(o.stance)}</span></div>
            <p>${o.claim}</p>
            <p class="basis">${o.basis}</p>
          </div>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderScript(script, num) {
  if (!script || !script.length) return "";
  return `
    <section id="script">
      <div class="section-head"><span class="section-num">${num}</span><h2>The back-and-forth, turn by turn</h2><div class="section-dash"></div></div>
      <div class="script">
        ${script
          .map(
            (t) => `
          <div class="turn ${t.emphasis ? "emphasis" : ""}">
            <div class="speaker">${esc(t.speaker)}${t.speakerHe ? `<small>${t.speakerHe}</small>` : ""}</div>
            <div class="content">
              ${t.quote ? `<p class="quote">${t.quote}</p>` : ""}
              <p class="gloss-text">${t.gloss}</p>
            </div>
          </div>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderFlow(flow, title, caption, num) {
  if (!flow || !flow.length) return "";
  const svg = buildFlowSVG(flow, caption);
  return `
    <section id="after">
      <div class="section-head"><span class="section-num">${num}</span><h2>${title}</h2><div class="section-dash"></div></div>
      <figure>
        <div class="diagram-wrap wide">${svg}</div>
        <figcaption>${caption}</figcaption>
      </figure>
    </section>`;
}

function renderSources(sources) {
  if (!sources) return "";
  return `<p class="note" style="max-width:none; margin-top:2.5rem;"><b>Sources —</b> ${esc(sources)}</p>`;
}

function renderBreakdown(sections) {
  if (!sections.length) return "";
  return `
    <nav class="breakdown" aria-label="On this amud">
      <div class="breakdown-label">On this amud</div>
      <ol class="breakdown-list">
        ${sections.map((s) => `<li><a href="#${s.id}"><span class="section-num">${s.num}</span>${esc(s.title)}</a></li>`).join("")}
      </ol>
    </nav>`;
}

function renderQuizCTA(dafId, num) {
  return `
    <section id="quiz-cta">
      <div class="section-head"><span class="section-num">${num}</span><h2>Test yourself</h2><div class="section-dash"></div></div>
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 0.3rem;">Quiz — ${esc(dafId)}</h3>
          <p id="quiz-best-line">Multiple choice, with a "show answer" escape hatch on every question.</p>
        </div>
        <a class="btn btn-primary" href="quiz.html?id=${encodeURIComponent(dafId)}">Start quiz →</a>
      </div>
    </section>`;
}

function renderStudyCTA(dafId, num) {
  return `
    <section id="study-cta">
      <div class="section-head"><span class="section-num">${num}</span><h2>Study it with a partner or solo</h2><div class="section-dash"></div></div>
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 0.3rem;">Guided session — ${esc(dafId)}</h3>
          <p>Decode (TAPPS), red-team the real challenges, map the machloket, then teach it backward.</p>
        </div>
        <div class="btn-row">
          <a class="btn" href="study.html?id=${encodeURIComponent(dafId)}&mode=solo">Solo →</a>
          <a class="btn btn-primary" href="study.html?id=${encodeURIComponent(dafId)}&mode=partner">Partner (Havruta) →</a>
        </div>
      </div>
    </section>`;
}

async function renderDafNav(current) {
  const manifest = await loadManifest();
  const flat = manifest.dapim.flatMap((d) => d.amudim.map((a) => ({ ...a, dafLabel: d.label })));
  const i = flat.findIndex((a) => a.id === current);
  const prev = i > 0 ? flat[i - 1] : null;
  const next = i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
  const mount = document.getElementById("daf-pager");
  if (!mount) return;
  mount.innerHTML = `
    <div class="btn-row" style="justify-content:space-between;">
      ${prev ? `<a class="btn" href="daf.html?id=${prev.id}">← ${esc(prev.id)}</a>` : `<span></span>`}
      <a class="btn btn-ghost" href="index.html">Library</a>
      ${next ? `<a class="btn" href="daf.html?id=${next.id}">${esc(next.id)} →</a>` : `<span></span>`}
    </div>`;
}

export async function mountDafPage() {
  const id = qs("id") || "2a";
  const root = document.getElementById("daf-root");
  try {
    const d = await loadDaf(id);
    document.title = `${d.ref} · ${d.title} — Daf Study`;

    document.getElementById("eyebrow").innerHTML = `<he>${d.masechta === "Sukkah" ? "מסכת סוכה" : d.masechta}</he>${d.masechta.toUpperCase()} · DAF ${d.daf}${d.amud.toUpperCase()}`;
    document.getElementById("h1").textContent = d.title;
    document.getElementById("subtitle").textContent = d.subtitle || "";

    let n = 1;
    let html = "";
    const sections = [];
    const flowTitle = "Overview: how this amud is built";

    if (d.mishnah) { sections.push({ num: String(n).padStart(2, "0"), id: "mishnah", title: "The Mishnah" }); html += renderMishnah(d.mishnah); n++; }
    if (d.before?.length) { sections.push({ num: String(n).padStart(2, "0"), id: "before", title: "Before you learn it" }); html += renderBefore(d.before, n); n++; }
    if (d.flow?.length) { sections.push({ num: String(n).padStart(2, "0"), id: "after", title: flowTitle }); html += renderFlow(d.flow, flowTitle, d.flowCaption || "The shape of the sugya on this amud.", n); n++; }
    if (d.opinions?.length) { sections.push({ num: String(n).padStart(2, "0"), id: "opinions", title: "The opinions, side by side" }); html += renderOpinions(d.opinions, n); n++; }
    if (d.script?.length) { sections.push({ num: String(n).padStart(2, "0"), id: "script", title: "The back-and-forth, turn by turn" }); html += renderScript(d.script, n); n++; }
    sections.push({ num: String(n).padStart(2, "0"), id: "quiz-cta", title: "Test yourself" });
    html += renderQuizCTA(id, n);
    n++;
    sections.push({ num: String(n).padStart(2, "0"), id: "study-cta", title: "Study it with a partner or solo" });
    html += renderStudyCTA(id, n);
    html += renderSources(d.sources);

    root.innerHTML = renderBreakdown(sections) + html;

    const best = bestScoreFor(`${id}-practice`);
    const bestLine = document.getElementById("quiz-best-line");
    if (best && bestLine) {
      bestLine.textContent = `Best so far: ${best.correct}/${best.total} correct.`;
    }

    renderDafNav(id);
  } catch (err) {
    root.innerHTML = `<div class="note">Couldn't load content for "${esc(id)}" yet. <a href="index.html">Back to the library</a>.</div>`;
    console.error(err);
  }
}
