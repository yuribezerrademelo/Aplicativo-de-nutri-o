/**
 * Comentário de coaching depois de cada refeição confirmada.
 *
 * Recebe o contexto do dia (perfil, refeições de hoje, horário) e devolve
 * 2 ou 3 frases práticas e sem culpa. Tem versão com IA e versão simulada.
 */
import { ErroAnalise } from './analise.ts';
import { somarComFaixa, type ItemEstimado, type Totais } from './estimativa.ts';

export const VERSAO_PROMPT_COACHING = '2026-10-15.1';
export const MODELO_COACHING_PADRAO = 'claude-haiku-5-5';

export type RefeicaoDoDia = Totais & {
  id: string;
  tipo: string;
  consumida_em: string;
  itens: ItemEstimado[];
};

export type PerfilCoaching = {
  nome: string | null;
  objetivo: 'perder' | 'manter' | 'ganhar' | null;
  meta_kcal: number;
  peso_kg: number | null;
};

export type DadosCoaching = {
  perfil: PerfilCoaching;
  /** Refeições de hoje, incluindo a que acabou de ser registrada. */
  refeicoes: RefeicaoDoDia[];
  refeicaoId: string;
  /** Horário local do usuário, "HH:MM". */
  horaLocal: string;
};

const TITULO_TIPO: Record<string, string> = {
  cafe_da_manha: 'café da manhã',
  almoco: 'almoço',
  lanche: 'lanche',
  jantar: 'jantar',
  ceia: 'ceia',
  outro: 'refeição',
};

const OBJETIVO: Record<string, string> = {
  perder: 'perder peso',
  manter: 'manter o peso',
  ganhar: 'ganhar peso',
};

export function resumoDoDia(d: DadosCoaching) {
  const atual = d.refeicoes.find((r) => r.id === d.refeicaoId);
  if (!atual) throw new ErroAnalise('refeicao_nao_encontrada', 'Refeição não encontrada.', 404);
  const dia = somarComFaixa(d.refeicoes);
  const meta = Number(d.perfil.meta_kcal);
  return {
    atual,
    dia,
    meta,
    restante: Math.round(meta - dia.kcal_provavel),
    anteriores: d.refeicoes.filter((r) => r.id !== d.refeicaoId),
    hora: Number(d.horaLocal.slice(0, 2)),
  };
}

const n = (v: number) => Math.round(Number(v));

/** Texto com os fatos que o coach precisa, em linguagem simples. */
export function montarContexto(d: DadosCoaching): string {
  const { atual, dia, meta, restante, anteriores } = resumoDoDia(d);
  const peso = d.perfil.peso_kg ? Number(d.perfil.peso_kg) : null;
  const linhas = [
    `Usuário: ${d.perfil.nome ?? 'sem nome'}; objetivo: ${OBJETIVO[d.perfil.objetivo ?? 'manter'] ?? 'manter o peso'}; meta diária: ${n(meta)} kcal${peso ? `; peso: ${peso} kg` : ''}.`,
    peso ? `Referência geral de proteína para o objetivo: cerca de ${n(peso * 1.6)} g por dia.` : '',
    `Agora são ${d.horaLocal}.`,
    '',
    `Refeição que acabou de registrar (${TITULO_TIPO[atual.tipo] ?? 'refeição'}): ${n(atual.kcal_provavel)} kcal (entre ${n(atual.kcal_min)} e ${n(atual.kcal_max)}); proteína ${n(atual.proteina_g)} g, carboidrato ${n(atual.carboidrato_g)} g, gordura ${n(atual.gordura_g)} g.`,
    `Itens: ${atual.itens.map((i) => `${i.nome} (~${n(i.gramas)} g, ${n(i.kcal_provavel)} kcal)`).join('; ')}.`,
    '',
    anteriores.length
      ? `Antes hoje: ${anteriores.map((r) => `${TITULO_TIPO[r.tipo] ?? 'refeição'} ${n(r.kcal_provavel)} kcal`).join('; ')}.`
      : 'É a primeira refeição registrada hoje.',
    `Total do dia até agora: ${n(dia.kcal_provavel)} kcal (entre ${n(dia.kcal_min)} e ${n(dia.kcal_max)}); proteína ${n(dia.proteina_g)} g.`,
    restante >= 0 ? `Faltam cerca de ${restante} kcal para a meta.` : `Passou cerca de ${-restante} kcal da meta.`,
  ];
  return linhas.filter((l, i) => l !== '' || linhas[i - 1] !== '').join('\n');
}

