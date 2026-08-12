// Score / progress storage. Defaults to localStorage (per-device).
// If assets/js/firebase-config.js sets FIREBASE_CONFIG.enabled = true,
// scores also sync to Firestore so two people can share one score list.
// See README.md "Turning on shared scores" for setup.

const LS_KEYS = {
  whoami: "daf-study:whoami",
  scores: "daf-study:scores",
  vocab: "daf-study:vocab",
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

// ---------- who is using this device right now ----------
export function whoAmI() {
  return readLS(LS_KEYS.whoami, null);
}
export function setWhoAmI(name) {
  writeLS(LS_KEYS.whoami, name);
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

// ---------- quiz scores ----------
export async function saveScore(entry) {
  // entry: { quizId, daf, title, correct, revealed, skipped, total, profile }
  const record = { ...entry, ts: Date.now() };
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
  const mine = readLS(LS_KEYS.scores, []).filter((s) => s.quizId === quizId);
  if (!mine.length) return null;
  return mine.reduce((best, s) => (s.correct / s.total > best.correct / best.total ? s : best));
}

// ---------- aramaic vocab mastery ----------
export function getVocabProgress() {
  return readLS(LS_KEYS.vocab, {});
}
export function recordVocabAttempt(wordId, wasCorrect) {
  const all = readLS(LS_KEYS.vocab, {});
  const cur = all[wordId] || { seen: 0, correct: 0, streak: 0 };
  cur.seen += 1;
  cur.correct += wasCorrect ? 1 : 0;
  cur.streak = wasCorrect ? cur.streak + 1 : 0;
  all[wordId] = cur;
  writeLS(LS_KEYS.vocab, all);
  return cur;
}
