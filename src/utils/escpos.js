/**
 * Minimal ESC/POS encoder for 80 mm thermal printers.
 * Uses CP437-ish ASCII fallback for accented Spanish characters.
 */

const ESC = 0x1b;
const GS = 0x1d;

const TRANSLIT = {
  Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U", Ñ: "N",
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
  ¿: "?", ¡: "!", º: "o", ª: "a",
};

function encodeText(str) {
  const s = String(str ?? "").replace(/./g, (ch) => TRANSLIT[ch] ?? ch);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out[i] = code < 256 ? code : 0x3f;
  }
  return out;
}

function concat(...chunks) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function cmd(...bytes) {
  return new Uint8Array(bytes);
}

export function buildEscPosTicket({
  headerLines = [],
  items = [],
  footerLines = [],
  openDrawer = false,
}) {
  const parts = [cmd(ESC, 0x40)]; // init

  const center = () => cmd(ESC, 0x61, 1);
  const left = () => cmd(ESC, 0x61, 0);
  const boldOn = () => cmd(ESC, 0x45, 1);
  const boldOff = () => cmd(ESC, 0x45, 0);
  const doubleOn = () => cmd(GS, 0x21, 0x11);
  const doubleOff = () => cmd(GS, 0x21, 0x00);
  const nl = () => encodeText("\n");
  const line = (text) => concat(encodeText(text), nl());
  const sep = () => line("--------------------------------");

  parts.push(center(), boldOn());
  headerLines.forEach((t) => parts.push(line(t)));
  parts.push(boldOff(), left(), sep());

  items.forEach((it) => {
    parts.push(line(it.name));
    parts.push(line(`  ${it.qty} x ${it.unit}    ${it.total}`));
    if (it.discount) parts.push(line(`  dto ${it.discount}`));
  });

  parts.push(sep(), center(), doubleOn(), boldOn());
  footerLines.filter((t) => t.big).forEach((t) => parts.push(line(t.text)));
  parts.push(doubleOff(), boldOff());
  footerLines.filter((t) => !t.big).forEach((t) => parts.push(line(t.text)));

  parts.push(nl(), nl(), nl());
  parts.push(cmd(GS, 0x56, 0x00)); // full cut

  if (openDrawer) {
    parts.push(cmd(ESC, 0x70, 0x00, 0x19, 0x19));
  }

  return concat(...parts);
}
