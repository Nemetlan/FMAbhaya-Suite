/**
 * fmAbhayaEngine.js — Sinhala Unicode <-> FMAbhaya (legacy ASCII font) converter.
 *
 * Design:
 *  - One ordered table of [unicode, fmAbhaya] pairs is the single source of truth.
 *  - Specials (from the original spec) + generated cluster/kombuva composites + base glyphs.
 *  - Forward AND reverse run as a single pass, longest-match-first (descending key length),
 *    so no chained replacements and no greedy/substring problems.
 *  - Kombuva reordering is baked into the composites ("කෙ" <-> "fl", "ක්‍රෝ" <-> "fl%da").
 *  - `rules` (regex form) is exported for compatibility / inspection.
 *
 * Changes in this version (pa-pilla / diga pa-pilla fix):
 *  - CONSONANTS: ඟ -> "Õ", ඣ -> "CO", ඳ -> "|" (match the reference dictionary)
 *  - HEAD: dedicated glyphs for රු/රූ, කු/කූ, ගු/ගූ, තු/තූ, ශු/ශූ, භු/භූ,
 *          දු/දූ, ලු/ලූ, ළු, ඳු/ඳූ, ඟු/ඟූ, ඤු and රැ/රෑ
 *  - CLUSTER: vowel sign now follows the modifier (ක්‍රු -> "l%q", not "lq%")
 */

const ZWJ = "\u200D";
const HAL = "\u0DCA";
const Y = HAL + ZWJ;            // "්‍"  (rakaransaya / yansaya joiner)
const MARK = "\uE000";          // private-use marker for repaya "ර්‍"

// ---------------------------------------------------------------- base tables
export const CONSONANTS = {
  "ක": "l", "ඛ": "L", "ග": ".", "ඝ": ">", "ඞ": "X", "ඟ": "Õ",
  "ච": "p", "ඡ": "P", "ජ": "c", "ඣ": "CO", "ඤ": "[", "ඥ": "{",
  "ට": "g", "ඨ": "G", "ඩ": "v", "ඪ": "V", "ණ": "K", "ඬ": "~",
  "ත": ";", "ථ": ":", "ද": "o", "ධ": "O", "න": "k", "ඳ": "|",
  "ප": "m", "ඵ": "M", "බ": "n", "භ": "N", "ම": "u", "ඹ": "U",
  "ය": "h", "ර": "r", "ල": ",", "ව": "j", "ශ": "Y", "ෂ": "I",
  "ස": "i", "හ": "y", "ළ": "<", "ෆ": "*",
};
const BASES = { [`ක${Y}ෂ`]: "Ì", ...CONSONANTS };   // clusterable bases
const MODS = { "ර": "%", "ය": "H" };                  // rakaransaya / yansaya
const SIMPLE = { "ා": "d", "ැ": "e", "ෑ": "E", "ි": "s", "ී": "S", "ු": "q", "ූ": "Q", "ෘ": "D", "ෲ": "DD" };
const KOMBUVA = [                                      // [sign, (base, modifier) => FM]
  ["ෛ", (b, m) => "ff" + b + m],
  ["ෞ", (b, m) => "f" + b + m + "!"],
  ["ෝ", (b, m) => "f" + b + m + "da"],
  ["ො", (b, m) => "f" + b + m + "d"],
  ["ේ", (b, m) => "f" + b + "a" + m],
  ["ෙ", (b, m) => "f" + b + m],
];
const INDEPENDENT = [
  ["ඌ", "W!"], ["උ", "W"], ["අ", "w"], ["ආ", "wd"], ["ඇ", "we"], ["ඈ", "wE"],
  ["ඉ", "b"], ["ඊ", "B"], ["එ", "t"], ["ඒ", "ta"], ["ඓ", "ft"],
  ["ඔ", "T"], ["ඕ", "´"], ["ඖ", "T!"],
  ["ඍ", "R"], ["ඏ", "Ì"], ["ඐ", "Ï"],
];


