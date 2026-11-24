// Monta a legenda do Instagram a partir da "legenda" do carrossel.json.
//
// A primeira linha (o que aparece antes do "mais") passa a ser o gancho da capa, e não a
// pergunta; a pergunta vai para o fim, antes das hashtags.
// - Carrossel: gancho, as linhas da legenda original (sem a pergunta), a pergunta e as hashtags.
// - Reel: versão curta e diferente da do carrossel: gancho, pergunta, link do site, aviso
//   (se houver) e hashtags.
// Se a legenda original já não começar por uma pergunta, ela é usada como está.

const limpar = (t) => (t ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const comPonto = (t) => (/[.!?…:]$/.test(t) ? t : `${t}.`);

export function legendaInstagram(spec, { reel = false } = {}) {
  const original = spec.legenda ?? '';
  const partes = original.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (!partes.length || !partes[0].includes('?')) return original;

  const capa = spec.slides?.[0] ?? {};
  const titulo = limpar(capa.titulo);
  if (!titulo) return original;
  const apoio = limpar(capa.apoio);
  const gancho = apoio ? `${comPonto(titulo)}\n${apoio}` : comPonto(titulo);

  const pergunta = partes[0];
  const hashtags = /^#/.test(partes.at(-1)) ? partes.at(-1) : '';
  const meio = partes.slice(1, hashtags ? -1 : undefined);

  const blocos = reel
    ? [gancho, pergunta, ...meio.filter((p) => /ateladoreino\.com|Não substitui/i.test(p)), hashtags]
    : [gancho, 'Deslize e salve para reler quando precisar.', ...meio, pergunta, hashtags];
  return blocos.filter(Boolean).join('\n\n');
}
