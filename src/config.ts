/** Configurações centrais do site. */
export const SITE = {
  name: 'A Tela do Reino',
  url: 'https://ateladoreino.com',
  description:
    'Devocionais, reflexões bíblicas e conteúdo cristão para fortalecer sua fé no dia a dia.',
  locale: 'pt_BR',
  lang: 'pt-BR',
  email: 'contato@ateladoreino.com',
  ogImage: '/og-default.svg',

  adsense: {
    /** ID do editor (ca-pub-...). Também deve estar em public/ads.txt. */
    client: 'ca-pub-2321225607029896',
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
