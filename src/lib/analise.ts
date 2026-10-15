import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from './supabase';
// Os tipos vêm do mesmo módulo usado pela edge function, para os dois lados nunca divergirem.
import type { EntradaAnalise, ResultadoAnalise } from '../../supabase/functions/_shared/analise.ts';

export type { EntradaAnalise, ItemEstimado, Pergunta, ResultadoAnalise } from '../../supabase/functions/_shared/analise.ts';

type Resposta = { resultado: ResultadoAnalise; erro?: undefined } | { resultado?: undefined; erro: string };

/** Chama a edge function analisar-refeicao. Nunca lança: devolve o resultado ou uma mensagem de erro. */
export async function analisarRefeicao(entrada: EntradaAnalise): Promise<Resposta> {
  const { data, error } = await supabase.functions.invoke<{ resultado: ResultadoAnalise }>('analisar-refeicao', {
    body: entrada,
  });

  if (!error && data?.resultado) return { resultado: data.resultado };

  if (error instanceof FunctionsHttpError) {
    const corpo = await error.context.json().catch(() => null);
    return { erro: corpo?.erro?.mensagem ?? 'A análise falhou. Tente de novo.' };
  }
  if (error instanceof FunctionsFetchError) return { erro: 'Sem conexão com o servidor. Verifique sua internet.' };
  return { erro: 'A análise falhou. Tente de novo.' };
}
