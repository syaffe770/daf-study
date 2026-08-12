// Generic data-driven flow-diagram renderer for the "after you learn it" chart.
// Content JSON supplies an array of nodes; this lays them out top-to-bottom
// so new daf don't need a hand-drawn SVG each time.
//
// Node shapes:
//   { type:"step",   label, sub, tone }                 single centered box
//   { type:"branch", label, left:{label,sub,tone}, right:{label,sub,tone} }  two boxes side by side, labeled split
//   { type:"note",   label, sub }                        dashed box (e.g. open questions / nafka mina)

const W = 700;
const CX = W / 2;
const GAP = 26;

function toneFill(tone) {
  switch (tone) {
    case "accent": return "var(--accent)";
    case "gold": return "var(--gold)";
    case "good": return "var(--good)";
    case "bad": return "var(--bad)";
    default: return "none";
  }
}
function toneStroke(tone) {
  switch (tone) {
    case "accent": return "var(--accent)";
    case "gold": return "var(--gold)";
    case "good": return "var(--good)";
    case "bad": return "var(--bad)";
    default: return "var(--line)";
  }
}

function wrapLines(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function stepBox(node, y) {
  const boxW = 420, boxH = node.sub ? 58 : 42;
  const x = CX - boxW / 2;
  const fill = node.tone ? `fill="${toneFill(node.tone)}" opacity="0.14"` : `fill="var(--surface-2)"`;
  const labelLines = wrapLines(node.label, 46);
  let inner = "";
  labelLines.forEach((line, i) => {
    inner += `<text x="${CX}" y="${y + 20 + i * 15}" text-anchor="middle" font-size="12" font-weight="600">${esc(line)}</text>`;
  });
  let subY = y + 20 + labelLines.length * 15 + 4;
  if (node.sub) {
    inner += `<text x="${CX}" y="${subY}" text-anchor="middle" font-size="10" fill="var(--ink-faint)">${esc(node.sub)}</text>`;
  }
  const height = Math.max(boxH, 20 + labelLines.length * 15 + (node.sub ? 18 : 6));
  return {
    svg: `<rect x="${x}" y="${y}" width="${boxW}" height="${height}" rx="3" ${fill} stroke="${toneStroke(node.tone)}"></rect>${inner}`,
    height,
    cx: CX,
  };
}

function branchBox(node, y) {
  // node.items: array of {label, sub, tone} — any length, laid out evenly across the width.
  const items = node.items || [node.left, node.right].filter(Boolean);
  const n = items.length;
  const gap = 16;
  const boxW = Math.min(300, (W - 40 - gap * (n - 1)) / n);
  const totalW = boxW * n + gap * (n - 1);
  const startX = CX - totalW / 2;
  const wrapChars = n >= 3 ? 22 : 34;
  const subChars = n >= 3 ? 24 : 36;

  function side(item, x) {
    const lines = wrapLines(item.label, wrapChars);
    let inner = `<rect x="${x}" y="${y}" width="${boxW}" height="72" rx="3" fill="none" stroke="${toneStroke(item.tone)}"></rect>`;
    lines.forEach((line, i) => {
      inner += `<text x="${x + boxW / 2}" y="${y + 22 + i * 14}" text-anchor="middle" font-size="11" font-weight="600">${esc(line)}</text>`;
    });
    if (item.sub) {
      const subLines = wrapLines(item.sub, subChars);
      subLines.forEach((line, i) => {
        inner += `<text x="${x + boxW / 2}" y="${y + 22 + lines.length * 14 + 4 + i * 12}" text-anchor="middle" font-size="9.5" fill="var(--ink-faint)">${esc(line)}</text>`;
      });
    }
    return inner;
  }

  let svg = "";
  if (node.label) {
    svg += `<text x="${CX}" y="${y - 6}" text-anchor="middle" font-size="10" fill="var(--gold)" letter-spacing="0.5">${esc(node.label.toUpperCase())}</text>`;
  }
  const centers = [];
  items.forEach((item, i) => {
    const x = startX + i * (boxW + gap);
    svg += side(item, x);
    centers.push(x + boxW / 2);
  });
  svg += `<line x1="${centers[0]}" y1="${y + 36}" x2="${centers[centers.length - 1]}" y2="${y + 36}" stroke="var(--line)"></line>`;
  return { svg, height: 72, cx: CX, splitXs: centers };
}

function noteBox(node, y) {
  const boxW = 460;
  const x = CX - boxW / 2;
  const lines = wrapLines(node.label, 48);
  let inner = `<rect x="${x}" y="${y}" width="${boxW}" height="${34 + lines.length * 15 + (node.sub ? 16 : 0)}" rx="3" fill="none" stroke="var(--line)" stroke-dasharray="4 3"></rect>`;
  lines.forEach((line, i) => {
    inner += `<text x="${CX}" y="${y + 20 + i * 15}" text-anchor="middle" font-size="11" font-weight="600">${esc(line)}</text>`;
  });
  if (node.sub) {
    inner += `<text x="${CX}" y="${y + 20 + lines.length * 15 + 12}" text-anchor="middle" font-size="10" fill="var(--ink-faint)">${esc(node.sub)}</text>`;
  }
  return { svg: inner, height: 34 + lines.length * 15 + (node.sub ? 16 : 0), cx: CX };
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildFlowSVG(nodes, ariaLabel) {
  let y = 16;
  let body = "";
  let prevCx = CX;
  nodes.forEach((node, idx) => {
    if (idx > 0) {
      body += `<line x1="${prevCx}" y1="${y}" x2="${CX}" y2="${y + GAP}" stroke="var(--line)"></line>`;
      y += GAP;
    }
    let block;
    if (node.type === "branch") block = branchBox(node, y);
    else if (node.type === "note") block = noteBox(node, y);
    else block = stepBox(node, y);
    body += block.svg;
    y += block.height;
    prevCx = block.cx;
  });
  const totalH = y + 16;
  const svg = `<svg viewBox="0 0 ${W} ${totalH}" role="img" aria-label="${esc(ariaLabel)}">${body}</svg>`;
  return svg;
}
