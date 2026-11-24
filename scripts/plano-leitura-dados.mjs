// Divide a Bíblia toda em 365 dias: trilha 1 = Antigo Testamento (sem Salmos), em ordem;
// trilha 2 = Novo Testamento em ordem, intercalado com os Salmos. Cerca de 3 a 4 capítulos por dia.
// Exporta planoDoAno(ano) -> [{ data: 'AAAA-MM-DD', at: 'Gênesis 1-3', nt: 'Mateus 1' }, ...]
import { readFileSync } from 'node:fs';

const D = JSON.parse(readFileSync(new URL('./dados/biblia-capitulos.json', import.meta.url), 'utf8'));
const capitulos = (livros) => livros.flatMap(([l, n]) => Array.from({ length: n }, (_, i) => [l, i + 1]));

function dividir(lista, dias) {
  const out = [];
  for (let d = 0; d < dias; d++) out.push(lista.slice(Math.round((d * lista.length) / dias), Math.round(((d + 1) * lista.length) / dias)));
  return out;
}
function rotulo(caps) {
  const partes = [];
  for (const [l, c] of caps) {
    const ult = partes.at(-1);
    if (ult && ult.l === l && ult.fim === c - 1) ult.fim = c;
    else partes.push({ l, ini: c, fim: c });
  }
  return partes.map((p) => `${p.l} ${p.ini}${p.fim > p.ini ? `-${p.fim}` : ''}`).join('; ');
}

export function planoDoAno(ano) {
  const dias = (Date.UTC(ano + 1, 0, 1) - Date.UTC(ano, 0, 1)) / 864e5;
  const at = capitulos(D.at);
  const nt = capitulos(D.nt);
  const sl = Array.from({ length: D.salmos }, (_, i) => ['Salmos', i + 1]);
  // Intercala: os Salmos se espalham de forma regular entre os capítulos do NT.
  const t2 = [];
  let iS = 0;
  nt.forEach((c, i) => {
    t2.push(c);
    while (iS < sl.length && (iS + 1) / sl.length <= (i + 1) / nt.length) t2.push(sl[iS++]);
  });
  while (iS < sl.length) t2.push(sl[iS++]);
  const A = dividir(at, dias);
  const B = dividir(t2, dias);
  return A.map((caps, d) => ({
    data: new Date(Date.UTC(ano, 0, 1 + d)).toISOString().slice(0, 10),
    at: rotulo(caps),
    nt: rotulo(B[d]),
  }));
}
