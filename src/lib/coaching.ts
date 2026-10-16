import { FunctionsHttpError } from '@supabase/supabase-js';

import { horaDe, inicioDoDia } from './formatos';
import { supabase } from './supabase';

type Resposta = { comentario: string; simulado: boolean } | { erro: string };

/**
 * Pede o comentário do coach para uma refeição já salva, no contexto do dia em que
 * ela aconteceu. Para um dia anterior, o "horário" do contexto é o da própria refeição.
 */
export async function comentarRefeicao(refeicaoId: string, consumidaEm: Date): Promise<Resposta> {
  const agora = new Date();
  const inicioDia = inicioDoDia(consumidaEm);
  const mesmoDia = inicioDia.getTime() === inicioDoDia(agora).getTime();
  const horaLocal = horaDe(mesmoDia ? agora : consumidaEm);

  const { data, error } = await supabase.functions.invoke<{ comentario: string; simulado: boolean }>('comentar-refeicao', {
    body: { refeicao_id: refeicaoId, inicio_dia: inicioDia.toISOString(), hora_local: horaLocal },
  });
  if (!error && data?.comentario) return data;

  if (error instanceof FunctionsHttpError && error.context.status === 404) {
    const corpo = await error.context.json().catch(() => null);
    if (!corpo?.erro) return { erro: 'O coach ainda não foi publicado no Supabase.' };
  }
  return { erro: 'O comentário não pôde ser gerado agora.' };
}
