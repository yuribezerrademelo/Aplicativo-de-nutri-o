/**
 * POST /functions/v1/analisar-refeicao
 *
 * Recebe foto e/ou descrição (ou um refinamento), chama a Claude API e devolve
 * a estimativa. Exige usuário logado e aplica um limite de análises por dia.
 *
 * Segredos usados: ANTHROPIC_API_KEY, ANALISE_MODELO, ANALISE_ESFORCO e
 * ANALISE_LIMITE_DIARIO. Sem ANTHROPIC_API_KEY, a função roda em modo simulado:
 * devolve estimativas de exemplo (marcadas como simuladas), sem custo.
 */
import { withSupabase } from '@supabase/server';

import { analisarRefeicao, ErroAnalise, tipoDaEntrada, validarEntrada } from '../_shared/analise.ts';
import { VERSAO_PROMPT } from '../_shared/prompt-analise.ts';
import { simularAnalise } from '../_shared/simulador.ts';

const LIMITE_DIARIO = Number(Deno.env.get('ANALISE_LIMITE_DIARIO') ?? 40);

const erro = (status: number, codigo: string, mensagem: string) =>
  Response.json({ erro: { codigo, mensagem } }, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'metodo', 'Use POST.');

    const usuarioId = ctx.userClaims?.id;
    if (!usuarioId) return erro(401, 'nao_autenticado', 'Entre na sua conta para analisar refeições.');

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    try {
      const entrada = validarEntrada(await req.json().catch(() => null));

      // Limite de uso nas últimas 24 horas (o RLS já restringe às linhas do próprio usuário).
      const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: erroContagem } = await ctx.supabase
        .from('analises')
        .select('id', { count: 'exact', head: true })
        .gte('criado_em', desde);
      if (erroContagem) throw erroContagem;
      if ((count ?? 0) >= LIMITE_DIARIO) {
        return erro(429, 'limite', `Você chegou ao limite de ${LIMITE_DIARIO} análises em 24 horas. Tente mais tarde.`);
      }

      const { resultado, uso, modelo } = apiKey
        ? await analisarRefeicao(entrada, {
            apiKey,
            modelo: Deno.env.get('ANALISE_MODELO') ?? undefined,
            esforco: (Deno.env.get('ANALISE_ESFORCO') as 'low' | 'medium' | 'high' | undefined) ?? undefined,
          })
        : { resultado: await simularAnalise(entrada), uso: { entrada: 0, saida: 0 }, modelo: 'simulado' };

      const { error: erroRegistro } = await ctx.supabase.from('analises').insert({
        usuario_id: usuarioId,
        tipo: tipoDaEntrada(entrada),
        modelo,
        versao_prompt: VERSAO_PROMPT,
        tokens_entrada: uso.entrada,
        tokens_saida: uso.saida,
        resultado,
      });
      if (erroRegistro) console.error('Falha ao registrar análise', erroRegistro);

      return Response.json({ resultado });
    } catch (e) {
      if (e instanceof ErroAnalise) {
        if (e.status >= 500) console.error(e.codigo, e.message);
        return erro(e.status, e.codigo, e.message);
      }
      console.error('Erro inesperado', e);
      return erro(500, 'interno', 'Algo deu errado na análise. Tente de novo.');
    }
  }),
};
