import { getActiveProfile, signOut, getLocalScores } from "./store.js";
import { ensureSignedIn } from "./auth-ui.js";

const LINKS = [
  { href: "index.html", key: "library", label: "Library" },
  { href: "quizzes.html", key: "quizzes", label: "Quizzes" },
  { href: "aramaic.html", key: "aramaic", label: "Aramaic" },
  { href: "curriculum.html", key: "curriculum", label: "Curriculum" },
];

export function renderNav() {
  const mount = document.getElementById("site-nav");
  if (!mount) return;
  const active = document.body.dataset.page;
  const profile = getActiveProfile();
  const scores = getLocalScores();

  mount.innerHTML = `
    <div class="site-nav">
      <div class="inner">
        <a class="brand" href="index.html"><he>גמרא</he>Daf Study</a>
        <div class="links">
          ${LINKS.map(
            (l) => `<a href="${l.href}" class="${l.key === active ? "active" : ""}">${l.label}</a>`
          ).join("")}
        </div>
        <button class="streak" id="who-pill" title="Switch profile">${profile ? profile.initials : "Sign in"} · ${scores.length} quiz${scores.length === 1 ? "" : "zes"} done</button>
      </div>
    </div>
  `;

  document.getElementById("who-pill")?.addEventListener("click", () => {
    signOut();
    location.reload();
  });

  ensureSignedIn();
}

export function renderFooter(text = "Daf Study · a study aid, not a substitute for the daf itself") {
  const mount = document.getElementById("site-footer");
  if (!mount) return;
  mount.innerHTML = `<footer class="site-footer">${text}</footer>`;
}

renderNav();
renderFooter();
