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
  },

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