export const PROMPT_COACHING = `Você é o coach nutricional de um app brasileiro de acompanhamento alimentar. O usuário acabou de registrar uma refeição. Escreva um comentário curto sobre ela no contexto do dia.

Regras:
- 2 ou 3 frases, no máximo cerca de 60 palavras. Português do Brasil, tom caloroso e direto, como um amigo que entende de nutrição. Sem emojis, sem listas, sem títulos.
- Sem culpa, nunca. Doces, frituras, cerveja e "besteiras" fazem parte da vida. Não use palavras como "ruim", "errado", "pecado", "exagero", "culpa" ou "compensar".
- Seja útil: no máximo uma sugestão prática para o resto do dia (por exemplo, incluir proteína, deixar espaço para o jantar, beber água). Se não houver nada útil a sugerir, apenas reconheça o que foi bem.
- Se passou da meta: normalize, diga que um dia não define nada e que amanhã segue normal. Nunca sugira pular refeições, jejum, cortar drasticamente ou exercício para "queimar" o que comeu.
- Se o dia estiver bem abaixo da meta perto da noite, incentive comer o suficiente em vez de elogiar comer pouco.
- Números aproximados ("cerca de 600 kcal"); lembre que são estimativas apenas se fizer diferença.
- Não dê diagnósticos nem fale de doenças.
- Responda apenas com o texto do comentário.`;

type RespostaApi = {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

export async function gerarComentario(
  d: DadosCoaching,
  opcoes: { apiKey: string; modelo?: string; fetch?: typeof fetch },
): Promise<{ comentario: string; uso: { entrada: number; saida: number }; modelo: string }> {
  const modelo = opcoes.modelo || MODELO_COACHING_PADRAO;
  const resposta = await (opcoes.fetch ?? fetch)('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': opcoes.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 2000,
      system: PROMPT_COACHING,
      messages: [{ role: 'user', content: montarContexto(d) }],
      output_config: { effort: 'low' },
    }),
  });
  const corpo = (await resposta.json().catch(() => ({}))) as RespostaApi;
  if (!resposta.ok) {
    if (resposta.status === 401 || resposta.status === 403)
      throw new ErroAnalise('configuracao', 'Chave da Claude API inválida.', 500);
    throw new ErroAnalise('ia_indisponivel', 'O comentário não pôde ser gerado agora.', 503);
  }
  const comentario = corpo.content?.find((b) => b.type === 'text')?.text?.trim();
  if (!comentario || corpo.stop_reason === 'refusal') throw new ErroAnalise('resposta_vazia', 'O comentário não pôde ser gerado agora.', 502);
  return {
    comentario,
    uso: { entrada: corpo.usage?.input_tokens ?? 0, saida: corpo.usage?.output_tokens ?? 0 },
    modelo,
  };
}

/** Comentário por regras simples, para o modo sem IA. */
export function simularComentario(d: DadosCoaching): string {
  const { atual, dia, meta, restante, hora } = resumoDoDia(d);
  const partes: string[] = [];

  if (restante < 0) {
    partes.push(`Hoje passou cerca de ${-restante} kcal da meta, e tudo bem: um dia não define nada. Amanhã segue normal, sem precisar compensar.`);
  } else if (hora < 16) {
    partes.push(`Registrado! Até agora são cerca de ${n(dia.kcal_provavel)} de ${n(meta)} kcal, então ainda sobra espaço (~${restante} kcal) para o resto do dia.`);
  } else if (restante > meta * 0.35) {
    partes.push(`Você está em cerca de ${n(dia.kcal_provavel)} de ${n(meta)} kcal. Ainda cabem uns ${restante} kcal: se bater fome mais tarde, coma sem medo.`);
  } else {
    partes.push(`Dia bem encaminhado: cerca de ${n(dia.kcal_provavel)} de ${n(meta)} kcal, restando uns ${restante}.`);
  }

  if (restante >= 0 && atual.proteina_g < 15) {
    partes.push('Se der, inclua uma fonte de proteína na próxima refeição: ajuda a segurar a fome.');
  }
  return partes.join(' ');
}
