import "./style.css";
import { unicodeToFMAbhaya, fmAbhayaToUnicode } from "./fmAbhayaEngine.js";

const $ = (id) => document.getElementById(id);
const src = $("src"), out = $("out");
const SAMPLE = "ශ්‍රී ලංකා ප්‍රජාතාන්ත්‍රික සමාජවාදී ජනරජය.";

let toFM = true;

const fmt = (n) => `${n.toLocaleString()} character${n === 1 ? "" : "s"}`;

function convert() {
  out.value = (toFM ? unicodeToFMAbhaya : fmAbhayaToUnicode)(src.value);
  $("src-stats").textContent = fmt(src.value.length);
  $("out-stats").textContent = fmt(out.value.length);
}

function setMode(next, { swapText = false } = {}) {
  const carry = out.value;
  toFM = next;
  $("mode-uni").setAttribute("aria-pressed", String(toFM));
  $("mode-fm").setAttribute("aria-pressed", String(!toFM));
  $("src-title").textContent = toFM ? "Unicode input" : "FMAbhaya input";
  $("out-title").textContent = toFM ? "FMAbhaya output" : "Unicode output";
  out.classList.toggle("pane__text--out", toFM);
  src.classList.toggle("pane__text--out", !toFM);
  if (swapText) src.value = carry;
  convert();
}

// Real-time conversion (synchronous; the engine is a single pass, so no debounce needed)
src.addEventListener("input", convert);

$("mode-uni").addEventListener("click", () => toFM || setMode(true, { swapText: true }));
$("mode-fm").addEventListener("click", () => toFM && setMode(false, { swapText: true }));
$("swap-btn").addEventListener("click", () => setMode(!toFM, { swapText: true }));
addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setMode(!toFM, { swapText: true }); }
});

$("clear-btn").addEventListener("click", () => { src.value = ""; convert(); src.focus(); });

$("paste-btn").addEventListener("click", async () => {
  try { src.value = await navigator.clipboard.readText(); convert(); }
  catch { src.focus(); }   // clipboard permission denied: let the user paste manually
});

let copyTimer;
$("copy-btn").addEventListener("click", async () => {
  if (!out.value) return;
  const btn = $("copy-btn"), label = $("copy-label");
  try { await navigator.clipboard.writeText(out.value); label.textContent = "Copied ✓"; }
  catch { out.select(); document.execCommand?.("copy"); label.textContent = "Copied ✓"; }
  btn.classList.add("is-done");
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { label.textContent = "Copy"; btn.classList.remove("is-done"); }, 1600);
});

// Theme: light/dark, persisted
$("theme-btn").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

src.value = SAMPLE;
convert();
