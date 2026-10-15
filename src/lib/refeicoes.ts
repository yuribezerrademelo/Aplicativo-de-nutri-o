import { somarComFaixa, type ItemEstimado, type ResultadoAnalise } from './estimativa';
import { supabase } from './supabase';

export type TipoRefeicao = 'cafe_da_manha' | 'almoco' | 'lanche' | 'jantar' | 'ceia' | 'outro';

export type Refeicao = {
  id: string;
  tipo: TipoRefeicao;
  consumida_em: string;
  origem: 'foto' | 'texto';
  descricao: string | null;
  kcal_min: number;
  kcal_provavel: number;
  kcal_max: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number;
  itens: ItemEstimado[];
  simulada: boolean;
  comentario: string | null;
};

export const OPCOES_TIPO_REFEICAO: { valor: TipoRefeicao; titulo: string }[] = [
  { valor: 'cafe_da_manha', titulo: 'Café da manhã' },
  { valor: 'almoco', titulo: 'Almoço' },
  { valor: 'lanche', titulo: 'Lanche' },
  { valor: 'jantar', titulo: 'Jantar' },
  { valor: 'ceia', titulo: 'Ceia' },
  { valor: 'outro', titulo: 'Outro' },
];

export const TITULO_TIPO_REFEICAO = Object.fromEntries(OPCOES_TIPO_REFEICAO.map((o) => [o.valor, o.titulo])) as Record<
  TipoRefeicao,
  string
>;

/** Sugestão de tipo pelo horário (o usuário pode trocar). */
export function tipoPeloHorario(data = new Date()): TipoRefeicao {
  const h = data.getHours();
  if (h >= 5 && h < 10) return 'cafe_da_manha';
  if (h >= 10 && h < 15) return 'almoco';
  if (h >= 15 && h < 18) return 'lanche';
  if (h >= 18 && h < 22) return 'jantar';
  return 'ceia';
}

const numero = (v: unknown) => Number(v ?? 0);

function deLinha(linha: Record<string, unknown>): Refeicao {
  return {
    ...(linha as unknown as Refeicao),
    proteina_g: numero(linha.proteina_g),
    carboidrato_g: numero(linha.carboidrato_g),
    gordura_g: numero(linha.gordura_g),
    fibra_g: numero(linha.fibra_g),
  };
}

const COLUNAS =
  'id, tipo, consumida_em, origem, descricao, kcal_min, kcal_provavel, kcal_max, proteina_g, carboidrato_g, gordura_g, fibra_g, itens, simulada, comentario';

/** Refeições do dia (no fuso do aparelho), da mais antiga para a mais recente. */
export async function listarRefeicoesDoDia(dia = new Date()): Promise<{ refeicoes: Refeicao[] } | { erro: string }> {
  const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  const { data, error } = await supabase
    .from('refeicoes')
    .select(COLUNAS)
    .gte('consumida_em', inicio.toISOString())
    .lt('consumida_em', fim.toISOString())
    .order('consumida_em');
  if (error) return { erro: 'Não foi possível carregar as refeições de hoje.' };
  return { refeicoes: (data ?? []).map(deLinha) };
}

export async function salvarRefeicao(dados: {
  resultado: ResultadoAnalise;
  tipo: TipoRefeicao;
  origem: 'foto' | 'texto';
  descricao?: string;
}): Promise<{ id: string } | { erro: string }> {
  const { resultado, tipo, origem, descricao } = dados;
  const { total } = resultado;
  const { data, error } = await supabase.from('refeicoes').insert({
    tipo,
    origem,
    descricao: descricao?.trim() || null,
    kcal_min: total.kcal_min,
    kcal_provavel: total.kcal_provavel,
    kcal_max: total.kcal_max,
    proteina_g: total.proteina_g,
    carboidrato_g: total.carboidrato_g,
    gordura_g: total.gordura_g,
    fibra_g: total.fibra_g,
    itens: resultado.itens,
    analise: {
      suposicoes: resultado.suposicoes,
      observacao: resultado.observacao,
    },
    simulada: !!resultado.simulado,
  })
    .select('id')
    .single();
  if (error || !data) return { erro: 'Não foi possível salvar a refeição. Verifique sua conexão.' };
  return { id: data.id as string };
}

export async function apagarRefeicao(id: string): Promise<string | null> {
  const { error } = await supabase.from('refeicoes').delete().eq('id', id);
  return error ? 'Não foi possível apagar a refeição.' : null;
}

/** Soma do dia: provável somado; a faixa combina as margens das refeições como erros independentes. */
export const somarDia = (refeicoes: Refeicao[]) => somarComFaixa(refeicoes);
