import { loadManifest } from "./content.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function mountCurriculum() {
  const manifest = await loadManifest();
  const mount = document.getElementById("map-root");
  const html = manifest.dapim
    .map((d) => {
      const locked = d.amudim.every((a) => a.status === "locked");
      const themeLine = locked ? "Not built yet" : d.theme;
      const linkable = !locked;
      return `
      <div class="map-node ${locked ? "locked" : ""}">
        <div class="m-eyebrow">${esc(d.label)}</div>
        ${linkable ? `<h3><a href="daf.html?id=${d.amudim[0].id}" style="color:inherit; text-decoration:none;">${esc(themeLine)}</a></h3>` : `<h3>${esc(themeLine)}</h3>`}
        <p>${d.amudim.map((a) => esc(a.id)).join(" · ")}</p>
      </div>`;
    })
    .join("");
  mount.innerHTML = `<div class="map-track">${html}</div>`;
}
