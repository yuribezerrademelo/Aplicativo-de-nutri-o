/**
 * POST /functions/v1/comentar-refeicao
 * Corpo: { refeicao_id, inicio_dia (ISO, início do dia no fuso do usuário), hora_local ("HH:MM") }
 *
 * Gera o comentário de coaching de uma refeição já confirmada, no contexto do dia,
 * e guarda em refeicoes.comentario. Sem ANTHROPIC_API_KEY, usa o modo simulado.
 *
 * Segredos opcionais: COACHING_MODELO (padrão claude-haiku-5-5), COACHING_LIMITE_DIARIO (padrão 30).
 */
import { withSupabase } from '@supabase/server';

import { ErroAnalise } from '../_shared/analise.ts';
import {
  gerarComentario,
  simularComentario,
  VERSAO_PROMPT_COACHING,
  type PerfilCoaching,
  type RefeicaoDoDia,
} from '../_shared/coaching.ts';

const LIMITE_DIARIO = Number(Deno.env.get('COACHING_LIMITE_DIARIO') ?? 30);
const UUID = /^[0-9a-f-]{36}$/i;

const erro = (status: number, codigo: string, mensagem: string) =>
  Response.json({ erro: { codigo, mensagem } }, { status });

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return erro(405, 'metodo', 'Use POST.');
    const usuarioId = ctx.userClaims?.id;
    if (!usuarioId) return erro(401, 'nao_autenticado', 'Entre na sua conta.');

    const corpo = await req.json().catch(() => null);
    const refeicaoId = corpo?.refeicao_id;
    const inicioDia = new Date(corpo?.inicio_dia ?? '');
    const horaLocal = corpo?.hora_local;
    if (typeof refeicaoId !== 'string' || !UUID.test(refeicaoId) || Number.isNaN(inicioDia.getTime()) || !/^\d{2}:\d{2}$/.test(horaLocal ?? '')) {
      return erro(400, 'entrada_invalida', 'Dados da refeição inválidos.');
    }

    try {
      const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await ctx.supabase
        .from('analises')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'coaching')
        .gte('criado_em', desde);
      if ((count ?? 0) >= LIMITE_DIARIO) return erro(429, 'limite', 'Limite de comentários do dia atingido.');

      const { data: perfil, error: erroPerfil } = await ctx.supabase
        .from('perfis')
        .select('nome, objetivo, meta_kcal, peso_kg')
        .eq('id', usuarioId)
        .single();
      if (erroPerfil || !perfil) return erro(404, 'perfil', 'Complete seu perfil primeiro.');

      // Refeições do dia; a que vai ser comentada pode ter sido registrada para outro horário.
      const { data: doDia, error: erroRefeicoes } = await ctx.supabase
        .from('refeicoes')
        .select('id, tipo, consumida_em, kcal_min, kcal_provavel, kcal_max, proteina_g, carboidrato_g, gordura_g, fibra_g, itens')
        .gte('consumida_em', inicioDia.toISOString())
        .lt('consumida_em', new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .order('consumida_em');
      if (erroRefeicoes) throw erroRefeicoes;
      const refeicoes = (doDia ?? []) as RefeicaoDoDia[];
      if (!refeicoes.some((r) => r.id === refeicaoId)) return erro(404, 'refeicao_nao_encontrada', 'Refeição não encontrada.');

      const dados = { perfil: perfil as PerfilCoaching, refeicoes, refeicaoId, horaLocal };
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      const { comentario, uso, modelo } = apiKey
        ? await gerarComentario(dados, { apiKey, modelo: Deno.env.get('COACHING_MODELO') ?? undefined })
        : { comentario: simularComentario(dados), uso: { entrada: 0, saida: 0 }, modelo: 'simulado' };

      const { error: erroSalvar } = await ctx.supabase.from('refeicoes').update({ comentario }).eq('id', refeicaoId);
      if (erroSalvar) console.error('Falha ao salvar comentário', erroSalvar);

      const { error: erroRegistro } = await ctx.supabase.from('analises').insert({
        usuario_id: usuarioId,
        tipo: 'coaching',
        modelo,
        versao_prompt: VERSAO_PROMPT_COACHING,
        tokens_entrada: uso.entrada,
        tokens_saida: uso.saida,
        resultado: { comentario },
      });
      if (erroRegistro) console.error('Falha ao registrar uso', erroRegistro);

      return Response.json({ comentario, simulado: !apiKey });
    } catch (e) {
      if (e instanceof ErroAnalise) return erro(e.status, e.codigo, e.message);
      console.error('Erro inesperado', e);
      return erro(500, 'interno', 'O comentário não pôde ser gerado agora.');
    }
  }),
};
