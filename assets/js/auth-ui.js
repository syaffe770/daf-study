import { listProfiles, createProfile, setActiveProfile, getActiveProfile } from "./store.js";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Shows a "who's studying?" overlay when no profile is active for this
// browser session. No OAuth, no password — a local, per-device profile
// picker (email + initials) so a shared device can tell people apart.
export function ensureSignedIn() {
  if (getActiveProfile()) return;

  const overlay = document.createElement("div");
  overlay.className = "auth-overlay";
  overlay.innerHTML = `
    <div class="auth-modal">
      <div class="eyebrow" style="text-align:left; margin-bottom:0.6rem;">WHO'S STUDYING?</div>
      <div id="auth-profile-list" class="auth-profiles"></div>
      <div class="auth-divider"><span>New here?</span></div>
      <form id="auth-new-form" class="auth-new">
        <input type="email" id="auth-email" placeholder="Email (just for your own record)" required />
        <input type="text" id="auth-initials" placeholder="Initials, e.g. SY" maxlength="4" required />
        <button type="submit" class="btn btn-primary">Create profile</button>
        <p class="auth-error" id="auth-error"></p>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const profiles = listProfiles();
  const listEl = overlay.querySelector("#auth-profile-list");
  listEl.innerHTML = profiles.length
    ? profiles
        .map((p) => `<button class="auth-profile-btn" data-initials="${esc(p.initials)}">${esc(p.initials)}</button>`)
        .join("")
    : `<p class="gloss-text" style="margin:0;">No profiles on this device yet — create the first one below.</p>`;

  listEl.querySelectorAll(".auth-profile-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveProfile(btn.dataset.initials);
      location.reload();
    });
  });

  overlay.querySelector("#auth-new-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = overlay.querySelector("#auth-email").value;
    const initials = overlay.querySelector("#auth-initials").value;
    const result = createProfile(email, initials);
    if (!result.ok) {
      overlay.querySelector("#auth-error").textContent = result.error;
      return;
    }
    setActiveProfile(result.profile.initials);
    location.reload();
  });
}
