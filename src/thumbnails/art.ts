import type { ArtPalette } from "./theme";

export const MOTIFS = [
  "gauge",
  "house",
  "houseCheck",
  "heart",
  "hospital",
  "envelope",
  "calculator",
  "calendar",
  "coins",
  "receipt",
  "briefcase",
  "ledger",
  "shield",
  "bank",
  "split",
  "clipboard",
  "clock",
] as const;

export type Motif = (typeof MOTIFS)[number];

const BY_POST: Record<string, Motif> = {
  "pension-early-defer": "gauge",
  "severance-tax": "envelope",
  "health-dependent": "hospital",
  "health-premium": "calculator",
  "health-insurance-adjustment": "calendar",
  "health-voluntary": "heart",
  "housing-monthly": "house",
  "housing-qualify": "houseCheck",
  "irp-pension": "bank",
  "nps-catchup": "calendar",
  "nps-refund": "coins",
  "nps-split": "split",
  "nps-start-age": "ledger",
  "pension-savings-credit": "calculator",
  "pension-savings-december-31": "calendar",
  "retire-checklist": "clipboard",
  "retire-month": "calendar",
  "retire-next-day": "clock",
  "basic-pension-amount": "coins",
  "basic-pension-apply": "calendar",
  "basic-pension-qualify": "shield",
  "unemployment-benefit": "briefcase",
};

const BY_CATEGORY: Record<string, Motif> = {
  pension: "ledger",
  severance: "envelope",
  health: "heart",
  basic: "coins",
  housing: "house",
  tax: "receipt",
  assets: "coins",
  prepare: "calendar",
  job: "briefcase",
  business: "briefcase",
};

export function motifFor(id: string, category: string): Motif {
  return BY_POST[id] ?? BY_CATEGORY[category] ?? "ledger";
}

function wrap(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 640 640" fill="none">${body}</svg>`;
}

