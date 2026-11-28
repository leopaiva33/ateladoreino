/** Configurações centrais do site. */
export const SITE = {
  name: 'A Tela do Reino',
  url: 'https://ateladoreino.com',
  /** Título da home (a página sem título próprio): nome + o que o site oferece. */
  homeTitle: 'A Tela do Reino: devocionais, estudos bíblicos e oração',
  /** Frase da marca: a mesma no site, no YouTube, no Instagram e no Facebook. */
  slogan: 'A Bíblia no contexto judaico de Jesus, explicada de forma simples',
  description:
    'Devocionais, reflexões bíblicas, orações e estudos da Torá com contexto judaico para fortalecer sua fé no dia a dia. Conteúdo cristão gratuito toda semana.',
  /** Logo quadrado (PNG) para os dados estruturados da editora. Gerado por `npm run images`. */
  logo: '/logo.png',
  locale: 'pt_BR',
  lang: 'pt-BR',
  email: 'contato@ateladoreino.com',
  /** PNG: as redes sociais não exibem SVG. Gerada por `npm run images`. */
  ogImage: '/og-default.png',

  /** Perfis oficiais: aparecem no rodapé e nos dados estruturados (sameAs). */
  redes: [
    { nome: 'YouTube', url: 'https://www.youtube.com/@atela_do_reino' },
    { nome: 'Instagram', url: 'https://www.instagram.com/ateladoreino/' },
    { nome: 'Facebook', url: 'https://www.facebook.com/114649038318311' },
  ],

  /**
   * Grupo do WhatsApp (leitura do dia do plano 2027 e os artigos novos). Aparece no rodapé, no fim
   * dos artigos, no /links e na newsletter. Fica fora do `sameAs`, porque é convite e não perfil.
   */
  whatsapp: 'https://chat.whatsapp.com/FIujE24Yk5Q63X1JxEqFlf' as string,

  /**
   * Apoio mensal (Apoia.se). Com o link preenchido, a página /apoie mostra o botão, o rodapé ganha
   * o link "Apoie" e os artigos mostram um pedido discreto no fim. Vazio: /apoie mostra só as
   * formas gratuitas de ajudar e fica fora do Google.
   */
  apoio: '' as string,

  /**
   * Quem escreve e é responsável pelo site (E-E-A-T e LGPD).
   * Preencha com dados REAIS: quando `name` estiver preenchido, a página "Sobre" mostra a seção
   * "Quem escreve" e a Política de Privacidade identifica o responsável pelo tratamento de dados.
   * Não coloque credenciais que não existam.
   */
  author: {
    name: 'Leonardo Paiva',
    /** Ex.: "Escritor e líder de pequeno grupo há 10 anos" (apenas se for verdade). */
    bio: 'Criador da A Tela do Reino, onde escreve devocionais e estudos semanais da Torá para explicar a Bíblia no contexto judaico de Jesus, de forma simples.',
    /** Frase de propósito do site, mostrada na caixa de autor no fim dos artigos. */
    proposito:
      'Escrevo a A Tela do Reino para levar a Palavra de Deus ao dia a dia de quem quer crescer na fé, com devocionais, reflexões bíblicas e encorajamento.',
  },

  /**
   * ID de medição do Google Analytics 4 (G-XXXXXXXXXX). Vazio = GA desligado.
   * Com ID, o site mostra um aviso de cookies e só ativa os cookies do GA após o "Aceitar".
   */
  googleAnalytics: 'G-83V6M71HN7' as string,
  // Liga o formulário da newsletter (Brevo) quando a conta estiver configurada.
  newsletter: true as boolean,
  /**
   * Isca em destaque no fim dos artigos: no lugar da caixa genérica da newsletter, o formulário
   * entrega um guia (ver ISCAS em api/newsletter.js). Vale até a data `ate` (o site é reconstruído
   * todo dia, então volta sozinho à caixa genérica depois). Sem isca: `null`.
   */
  iscaDestaque: {
    isca: 'plano-2027',
    ate: '2027-02-28T23:59:00-03:00',
    titulo: 'Grátis: Plano de leitura da Bíblia 2027',
    texto:
      'A Bíblia toda em 365 dias, cerca de 3 capítulos por dia, com uma nota de contexto judaico por mês. Deixe o seu e-mail, confirme e o PDF abre na hora. Você também recebe a reflexão da semana, todo domingo.',
    botao: 'Quero o plano grátis',
  } as { isca: string; ate: string; titulo: string; texto: string; botao: string } | null,

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
