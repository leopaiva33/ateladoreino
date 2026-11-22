// Escolhe a música de fundo do Reel entre as faixas de assets/musica/ (veja o LEIA-ME de lá).
//
// Ordem de escolha:
// 1. "musica" no carrossel.json (nome do arquivo em assets/musica/): usa essa faixa.
// 2. O clima: "clima" no carrossel.json ("calma" ou "esperanca") ou, sem ele, deduzido do
//    tema (ansiedade, medo, luto, noite, descanso, Salmos... = calma; o resto = esperança).
//    Entre as faixas do clima (calma-*.mp3 ou esperanca-*.mp3), fica a menos usada; no
//    empate, uma diferente da do último Reel. Sem faixas do clima, usa as do outro clima.
//    Gerar de novo um Reel que já tem faixa registrada mantém a mesma.
// 3. Sem nenhuma faixa nova, usa assets/musica/fundo.mp3 (a música de sempre).
// O uso fica em assets/musica/uso.json ({ "<slug>": "<arquivo>" }), para alternar entre os Reels.
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const PASTA = 'assets/musica';
const USO = join(PASTA, 'uso.json');
const existe = (p) => access(p).then(() => true, () => false);

const CALMA =
  /ansiedad|ansios|angústia|angustia|medo|luto|perda|tristeza|depress|dormir|noite|descanso|sono|\bpaz\b|silêncio|silencio|salmo|sofr|difícil|dificil|difíceis|dificeis|consolo|conforto/i;

export function climaDoTema(spec, slug = '') {
  if (spec.clima === 'calma' || spec.clima === 'esperanca') return spec.clima;
  const capa = spec.slides?.[0] ?? {};
  const texto = [slug.replace(/-/g, ' '), capa.titulo, capa.chapeu, capa.apoio].filter(Boolean).join(' ');
  return CALMA.test(texto) ? 'calma' : 'esperanca';
}

/** Devolve { arquivo, motivo } ou null (sem música). Com registrar, grava o uso em uso.json. */
export async function escolherMusica(spec, slug, { registrar = false } = {}) {
  const arquivos = (await readdir(PASTA).catch(() => [])).filter((f) => f.toLowerCase().endsWith('.mp3'));
  let escolha = null;
  let motivo = '';

  if (spec.musica) {
    if (!arquivos.includes(spec.musica)) throw new Error(`"musica": "${spec.musica}" não existe em ${PASTA}/.`);
    escolha = spec.musica;
    motivo = 'escolhida no carrossel.json';
  } else {
    const uso = (await existe(USO)) ? JSON.parse(await readFile(USO, 'utf8')) : {};
    const clima = climaDoTema(spec, slug);
    const outro = clima === 'calma' ? 'esperanca' : 'calma';
    const doClima = (c) => arquivos.filter((f) => f.startsWith(`${c}-`)).sort();
    const opcoes = doClima(clima).length ? doClima(clima) : doClima(outro);
    if (uso[slug] && arquivos.includes(uso[slug])) {
      // Gerar de novo o mesmo Reel mantém a faixa que ele já tinha.
      escolha = uso[slug];
      motivo = 'a mesma da versão anterior deste Reel';
    } else if (opcoes.length) {
      const contagem = Object.fromEntries(opcoes.map((f) => [f, 0]));
      for (const [s, f] of Object.entries(uso)) if (s !== slug && f in contagem) contagem[f]++;
      const ultima = Object.entries(uso).filter(([s]) => s !== slug).at(-1)?.[1];
      opcoes.sort((a, b) => contagem[a] - contagem[b] || (a === ultima) - (b === ultima));
      escolha = opcoes[0];
      motivo = `clima "${clima}"${doClima(clima).length ? '' : ` (sem faixas desse clima; usando "${outro}")`}`;
    } else if (arquivos.includes('fundo.mp3')) {
      escolha = 'fundo.mp3';
      motivo = 'música padrão (ainda não há faixas calma-*.mp3 ou esperanca-*.mp3)';
    }
    if (escolha && registrar && escolha !== 'fundo.mp3' && uso[slug] !== escolha) {
      uso[slug] = escolha;
      await writeFile(USO, JSON.stringify(uso, null, 2) + '\n');
    }
  }
  return escolha ? { arquivo: join(PASTA, escolha), motivo } : null;
}
