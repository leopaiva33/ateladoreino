/**
 * Plugin rehype: envolve os trechos em hebraico do Markdown em <span lang="he" dir="rtl">.
 * Assim o leitor de tela troca para a voz em hebraico (em vez de ler como português) e o
 * navegador escolhe a fonte e a direção certas. Critério WCAG 3.1.2 (idioma das partes).
 * Palavras seguidas, separadas por espaço ou maqaf (־), ficam no mesmo span.
 */
const LETRA = '\\u0590-\\u05FF\\uFB1D-\\uFB4F';
const TRECHO = new RegExp(`[${LETRA}]+(?:[ \\u05BE][${LETRA}]+)*`, 'g');
const TEM_HEBRAICO = new RegExp(`[${LETRA}]`);
const IGNORAR = new Set(['script', 'style', 'code', 'pre']);

function dividir(texto) {
  const partes = [];
  let ultimo = 0;
  for (const m of texto.matchAll(TRECHO)) {
    if (m.index > ultimo) partes.push({ type: 'text', value: texto.slice(ultimo, m.index) });
    partes.push({
      type: 'element',
      tagName: 'span',
      properties: { lang: 'he', dir: 'rtl' },
      children: [{ type: 'text', value: m[0] }],
    });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ type: 'text', value: texto.slice(ultimo) });
  return partes;
}

function visitar(no) {
  if (!no.children) return;
  if (no.type === 'element' && (IGNORAR.has(no.tagName) || no.properties?.lang)) return;
  no.children = no.children.flatMap((filho) => {
    if (filho.type === 'text') {
      return TEM_HEBRAICO.test(filho.value) ? dividir(filho.value) : [filho];
    }
    visitar(filho);
    return [filho];
  });
}

export default function rehypeHebraico() {
  return (arvore) => visitar(arvore);
}
