// Função da Vercel: inscrição na newsletter (POST /api/newsletter).
// Recebe { email, consentimento, site } e pede ao Brevo a confirmação por e-mail (dupla
// confirmação): o contato só entra na lista depois de clicar no link que recebe.
// Variáveis de ambiente na Vercel: BREVO_API_KEY, BREVO_LIST_ID e BREVO_DOI_TEMPLATE_ID
// (modelo de e-mail de confirmação criado no Brevo).
const SITE = 'https://ateladoreino.com';
// Aceita o número com ou sem "#" (como o Brevo mostra).
const numero = (v) => Number(String(v ?? '').replace(/[^0-9]/g, ''));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }
  const { BREVO_API_KEY, BREVO_LIST_ID, BREVO_DOI_TEMPLATE_ID } = process.env;
  if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_DOI_TEMPLATE_ID) {
    return res.status(503).json({ ok: false, erro: 'A newsletter ainda não está disponível. Tente de novo em breve.' });
  }

  let corpo = req.body ?? {};
  if (typeof corpo === 'string') {
    try {
      corpo = JSON.parse(corpo);
    } catch {
      corpo = Object.fromEntries(new URLSearchParams(corpo));
    }
  }
  const email = String(corpo.email ?? '').trim().toLowerCase();
  // Campo invisível para robôs: se vier preenchido, finge sucesso e não inscreve.
  if (corpo.site) return res.status(200).json({ ok: true });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, erro: 'Confira o e-mail digitado.' });
  }
  if (!corpo.consentimento || corpo.consentimento === 'false') {
    return res.status(400).json({ ok: false, erro: 'Marque a caixa de consentimento para continuar.' });
  }

  const r = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      email,
      includeListIds: [numero(BREVO_LIST_ID)],
      templateId: numero(BREVO_DOI_TEMPLATE_ID),
      redirectionUrl: `${SITE}/newsletter/confirmada/`,
    }),
  });
  if (r.ok || r.status === 204) return res.status(200).json({ ok: true });
  const detalhe = await r.text();
  console.error(`Brevo respondeu ${r.status}: ${detalhe.slice(0, 300)}`);
  if (/duplicate|already/i.test(detalhe)) return res.status(200).json({ ok: true });
  return res.status(502).json({ ok: false, erro: 'Não foi possível concluir a inscrição agora. Tente de novo mais tarde.' });
}
