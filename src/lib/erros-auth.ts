import type { AuthError } from '@supabase/supabase-js';

/** Traduz os erros mais comuns do Supabase Auth para mensagens amigáveis. */
export function mensagemDeErroAuth(erro: AuthError): string {
  switch (erro.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Já existe uma conta com esse e-mail. Tente entrar.';
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 6 caracteres.';
    case 'validation_failed':
    case 'email_address_invalid':
      return 'Confira o e-mail digitado.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    default:
      return erro.message.includes('Network')
        ? 'Sem conexão com o servidor. Verifique sua internet.'
        : 'Algo deu errado. Tente de novo em instantes.';
  }
}
