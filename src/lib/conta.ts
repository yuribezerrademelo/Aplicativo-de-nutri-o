import { supabase } from './supabase';

async function acaoDeConta(acao: 'retirar-consentimento' | 'excluir-conta'): Promise<string | null> {
  const { error } = await supabase.functions.invoke('conta', { body: { acao } });
  return error ? 'Não foi possível concluir agora. Verifique sua conexão e tente de novo.' : null;
}

/** Liga a contribuição anônima com a base coletiva, registrando quando o consentimento foi dado. */
export async function consentirContribuicao(usuarioId: string): Promise<string | null> {
  const { error } = await supabase
    .from('perfis')
    .update({ contribuir_base_coletiva: true, consentimento_em: new Date().toISOString() })
    .eq('id', usuarioId);
  return error ? 'Não foi possível salvar sua escolha.' : null;
}

/** Desliga a contribuição e apaga tudo o que já foi contribuído. */
export const retirarConsentimento = () => acaoDeConta('retirar-consentimento');

/** Apaga a conta e todos os dados; depois encerra a sessão no aparelho. */
export async function excluirConta(): Promise<string | null> {
  const falha = await acaoDeConta('excluir-conta');
  if (!falha) await supabase.auth.signOut();
  return falha;
}