// consonant + hal (්) single glyphs, and consonant + ි / ී single glyphs
const HALF = {
  "ඛ": "Ä", "ච": "É", "ජ": "Ê", "ඞ": "Ù", "ට": "Ü", "ඩ": "â", "ඬ": "å",
  "ධ": "è", "බ": "í", "ම": "ï", "ඹ": "ò", "ව": "õ", "ඡ": "þ", "ර": "¾",
};
const IVOWEL = {                                       // base: [ි glyph, ී glyph]
  "ඳ": ["¢", "£"], "ද": ["È", "§"], "ඨ": ["À", "Á"], "ඡ": ["ý", "Â"],
  "ඛ": ["Å", "Ç"], "ර": ["ß", "Í"], "ඪ": ["Î", "Ð"], "ච": ["Ñ", "Ö"],
  "ථ": ["Ó", "Ò"], "ජ": ["ð", "Ô"], "ඵ": ["Ý", "Ú"], "ට": ["á", "à"],
  "ඩ": ["ä", "ã"], "ඬ": ["ç", "é"], "ධ": ["ê", "ë"], "බ": ["ì", "î"],
  "ම": ["ñ", "ó"], "ඹ": ["ô", "ö"], "ව": ["ú", "ù"], "ණ": ["‚", "Œ"],
};
const HALF_PAIRS = Object.entries(HALF).map(([c, g]) => [c + HAL, g]);
const IV_PAIRS = Object.entries(IVOWEL).flatMap(([c, [i, ii]]) => [[c + "ි", i], [c + "ී", ii]]);

// ---------------------------------------------------------------- A. specials (from spec)
const HEAD = [
  ["ඤූ", "ü"], ["ඣි", "¯"],
  // pa-pilla / diga pa-pilla special glyphs
  ["රු", "re"], ["රූ", "rE"],
  ["රැ", "/"], ["රෑ", "?"],
  ["කු", "l="], ["ගු", ".="], ["තු", ";="], ["ශු", "Y="], ["භු", "N="],
  ["කූ", "l+"], ["ගූ", ".+"], ["තූ", ";+"], ["ශූ", "Y+"], ["භූ", "N+"],
  ["දු", "ÿ"], ["දූ", "¥"], ["ලු", "¨"], ["ලූ", "Æ"],
  ["ඳු", "÷"], ["ඳූ", "ª"], ["ඟු", "Õ="], ["ඟූ", "Õ+"], ["ඤු", "û"],
  ["ළු", "¿"],
  ...IV_PAIRS, ...HALF_PAIRS,
  // Latin characters relocated so they don't collide with glyph codes
  ["!", "æ"], ["*", "³"], ["x", "·"], ["º", "Ÿ"], ["X", "º"], ["i", "µ"], ["I", "¸"],
  ["v", "¶"], ["V", "¹"], ["•", "²"],
  [`ර${Y}ය`, "©"],
  // punctuation
  [",", '"'], ["'", "z"], ["(", "^"], [")", "&"], ["%", "]"], ["/", "$"], ["–", "-"],
  ["?", "@"], ["=", "}"], [".", "'"], ["+", "¬"], [":", "("], ["÷", "\u00AD"], [";", "¦"],
  // irregular rakaransaya ligatures
  [`බ${Y}රි`, "ì%"], [`බ${Y}රේ`, "fí%"], [`ඩ${Y}රේ`, "fâ%"],
  [`ධ${Y}රේ`, "fè%"], [`ශ${Y}රේ`, "fY%a"],
];

// ---------------------------------------------------------------- B. generated composites
const CLUSTER = [];   // base + (්‍ර|්‍ය) [+ vowel]
const KOMB = [];      // base + kombuva-family vowel
for (const [base, fm] of Object.entries(BASES)) {
  for (const [mu, mfm] of Object.entries(MODS)) {
    const dra = base === "ද" && mu === "ර";           // ද්‍ර => single glyph "ø"
    const b = dra ? "ø" : fm, m = dra ? "" : mfm, seq = base + Y + mu;
    for (const [v, build] of KOMBUVA) CLUSTER.push([seq + v, build(b, m)]);
    for (const [v, f] of Object.entries(SIMPLE)) CLUSTER.push([seq + v, b + m + f]);   // base + modifier + vowel
    CLUSTER.push([seq, b + m]);
  }
  for (const [v, build] of KOMBUVA) {
    if (v === "ේ" && HALF[base]) KOMB.push([base + v, "f" + HALF[base]]);   // මේ -> "fï"
    else KOMB.push([base + v, build(fm, "")]);
  }
}

