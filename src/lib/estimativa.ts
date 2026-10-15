/**
 * Ponte para o módulo de estimativa compartilhado com a edge function.
 * Só importa o módulo leve (tipos e cálculos), nunca o prompt.
 */
export {
  ajustarGramas,
  calcularTotais,
  comItens,
  somarComFaixa,
  type Confianca,
  type ItemEstimado,
  type Pergunta,
  type ResultadoAnalise,
  type Totais,
} from '../../supabase/functions/_shared/estimativa.ts';