function coinBadge(p: ArtPalette, cx = 478, cy = 470, r = 112): string {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.deep}" stroke="${p.stroke}" stroke-width="14"/>
    <circle cx="${cx}" cy="${cy}" r="${Math.round(r * 0.62)}" fill="${p.paper}"/>
    <path d="M${cx} ${cy - r * 0.28} L${cx + r * 0.26} ${cy} L${cx} ${cy + r * 0.28} L${cx - r * 0.26} ${cy} Z" fill="none" stroke="${p.accent}" stroke-width="12" stroke-linejoin="round"/>
  `;
}

function checkBadge(p: ArtPalette, cx = 478, cy = 470, r = 108): string {
  const arm = Math.round(r * 0.34);
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.accent}" stroke="${p.stroke}" stroke-width="14"/>
    <path d="M${cx - arm} ${cy} L${cx - arm * 0.25} ${cy + arm * 0.7} L${cx + arm} ${cy - arm * 0.65}" fill="none" stroke="${p.deep}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function gauge(p: ArtPalette): string {
  return wrap(`
    <rect x="36" y="78" width="390" height="300" rx="40" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <rect x="78" y="122" width="306" height="168" rx="22" fill="${p.deep}"/>
    <path d="M230 158 L286 214 L230 270 L174 214 Z" fill="none" stroke="${p.stroke}" stroke-width="14" stroke-linejoin="round"/>
    <circle cx="430" cy="412" r="168" fill="${p.deep}" stroke="${p.stroke}" stroke-width="16"/>
    <path d="M292 470 A150 150 0 1 1 548 330" fill="none" stroke="${p.paper}" stroke-width="22" stroke-linecap="round"/>
    <path d="M430 412 L548 318" stroke="${p.accent}" stroke-width="20" stroke-linecap="round"/>
    <circle cx="430" cy="412" r="20" fill="${p.accent}"/>
  `);
}

function house(p: ArtPalette, withCheck: boolean): string {
  return wrap(`
    <path d="M320 64 L600 276 H528 V548 H112 V276 H40 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16" stroke-linejoin="round"/>
    <rect x="268" y="372" width="104" height="176" rx="12" fill="${p.paper}"/>
    <circle cx="196" cy="372" r="40" fill="${p.paper}"/>
    ${withCheck ? checkBadge(p) : coinBadge(p)}
  `);
}

function heart(p: ArtPalette): string {
  return wrap(`
    <path d="M320 548 C320 548 78 372 78 230 C78 132 156 78 236 118 C286 146 312 186 320 210 C328 186 354 146 404 118 C484 78 562 132 562 230 C562 372 320 548 320 548 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16" stroke-linejoin="round"/>
    ${checkBadge(p, 470, 470, 96)}
  `);
}

function hospital(p: ArtPalette): string {
  return wrap(`
    <rect x="118" y="96" width="360" height="420" rx="36" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <rect x="258" y="176" width="80" height="250" rx="16" fill="${p.paper}"/>
    <rect x="178" y="256" width="240" height="80" rx="16" fill="${p.paper}"/>
    ${coinBadge(p, 490, 470, 100)}
  `);
}

function envelope(p: ArtPalette): string {
  return wrap(`
    <rect x="48" y="168" width="500" height="320" rx="32" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <path d="M68 196 L298 372 L528 196" fill="${p.deep}" stroke="${p.stroke}" stroke-width="16" stroke-linejoin="round"/>
    <path d="M48 188 L298 340 L548 188" fill="none" stroke="${p.paper}" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>
    ${coinBadge(p)}
  `);
}

function calculator(p: ArtPalette): string {
  const button = (x: number, y: number, fill: string) =>
    `<rect x="${x}" y="${y}" width="150" height="108" rx="22" fill="${fill}"/>`;
  return wrap(`
    <rect x="124" y="36" width="392" height="548" rx="44" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <rect x="164" y="80" width="312" height="118" rx="18" fill="${p.paper}"/>
    ${button(164, 236, p.deep)}
    ${button(336, 236, p.deep)}
    ${button(164, 364, p.deep)}
    ${button(336, 364, p.accent)}
    <rect x="196" y="118" width="120" height="22" rx="11" fill="${p.fill}"/>
  `);
}

function calendar(p: ArtPalette): string {
  return wrap(`
    <rect x="96" y="108" width="420" height="460" rx="40" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <path d="M96 188 H516 V168 A40 40 0 0 0 476 108 H136 A40 40 0 0 0 96 148 Z" fill="${p.accent}"/>
    <rect x="188" y="68" width="28" height="84" rx="14" fill="${p.stroke}"/>
    <rect x="396" y="68" width="28" height="84" rx="14" fill="${p.stroke}"/>
    <rect x="140" y="240" width="150" height="120" rx="20" fill="${p.paper}"/>
    <rect x="322" y="240" width="150" height="120" rx="20" fill="${p.paper}"/>
    <rect x="140" y="392" width="150" height="120" rx="20" fill="${p.deep}"/>
    <rect x="322" y="392" width="150" height="120" rx="20" fill="${p.paper}"/>
  `);
}

function coins(p: ArtPalette): string {
  const disc = (cy: number, fill: string) => `
    <path d="M140 ${cy} L140 ${cy + 78} A180 62 0 0 0 500 ${cy + 78} L500 ${cy} A180 62 0 0 1 140 ${cy} Z" fill="${fill}"/>
    <path d="M140 ${cy} L140 ${cy + 78}" stroke="${p.stroke}" stroke-width="14" stroke-linecap="round"/>
    <path d="M500 ${cy} L500 ${cy + 78}" stroke="${p.stroke}" stroke-width="14" stroke-linecap="round"/>
    <ellipse cx="320" cy="${cy + 78}" rx="180" ry="62" fill="none" stroke="${p.stroke}" stroke-width="14"/>
    <ellipse cx="320" cy="${cy}" rx="180" ry="62" fill="${fill}" stroke="${p.stroke}" stroke-width="14"/>
  `;
  return wrap(`
    ${disc(360, p.deep)}
    ${disc(250, p.fill)}
    ${disc(140, p.paper)}
    <path d="M320 168 L368 216 L320 264 L272 216 Z" fill="none" stroke="${p.accent}" stroke-width="12" stroke-linejoin="round"/>
  `);
}

function receipt(p: ArtPalette): string {
  return wrap(`
    <path d="M150 48 H490 V520 L450 484 L410 520 L370 484 L330 520 L290 484 L250 520 L210 484 L170 520 L150 500 Z" fill="${p.paper}" stroke="${p.stroke}" stroke-width="14" stroke-linejoin="round"/>
    <rect x="210" y="130" width="220" height="28" rx="14" fill="${p.fill}"/>
    <rect x="210" y="196" width="170" height="28" rx="14" fill="${p.deep}"/>
    <rect x="210" y="262" width="220" height="28" rx="14" fill="${p.fill}"/>
    <rect x="210" y="328" width="120" height="28" rx="14" fill="${p.accent}"/>
    <circle cx="430" cy="400" r="48" fill="none" stroke="${p.accent}" stroke-width="12"/>
  `);
}

function briefcase(p: ArtPalette): string {
  return wrap(`
    <rect x="230" y="78" width="180" height="56" rx="18" fill="none" stroke="${p.stroke}" stroke-width="16"/>
    <rect x="70" y="150" width="500" height="360" rx="40" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <rect x="70" y="286" width="500" height="36" fill="${p.deep}"/>
    <rect x="270" y="258" width="100" height="92" rx="16" fill="${p.accent}" stroke="${p.stroke}" stroke-width="12"/>
  `);
}

function ledger(p: ArtPalette): string {
  return wrap(`
    <rect x="128" y="72" width="384" height="490" rx="28" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <rect x="128" y="72" width="48" height="490" rx="16" fill="${p.deep}"/>
    <path d="M392 72 H430 V210 L411 186 L392 210 Z" fill="${p.accent}"/>
    <path d="M360 230 L430 300 L360 370 L290 300 Z" fill="none" stroke="${p.paper}" stroke-width="14" stroke-linejoin="round"/>
    ${coinBadge(p, 470, 500, 96)}
  `);
}

function shield(p: ArtPalette): string {
  return wrap(`
    <path d="M320 56 L540 150 V320 C540 450 320 572 320 572 C320 572 100 450 100 320 V150 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16" stroke-linejoin="round"/>
    <path d="M220 318 L292 396 L440 230" fill="none" stroke="${p.paper}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  `);
}