// ---------------------------------------------------------------- C. base glyphs
const BASE = [
  [`ක${Y}ෂ`, "Ì"],
  ...Object.entries(CONSONANTS),
  ...INDEPENDENT,
  [Y + "ය", "H"], [Y + "ර", "%"],
  ...Object.entries(SIMPLE),
  ["්", "a"], ["ං", "x"], ["ඃ", "#"],
  ["ෛ", "ff"], ["ෞ", "f!"], ["ෝ", "fda"], ["ො", "fd"], ["ේ", "fa"], ["ෙ", "f"],
];

/** Ordered [unicode, fm] pairs — the single source of truth. */
export const PAIRS = [...HEAD, ...CLUSTER, ...KOMB, ...BASE];

// ---------------------------------------------------------------- regex-form rules (informational)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
const CONS_CLASS = "[\u0D9A-\u0DC6]";
const CLUSTER_RE = `(?:ක${Y}ෂ|${CONS_CLASS})(?:${Y}[රය])?[\u0DCA-\u0DDF]*`;
const repayaRule = { p: new RegExp(`ර${Y}(${CLUSTER_RE})`, "g"), r: (_, g) => g + MARK };

export const rules = [
  ...HEAD.map(([u, f]) => ({ p: new RegExp(esc(u), "g"), r: f })),
  repayaRule,
  ...[...CLUSTER, ...KOMB, ...BASE].map(([u, f]) => ({ p: new RegExp(esc(u), "g"), r: f })),
  { p: /[\u200B-\u200D]/g, r: "" },
  { p: new RegExp(MARK, "g"), r: "R" },
];

// ---------------------------------------------------------------- engine
function buildMap(pairs, from, to) {
  const map = new Map();
  let maxLen = 0;
  for (const pair of pairs) {
    const k = pair[from];
    if (!map.has(k)) map.set(k, pair[to]);          // first definition wins
    if (k.length > maxLen) maxLen = k.length;
  }
  return { map, maxLen };
}
const FWD = buildMap([...PAIRS, [MARK, "R"]], 0, 1);
// reverse table: key = FM string, value = Unicode (repaya marker handled separately)
const REV2 = buildMap([["R", MARK], ...PAIRS.map(([u, f]) => [f, u])], 0, 1);   // "R" = repaya marker wins over ඍ

/** Single pass, longest key first (descending length). */
export function longestMatch(text, { map, maxLen }) {
  let out = "", i = 0;
  while (i < text.length) {
    let hit = false;
    for (let n = Math.min(maxLen, text.length - i); n > 0; n--) {
      const v = map.get(text.substr(i, n));
      if (v !== undefined) { out += v; i += n; hit = true; break; }
    }
    if (!hit) out += text[i++];
  }
  return out;
}

const REPAYA_REV = new RegExp(`(${CLUSTER_RE})${MARK}`, "g");

/** Sinhala Unicode -> FMAbhaya */
export function unicodeToFMAbhaya(text) {
  if (!text) return "";
  let s = text.normalize("NFC").replace(repayaRule.p, repayaRule.r);
  s = longestMatch(s, FWD);
  return s.replace(/[\u200B-\u200D]/g, "");
}

/** FMAbhaya -> Sinhala Unicode */
export function fmAbhayaToUnicode(text) {
  if (!text) return "";
  let s = longestMatch(text, REV2);
  s = s.replace(REPAYA_REV, (_, g) => `ර${Y}${g}`);
  return s.normalize("NFC");
}