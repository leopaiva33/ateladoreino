import { SITE } from '../config';

/** Remove marcações simples de Markdown (negrito, itálico, links) de um trecho. */
function textoPuro(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lê a seção "## Perguntas frequentes" do corpo Markdown (pergunta em negrito + resposta). */
export function extrairFaq(body: string | undefined): { pergunta: string; resposta: string }[] {
  if (!body) return [];
  const m = body.match(/^##\s+Perguntas frequentes\s*$([\s\S]*?)(?=^##\s|\s*$(?![\s\S]))/m);
  if (!m) return [];
  const itens: { pergunta: string; resposta: string }[] = [];
  for (const bloco of m[1].split(/\n\s*\n/)) {
    const linhas = bloco.trim().split('\n');
    const q = linhas[0]?.match(/^\*\*(.+?)\*\*$/);
    if (!q || linhas.length < 2) continue;
    itens.push({ pergunta: textoPuro(q[1]), resposta: textoPuro(linhas.slice(1).join(' ')) });
  }
  return itens;
}

const absoluta = (caminho: string) => new URL(caminho, SITE.url).href;

/** Editora (o próprio site), com logo: o Google usa o logo no painel e nos resultados. */
const editora = () => ({
  '@type': 'Organization',
  name: SITE.name,
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: absoluta(SITE.logo), width: 512, height: 512 },
  sameAs: SITE.redes.map((r) => r.url),
});

/**
 * Trilha de navegação (BreadcrumbList): o Google mostra "A Tela do Reino › Reflexões › …" no
 * resultado, no lugar do endereço. O primeiro item (Início) é acrescentado aqui.
 */
export function jsonLdTrilha(itens: { nome: string; caminho: string }[]) {
  const todos = [{ nome: 'Início', caminho: '/' }, ...itens];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: todos.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nome,
      item: absoluta(item.caminho),
    })),
  };
}

/** Página de lista (Reflexões, Estudos): CollectionPage com os itens em ordem. */
export function jsonLdColecao(opts: {
  nome: string;
  descricao: string;
  caminho: string;
  itens: { nome: string; caminho: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.nome,
    description: opts.descricao,
    url: absoluta(opts.caminho),
    inLanguage: SITE.lang,
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.itens.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absoluta(item.caminho),
        name: item.nome,
      })),
    },
  };
}

export function jsonLdArtigo(opts: {
  titulo: string;
  descricao: string;
  caminho: string;
  imagem?: string;
  publicado: Date;
  atualizado?: Date;
  body?: string;
}) {
  const url = absoluta(opts.caminho);
  const artigo: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.titulo,
    description: opts.descricao,
    image: [absoluta(opts.imagem ?? SITE.ogImage)],
    datePublished: opts.publicado.toISOString(),
    dateModified: (opts.atualizado ?? opts.publicado).toISOString(),
    inLanguage: SITE.lang,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: SITE.author.name, url: absoluta('/sobre/') },
    publisher: editora(),
  };
  const blocos: Record<string, unknown>[] = [artigo];

  const faq = extrairFaq(opts.body);
  if (faq.length > 0) {
    blocos.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.pergunta,
        acceptedAnswer: { '@type': 'Answer', text: f.resposta },
      })),
    });
  }
  return blocos;
}

export function jsonLdSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: editora(),
  };
}
