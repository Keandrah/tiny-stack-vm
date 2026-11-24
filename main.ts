import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p, input) {
  const d = new Int32Array(256), c = new Int32Array(64), m = new Int32Array(256), out = new Uint8Array(65536);
  let sp = 0, cp = 0, pc = 0, ip = 0, len = 0, steps = 0;
  const done = code => ({ out: out.slice(0, len), code });
  const trap = code => done(code);
  for (;;) {
    if (steps === 1000000) return trap(10);
    if (pc < 0 || pc >= p.length) return trap(9);
    const op = p[pc];
    if (!(op <= 7 || op >= 16 && op <= 34 && op !== 31 || op >= 48 && op <= 52 || op === 64 || op === 65 || op >= 80 && op <= 83)) return trap(5);
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
    if (pc + imm >= p.length) return trap(9);
    steps++;
    const next = pc + 1 + imm;
    let pop = 0, push = 0;
    if (op === 3 || op === 49 || op === 50 || op === 80 || op === 81 || op === 83) pop = 1;
    else if (op === 23 || op === 27) { pop = 1; push = 1; }
    else if (op === 4) { pop = 1; push = 2; }
    else if (op === 5) { pop = 2; push = 2; }
    else if (op === 6) { pop = 2; push = 3; }
    else if (op === 7) { pop = 3; push = 3; }
    else if (op >= 16 && op <= 34) { pop = 2; push = 1; }
    else if (op === 48 || op === 51 || op === 64) { pop = op === 64 ? 1 : 0; push = op === 64 ? 1 : 0; }
    else if (op === 65) pop = 2;
    else if (op === 82) push = 1;
    if (sp < pop) return trap(2);
    if (sp - pop + push > 256) return trap(3);
    pc = next;
    if (op === 0) return done(0);
    if (op === 1) { d[sp++] = p[next - 1] << 24 >> 24; continue; }
    if (op === 2) { d[sp++] = p[next - 4] | p[next - 3] << 8 | p[next - 2] << 16 | p[next - 1] << 24; continue; }
    if (op === 3) { sp--; continue; }
    if (op === 4) { d[sp] = d[sp - 1]; sp++; continue; }
    if (op === 5) { const x = d[sp - 1]; d[sp - 1] = d[sp - 2]; d[sp - 2] = x; continue; }
    if (op === 6) { d[sp] = d[sp - 2]; sp++; continue; }
    if (op === 7) { const x = d[sp - 3]; d[sp - 3] = d[sp - 2]; d[sp - 2] = d[sp - 1]; d[sp - 1] = x; continue; }
    if (op >= 16 && op <= 34) {
      const b = d[sp - 1], a = d[sp - 2]; let r;
      switch (op) {
        case 16: r = a + b | 0; break;
        case 17: r = a - b | 0; break;
        case 18: r = Math.imul(a, b); break;
        case 19: if (!b) return trap(4); r = a / b | 0; break;
        case 20: if (!b) return trap(4); r = a % b | 0; break;
        case 21: if (!b) return trap(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
        case 22: if (!b) return trap(4); r = (a >>> 0) % (b >>> 0) | 0; break;
        case 23: d[sp - 1] = -b | 0; continue;
        case 24: r = a & b; break;
        case 25: r = a | b; break;
        case 26: r = a ^ b; break;
        case 27: d[sp - 1] = ~b; continue;
        case 28: r = a << (b & 31); break;
        case 29: r = a >> (b & 31); break;
        case 30: r = a >>> (b & 31) | 0; break;
        case 32: r = a === b ? 1 : 0; break;
        case 33: r = a < b ? 1 : 0; break;
        case 34: r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
      }
      sp -= 2; d[sp++] = r; continue;
    }
    if (op >= 48 && op <= 50) {
      const rel = (p[next - 2] | p[next - 1] << 8) << 16 >> 16;
      const take = op === 48 || (op === 49 ? d[--sp] === 0 : d[--sp] !== 0);
      if (take) pc = next + rel;
      continue;
    }
    if (op === 51) { if (cp === 64) return trap(7); c[cp++] = next; pc = p[next - 2] | p[next - 1] << 8; continue; }
    if (op === 52) { if (!cp) return trap(8); pc = c[--cp]; continue; }
    if (op === 64) { const a = d[sp - 1]; if (a < 0 || a > 255) return trap(6); d[sp - 1] = m[a]; continue; }
    if (op === 65) { const a = d[sp - 1]; if (a < 0 || a > 255) return trap(6); m[a] = d[sp - 2]; sp -= 2; continue; }
    if (op === 80) {
      const s = String(d[sp - 1]);
      if (len + s.length > 65536) return trap(11);
      sp--; for (let i = 0; i < s.length; i++) out[len++] = s.charCodeAt(i);
      continue;
    }
    if (op === 81) { if (len === 65536) return trap(11); out[len++] = d[--sp] & 255; continue; }
    if (op === 82) { d[sp++] = ip < input.length ? input[ip++] : -1; continue; }
    if (op === 83) return done(d[--sp] & 255);
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
