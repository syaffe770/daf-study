// Generic, daf-agnostic study-session phase templates.
// These are instructions about HOW to study — never claims about what the
// text says. All actual Torah content is pulled from the daf's own JSON
// (script/opinions), tagged by type. Nothing here is written per-daf.

function scriptByType(daf, types) {
  return (daf.script || []).filter((t) => types.includes(t.type));
}

// Pairs each "challenge" entry with the resolution/answer that follows it.
function challengeResolutionPairs(daf) {
  const script = daf.script || [];
  const pairs = [];
  script.forEach((t, i) => {
    if (t.type !== "challenge") return;
    const next = script.slice(i + 1).find((n) => n.type === "resolution" || n.type === "answer");
    pairs.push({ challenge: t, resolution: next || null });
  });
  return pairs;
}

function buildRecountPhase(prevDaf) {
  if (!prevDaf) return null;
  return {
    id: "recount",
    title: "Recount",
    method: "60-Second Unscripted Recount",
    blurb: `A quick warm-up recalling ${prevDaf.ref} before starting today's amud.`,
    cards: [
      {
        kind: "recount",
        partnerA: `You have 60 seconds: explain what ${prevDaf.ref} covered, from memory only — no notes.`,
        partnerB: `Listen, then fill in whatever's missing or off.`,
        solo: `You have 60 seconds: say out loud what ${prevDaf.ref} covered, from memory. Then check yourself below.`,
        reveal: prevDaf.subtitle || (prevDaf.before && prevDaf.before[0]) || "",
      },
    ],
  };
}

function buildDecodePhase(daf) {
  const entries = scriptByType(daf, ["source", "opinion", "answer"]);
  if (!entries.length) return null;
  return {
    id: "decode",
    title: "Decode",
    method: "Presenter / Clarifier (TAPPS)",
    blurb: "Partner A explains line by line. Partner B may only ask two questions — never lecture.",
    cards: entries.map((t) => ({
      kind: "decode",
      speaker: t.speaker,
      speakerHe: t.speakerHe,
      quote: t.quote,
      partnerA: `Explain this turn in your own words, out loud, before revealing the text below.`,
      partnerB: `You may only ask: "What does that term mean?" or "Why did you take that step?" No lecturing, no hints.`,
      solo: `State this turn's point out loud from memory. Then reveal it to check yourself.`,
      reveal: t.gloss,
    })),
  };
}

function buildRedTeamPhase(daf) {
  const pairs = challengeResolutionPairs(daf);
  if (!pairs.length) return null;
  return {
    id: "redteam",
    title: "Red-Team",
    method: "Adversarial Red-Teaming / Boundary Stress-Testing (Koshya)",
    blurb: "Before reading the real objection, try to find your own edge case that breaks the opinion just covered.",
    cards: pairs.map(({ challenge, resolution }) => ({
      kind: "redteam",
      partnerA: `Restate the opinion this challenges, in one sentence.`,
      partnerB: `Without reading ahead — what edge case or boundary condition would you throw at it? Push a variable to zero or infinity, or think of a real-world case where it seems to fail.`,
      solo: `Before revealing, come up with your own edge case that might break the opinion you just decoded.`,
      revealLabel: "The actual challenge the Gemara raises",
      reveal: challenge.gloss,
      revealQuote: challenge.quote,
      resolutionLabel: "How it's resolved",
      resolution: resolution ? resolution.gloss : null,
    })),
  };
}

function buildMachloketPhase(daf) {
  const opinions = daf.opinions || [];
  if (opinions.length < 2) return null;
  return {
    id: "machloket",
    title: "Machloket",
    method: "Root Divergence (Machloket B'Mai) + Comparative Matrix",
    blurb: "Don't ask which opinion is \"right.\" Ask what single root assumption separates them.",
    cards: [
      {
        kind: "machloket",
        partnerA: `Together: map every opinion below side by side — who holds what.`,
        partnerB: `Before revealing any \"basis,\" guess out loud: at root, what's the one assumption each side disagrees on?`,
        solo: `Cover the "basis" column below. For each opinion, guess its root reasoning before revealing it.`,
        matrix: opinions.map((o) => ({ who: o.who, claim: o.claim, basis: o.basis })),
      },
    ],
  };
}

function buildBackwardTeachPhase(daf) {
  const pairs = challengeResolutionPairs(daf);
  const opinions = daf.opinions || [];
  if (!pairs.length && opinions.length < 2) return null;
  const anchor = pairs[pairs.length - 1];
  return {
    id: "backward",
    title: "Synthesize",
    method: "Backward Teaching",
    blurb: "Start from the edge case, reason backward to the core premise — the real test of whether it stuck.",
    cards: [
      {
        kind: "backward",
        partnerA: anchor
          ? `Starting from this edge case — not the rule — teach Partner B backward: why does the opinion survive it?`
          : `Teach Partner B the root divergence between the opinions on this amud, starting from the disagreement itself.`,
        partnerB: `Listen for gaps. If the explanation starts from the rule instead of the edge case, send them back to the start.`,
        solo: `Speak or type a 2-minute explanation starting from the edge case below, reasoning backward to why the opinion holds — without looking at the text.`,
        anchorLabel: anchor ? "Start from this" : null,
        anchorText: anchor ? anchor.challenge.gloss : null,
      },
    ],
  };
}

export function buildPhases(daf, prevDaf) {
  const builders = [
    () => buildRecountPhase(prevDaf),
    () => buildDecodePhase(daf),
    () => buildRedTeamPhase(daf),
    () => buildMachloketPhase(daf),
    () => buildBackwardTeachPhase(daf),
  ];
  return builders.map((b) => b()).filter(Boolean);
}
