// Seeded procedural sakura branch entering from the right edge. Outputs themed SVG markup.
import { writeFileSync } from 'fs';
let s = +process.argv[2] || 7;
const rnd = () => { s |= 0; s = s + 0x6d2b79f5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const r = (a, b) => a + rnd() * (b - a);
const W = 400, H = 560, f = (n) => +n.toFixed(1);
const wood = [], grain = [], stems = [], flowers = [], buds = [];
function limb(x, y, a, len, w, depth) {
  const bend = r(-0.3, 0.3);
  const mx = x + Math.cos(a + bend) * len * 0.5, my = y + Math.sin(a + bend) * len * 0.5;
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  const d = `M${f(x)} ${f(y)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
  wood.push([w, d]);
  if (w > 5) { // bark: a thin offset line along thick wood
    const o = w * 0.22, nx = -Math.sin(a) * o, ny = Math.cos(a) * o;
    grain.push(`M${f(x + nx)} ${f(y + ny)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex + nx * 0.6)} ${f(ey + ny * 0.6)}`);
  }
  const w2 = w * 0.66;
  if (depth <= 0 || w2 < 1) { bloom(ex, ey, a, 1); return; }
  const kids = depth > 4 ? 2 : rnd() < 0.5 ? 3 : 2;
  for (let i = 0; i < kids; i++) {
    let na = a + (i === 0 ? r(-0.22, 0.18) : r(0.4, 0.95) * (rnd() < 0.5 ? -1 : 1));
    if (ey > H * 0.78) na -= 0.45;
    if (Math.cos(na) > 0.5) na += 0.6;
    const t = i === 0 ? 1 : r(0.4, 0.8);
    limb(x + (ex - x) * t, y + (ey - y) * t, na, len * r(0.62, 0.8), i === 0 ? w2 : w2 * 0.72, depth - 1);
  }
  if (depth <= 3 && rnd() < 0.6) { const t = r(0.3, 0.8); bloom(x + (ex - x) * t, y + (ey - y) * t, a + r(-1.6, 1.6), 0.7); }
}
function bloom(x, y, a, size) {
  const k = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < k; i++) {
    const d = r(5, 14), ang = a + r(-1.5, 1.5);
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d;
    stems.push(`M${f(x)} ${f(y)}L${f(px)} ${f(py)}`);
    if (rnd() < 0.25) buds.push(`<ellipse cx="${f(px)}" cy="${f(py)}" rx="1.7" ry="2.8" transform="rotate(${f(ang * 57.3 + 90)} ${f(px)} ${f(py)})"/>`);
    else flowers.push(`<use href="#fl" transform="translate(${f(px)} ${f(py)}) rotate(${f(r(0, 72))}) scale(${f(r(0.6, 1) * size)})"/>`);
  }
}
limb(W + 30, H * 0.6, Math.PI + 0.4, 140, 22, 7);
const petal = 'M0 0C-3.2-2.4-5.2-7-3-10.6L0-9.2L3-10.6C5.2-7 3.2-2.4 0 0Z';
const stamen = [0, 72, 144, 216, 288].map((d) => `<path d="M0 0L0-4.2" transform="rotate(${d + 36})"/><circle cy="-4.6" r=".55" transform="rotate(${d + 36})"/>`).join('');
const byW = {};
for (const [w, d] of wood) (byW[f(Math.max(w, 0.8))] ??= []).push(d);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="sakura-tree" aria-hidden="true">
<defs><g id="fl"><g class="st-petals">${[0, 72, 144, 216, 288].map((d) => `<path d="${petal}" transform="rotate(${d})"/>`).join('')}</g><g class="st-stamen">${stamen}</g></g></defs>
<g class="st-wood" fill="none" stroke-linecap="round">${Object.entries(byW).map(([w, ds]) => `<path stroke-width="${w}" d="${ds.join('')}"/>`).join('')}</g>
<path class="st-grain" fill="none" d="${grain.join('')}"/>
<path class="st-stem" fill="none" d="${stems.join('')}"/>
<g class="st-bud">${buds.join('')}</g>
<g class="st-fl">${flowers.join('')}</g>
</svg>`;
writeFileSync(process.argv[3], svg);
console.log(svg.length, 'bytes', wood.length, 'limbs', flowers.length, 'flowers', buds.length, 'buds');
