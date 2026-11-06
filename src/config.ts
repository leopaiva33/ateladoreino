/** Configurações centrais do site. */
export const SITE = {
  name: 'A Tela do Reino',
  url: 'https://ateladoreino.com',
  description:
    'Devocionais, reflexões bíblicas e conteúdo cristão para fortalecer sua fé no dia a dia.',
  locale: 'pt_BR',
  lang: 'pt-BR',
  email: 'contato@ateladoreino.com',
  /** PNG: as redes sociais não exibem SVG. Gerada por `npm run images`. */
  ogImage: '/og-default.png',

  /**
   * Quem escreve e é responsável pelo site (E-E-A-T e LGPD).
   * Preencha com dados REAIS: quando `name` estiver preenchido, a página "Sobre" mostra a seção
   * "Quem escreve" e a Política de Privacidade identifica o responsável pelo tratamento de dados.
   * Não coloque credenciais que não existam.
   */
  author: {
    name: 'Leonardo Paiva',
    /** Ex.: "Escritor e líder de pequeno grupo há 10 anos" (apenas se for verdade). */
    bio: '',
    /** Frase de propósito do site, mostrada na caixa de autor no fim dos artigos. */
    proposito:
      'Escrevo a A Tela do Reino para levar a Palavra de Deus ao dia a dia de quem quer crescer na fé, com devocionais, reflexões bíblicas e encorajamento.',
  },

  adsense: {
    /** ID do editor (ca-pub-...). Também deve estar em public/ads.txt. */
    client: 'ca-pub-2321225607029896',
    /**
     * Liga/desliga os blocos manuais de anúncio (componente AdSlot e o rótulo "Publicidade").
     * Deixe `false` enquanto o site não for aprovado no AdSense ou não houver IDs reais em `slots`;
     * o script automático do cabeçalho, o ads.txt e o aviso do rodapé continuam ativos.
     * Para ativar: troque os IDs de `slots` pelos reais e mude para `true`.
     */
    showManualAds: false as boolean,
    /**
     * IDs dos blocos de anúncio (data-ad-slot).
     * ATENÇÃO: os valores abaixo são os mesmos publicados hoje no site e parecem
     * PLACEHOLDERS. Troque pelos IDs reais criados em AdSense > Anúncios > Por bloco de anúncios.
     */
    slots: {
      topo: '2222222222',
      rodape: '3333333333',
    },
  },
} as const;
