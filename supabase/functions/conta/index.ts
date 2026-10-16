/**
 * POST /functions/v1/conta
 * Corpo: { acao: 'retirar-consentimento' | 'excluir-conta' }
 *
 * Ações que exigem a chave secreta do servidor:
 * - retirar-consentimento: desliga a contribuição e apaga tudo o que o usuário já contribuiu;
 * - excluir-conta: apaga as contribuições e a conta (perfil, refeições, memória e
 *   registros de uso saem junto, por "on delete cascade").
 *
 * Segredo usado: CONTRIBUICAO_SAL (o mesmo da coleta).
 */
import { withSupabase } from '@supabase/server';

import { codigoContribuinte } from '../_shared/contribuicao.ts';

const erro = (status: number, codigo: string, mensagem: string) =>
  Response.json({ erro: { codigo, mensagem } }, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'metodo', 'Use POST.');
    const usuarioId = ctx.userClaims?.id;
    if (!usuarioId) return erro(401, 'nao_autenticado', 'Entre na sua conta.');

    const corpo = await req.json().catch(() => null);
    const acao = corpo?.acao;
    if (acao !== 'retirar-consentimento' && acao !== 'excluir-conta') return erro(400, 'acao', 'Ação inválida.');

    try {
      // Contribuições saem nas duas ações. Sem o sal, nunca houve coleta.
      const sal = Deno.env.get('CONTRIBUICAO_SAL');
      if (sal) {
        const { error } = await ctx.supabaseAdmin
          .from('contribuicoes')
          .delete()
          .eq('contribuinte', await codigoContribuinte(usuarioId, sal));
        if (error) throw error;
      }

      if (acao === 'retirar-consentimento') {
        const { error } = await ctx.supabase
          .from('perfis')
          .update({ contribuir_base_coletiva: false, consentimento_em: null })
          .eq('id', usuarioId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(usuarioId);
      if (error) throw error;
      return Response.json({ ok: true });
    } catch (e) {
      console.error('Falha na ação de conta', acao, e);
      return erro(500, 'interno', 'Não foi possível concluir agora. Tente de novo.');
    }
  }),
};
