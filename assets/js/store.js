// Score / progress storage. Defaults to localStorage (per-device).
// Multiple people can share one device via lightweight local "profiles"
// (email + initials, no OAuth, no password) — see profiles section below.
// If assets/js/firebase-config.js sets FIREBASE_CONFIG.enabled = true,
// scores also sync to Firestore so two people can share one score list
// across devices. See README.md "Turning on shared scores" for setup.

const LS_KEYS = {
  profiles: "daf-study:profiles",
  scores: "daf-study:scores",
  vocab: "daf-study:vocab",
  viewMode: "daf-study:view-mode",
};
const SS_KEYS = {
  active: "daf-study:active-initials",
};

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- local profiles (no OAuth — just email + initials, this device only) ----------
export function listProfiles() {
  return readLS(LS_KEYS.profiles, []);
}

export function createProfile(email, initials) {
  const clean = initials.trim().toUpperCase().slice(0, 4);
  if (!clean) return { ok: false, error: "Initials can't be empty." };
  const all = listProfiles();
  if (all.some((p) => p.initials === clean)) {
    return { ok: false, error: `"${clean}" is already taken on this device — try adding a letter.` };
  }
  const profile = { email: email.trim(), initials: clean, createdAt: Date.now() };
  all.push(profile);
  writeLS(LS_KEYS.profiles, all);
  return { ok: true, profile };
}

export function getActiveProfile() {
  const initials = sessionStorage.getItem(SS_KEYS.active);
  if (!initials) return null;
  return listProfiles().find((p) => p.initials === initials) || null;
}

export function setActiveProfile(initials) {
  sessionStorage.setItem(SS_KEYS.active, initials);
}

export function signOut() {
  sessionStorage.removeItem(SS_KEYS.active);
}

function activeInitialsOrGuest() {
  return getActiveProfile()?.initials || "GUEST";
}

// ---------- Firebase (optional, off until configured) ----------
let firebaseReady = null;
async function getFirebase() {
  if (firebaseReady !== null) return firebaseReady;
  try {
    const cfg = await import("./firebase-config.js");
    if (!cfg.FIREBASE_CONFIG || !cfg.FIREBASE_CONFIG.enabled) {
      firebaseReady = false;
      return false;
    }
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const { getFirestore, collection, addDoc, getDocs, query, orderBy } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );
    const app = initializeApp(cfg.FIREBASE_CONFIG);
    const db = getFirestore(app);
    firebaseReady = { db, collection, addDoc, getDocs, query, orderBy };
    return firebaseReady;
  } catch (err) {
    console.warn("Firebase not available, staying local-only:", err);
    firebaseReady = false;
    return false;
  }
}

// ---------- quiz scores (also used for completed Aramaic drill sessions) ----------
export async function saveScore(entry) {
  // entry: { quizId, daf, title, correct, revealed, skipped, total }
  const record = { ...entry, profile: activeInitialsOrGuest(), ts: Date.now() };
  const all = readLS(LS_KEYS.scores, []);
  all.push(record);
  writeLS(LS_KEYS.scores, all);

  const fb = await getFirebase();
  if (fb) {
    try {
      await fb.addDoc(fb.collection(fb.db, "scores"), record);
    } catch (err) {
      console.warn("Could not sync score to Firebase, kept locally:", err);
    }
  }
  return record;
}

export async function getScores() {
  const fb = await getFirebase();
  if (fb) {
    try {
      const q = fb.query(fb.collection(fb.db, "scores"), fb.orderBy("ts", "desc"));
      const snap = await fb.getDocs(q);
      return snap.docs.map((d) => d.data());
    } catch (err) {
      console.warn("Could not read Firebase scores, showing local only:", err);
    }
  }
  return readLS(LS_KEYS.scores, []).slice().reverse();
}

export function getLocalScores() {
  return readLS(LS_KEYS.scores, []).slice().reverse();
}

export function bestScoreFor(quizId) {
  const mine = readLS(LS_KEYS.scores, []).filter(
    (s) => s.quizId === quizId && s.profile === activeInitialsOrGuest()
  );
  if (!mine.length) return null;
  return mine.reduce((best, s) => (s.correct / s.total > best.correct / best.total ? s : best));
}

// ---------- aramaic vocab mastery (scoped per profile, so shared devices don't mix stats) ----------
function vocabStoreKey() {
  return `${LS_KEYS.vocab}:${activeInitialsOrGuest()}`;
}
export function getVocabProgress() {
  return readLS(vocabStoreKey(), {});
}
export function recordVocabAttempt(wordId, wasCorrect) {
  const all = getVocabProgress();
  const cur = all[wordId] || { seen: 0, correct: 0, streak: 0, bestStreak: 0 };
  cur.seen += 1;
  cur.correct += wasCorrect ? 1 : 0;
  cur.streak = wasCorrect ? cur.streak + 1 : 0;
  cur.bestStreak = Math.max(cur.bestStreak || 0, cur.streak);
  all[wordId] = cur;
  writeLS(vocabStoreKey(), all);
  return cur;
}

// ---------- daf page view mode (Simple / Complicated) ----------
export function getViewMode() {
  return readLS(LS_KEYS.viewMode, "simple");
}
export function setViewMode(mode) {
  writeLS(LS_KEYS.viewMode, mode);
}
