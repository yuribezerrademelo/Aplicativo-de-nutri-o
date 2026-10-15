import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from './supabase';

type Resposta = { comentario: string; simulado: boolean } | { erro: string };

/** Pede o comentário do coach para uma refeição já salva, no contexto do dia de hoje. */
export async function comentarRefeicao(refeicaoId: string): Promise<Resposta> {
  const agora = new Date();
  const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const horaLocal = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

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