function bank(p: ArtPalette): string {
  return wrap(`
    <path d="M48 230 L320 64 L592 230 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16" stroke-linejoin="round"/>
    <path d="M320 118 L362 160 L320 202 L278 160 Z" fill="none" stroke="${p.paper}" stroke-width="12" stroke-linejoin="round"/>
    <rect x="108" y="248" width="78" height="230" rx="10" fill="${p.paper}" stroke="${p.stroke}" stroke-width="12"/>
    <rect x="281" y="248" width="78" height="230" rx="10" fill="${p.paper}" stroke="${p.stroke}" stroke-width="12"/>
    <rect x="454" y="248" width="78" height="230" rx="10" fill="${p.paper}" stroke="${p.stroke}" stroke-width="12"/>
    <rect x="56" y="478" width="528" height="64" rx="14" fill="${p.deep}" stroke="${p.stroke}" stroke-width="14"/>
  `);
}

function split(p: ArtPalette): string {
  return wrap(`
    <circle cx="230" cy="320" r="176" fill="${p.paper}" stroke="${p.stroke}" stroke-width="16"/>
    <circle cx="410" cy="320" r="176" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <path d="M314 196 L348 444" stroke="${p.accent}" stroke-width="26" stroke-linecap="round"/>
  `);
}

function clipboard(p: ArtPalette): string {
  return wrap(`
    <rect x="220" y="48" width="200" height="64" rx="18" fill="${p.deep}" stroke="${p.stroke}" stroke-width="12"/>
    <rect x="108" y="96" width="424" height="480" rx="32" fill="${p.paper}" stroke="${p.stroke}" stroke-width="16"/>
    <circle cx="210" cy="250" r="40" fill="${p.accent}"/>
    <path d="M188 250 L204 272 L238 228" fill="none" stroke="${p.deep}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="274" y="228" width="190" height="40" rx="14" fill="${p.fill}"/>
    <circle cx="210" cy="380" r="40" fill="${p.deep}"/>
    <path d="M188 380 L204 402 L238 358" fill="none" stroke="${p.paper}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="274" y="358" width="150" height="40" rx="14" fill="${p.deep}"/>
  `);
}

function clock(p: ArtPalette): string {
  return wrap(`
    <circle cx="320" cy="320" r="230" fill="${p.fill}" stroke="${p.stroke}" stroke-width="16"/>
    <circle cx="320" cy="320" r="186" fill="${p.deep}"/>
    <path d="M320 168 V214 M320 426 V472 M168 320 H214 M426 320 H472" stroke="${p.paper}" stroke-width="16" stroke-linecap="round"/>
    <path d="M320 320 V214" stroke="${p.paper}" stroke-width="18" stroke-linecap="round"/>
    <path d="M320 320 L438 366" stroke="${p.accent}" stroke-width="18" stroke-linecap="round"/>
    <circle cx="320" cy="320" r="18" fill="${p.accent}"/>
  `);
}

export function illustrationSvg(motif: Motif, palette: ArtPalette): string {
  switch (motif) {
    case "gauge":
      return gauge(palette);
    case "house":
      return house(palette, false);
    case "houseCheck":
      return house(palette, true);
    case "heart":
      return heart(palette);
    case "hospital":
      return hospital(palette);
    case "envelope":
      return envelope(palette);
    case "calculator":
      return calculator(palette);
    case "calendar":
      return calendar(palette);
    case "coins":
      return coins(palette);
    case "receipt":
      return receipt(palette);
    case "briefcase":
      return briefcase(palette);
    case "ledger":
      return ledger(palette);
    case "shield":
      return shield(palette);
    case "bank":
      return bank(palette);
    case "split":
      return split(palette);
    case "clipboard":
      return clipboard(palette);
    case "clock":
      return clock(palette);
  }
}
