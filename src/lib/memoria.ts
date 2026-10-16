import { supabase } from './supabase';
import {
  descreverVies,
  resumirHistorico,
  type Memoria,
  type RefeicaoHistorico,
  type ResumoHistorico,
} from '../../supabase/functions/_shared/memoria.ts';

export { descreverVies, type Memoria, type ResumoHistorico };

export type MemoriaSalva = Memoria & { id: string; atualizado_em: string };

export async function carregarMemoria(): Promise<{ memorias: MemoriaSalva[]; resumo: ResumoHistorico } | { erro: string }> {
  const trintaDias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [memorias, historico] = await Promise.all([
    supabase.from('memorias').select('id, texto, origem, chave, dados, atualizado_em').order('atualizado_em', { ascending: false }),
    supabase
      .from('refeicoes')
      .select('kcal_provavel, itens, analise_original')
      .gte('consumida_em', trintaDias)
      .order('consumida_em', { ascending: false })
      .limit(60),
  ]);
  if (memorias.error || historico.error) return { erro: 'Não foi possível carregar sua memória.' };
  return {
    memorias: (memorias.data ?? []) as MemoriaSalva[],
    resumo: resumirHistorico((historico.data ?? []) as RefeicaoHistorico[]),
  };
}

export async function adicionarFato(texto: string): Promise<string | null> {
  const limpo = texto.trim();
  if (limpo.length < 3) return 'Escreva um pouco mais.';
  if (limpo.length > 300) return 'Use no máximo 300 caracteres.';
  const { error } = await supabase.from('memorias').insert({ texto: limpo, origem: 'manual' });
  return error ? 'Não foi possível salvar.' : null;
}

export async function apagarFato(id: string): Promise<string | null> {
  const { error } = await supabase.from('memorias').delete().eq('id', id);
  return error ? 'Não foi possível apagar.' : null;
}
