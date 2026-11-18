/*
 * CONFIGURAÇÃO PÚBLICA DE SEGURANÇA — COPILOTO FINANCEIRO 4.7.1
 *
 * A Site Key do Cloudflare Turnstile é pública e própria para o navegador.
 * A Secret Key do Turnstile permanece somente no Supabase Authentication.
 * Nunca inclua aqui service_role, secret key, senha do banco ou credenciais.
 */
window.APP_SECURITY_CONFIG = Object.freeze({
  turnstileSiteKey: "0x4AAAAAAGG8KpDfQB5IhLrJ",
  captchaRequired: true,
  mfaOptional: true,
  sensitiveActionsRequireAal2: true,
  phoneMfaEnabled: false
});
