import { whoAmI, setWhoAmI, getLocalScores } from "./store.js";

const LINKS = [
  { href: "index.html", key: "library", label: "Library" },
  { href: "quizzes.html", key: "quizzes", label: "Quizzes" },
  { href: "aramaic.html", key: "aramaic", label: "Aramaic" },
  { href: "curriculum.html", key: "curriculum", label: "Curriculum" },
];

function ensureProfile() {
  let who = whoAmI();
  if (!who) {
    try {
      who = prompt("Quick setup — what's your name? (so quiz scores are labeled correctly)", "") || "Learner";
    } catch {
      who = "Learner";
    }
    who = who.trim() || "Learner";
    setWhoAmI(who);
  }
  return who;
}

export function renderNav() {
  const mount = document.getElementById("site-nav");
  if (!mount) return;
  const active = document.body.dataset.page;
  const who = ensureProfile();
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
        <button class="streak" id="who-pill" title="Click to change your name" style="cursor:pointer; border:1px solid var(--line); font-family:inherit;">${who} · ${scores.length} quiz${scores.length === 1 ? "" : "zes"} done</button>
      </div>
    </div>
  `;

  document.getElementById("who-pill")?.addEventListener("click", () => {
    try {
      const next = prompt("Change your name:", who);
      if (next && next.trim()) {
        setWhoAmI(next.trim());
        renderNav();
      }
    } catch {
      /* prompt unavailable in this environment */
    }
  });
}

export function renderFooter(text = "Daf Study · a study aid, not a substitute for the daf itself") {
  const mount = document.getElementById("site-footer");
  if (!mount) return;
  mount.innerHTML = `<footer class="site-footer">${text}</footer>`;
}

renderNav();
renderFooter();
