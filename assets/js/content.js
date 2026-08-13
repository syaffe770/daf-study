// Small fetch helpers for the JSON content that drives every page.
// Paths are relative to the site root so pages in / all resolve the same way.

export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export async function loadManifest() {
  return loadJSON("content/manifest.json");
}

export async function loadDaf(id) {
  return loadJSON(`content/daf/${id}.json`);
}

export async function loadQuiz(id) {
  return loadJSON(`content/quiz/${id}.json`);
}

export async function loadVocabSet(id = "core") {
  return loadJSON(`content/vocab/${id}.json`);
}

export async function loadDrill(id) {
  return loadJSON(`content/drills/${id}.json`);
}

export function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}
