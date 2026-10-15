import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import type { ResultadoAnalise } from './estimativa';
import { supabase } from './supabase';

export type EntradaAnalise = {
  imagem?: { base64: string; tipo: 'image/jpeg' | 'image/png' | 'image/webp' };
  texto?: string;
  anterior?: ResultadoAnalise;
  correcao?: string;
};

type Resposta = { resultado: ResultadoAnalise; erro?: undefined } | { resultado?: undefined; erro: string };

/** Chama a edge function analisar-refeicao. Nunca lança: devolve o resultado ou uma mensagem de erro. */
export async function analisarRefeicao(entrada: EntradaAnalise): Promise<Resposta> {
  const { data, error } = await supabase.functions.invoke<{ resultado: ResultadoAnalise }>('analisar-refeicao', {
    body: entrada,
  });

  if (!error && data?.resultado) return { resultado: data.resultado };

  if (error instanceof FunctionsHttpError) {
    if (error.context.status === 404) return { erro: 'O serviço de análise ainda não foi publicado no Supabase.' };
    const corpo = await error.context.json().catch(() => null);
    return { erro: corpo?.erro?.mensagem ?? 'A análise falhou. Tente de novo.' };
  }
  if (error instanceof FunctionsFetchError) return { erro: 'Sem conexão com o servidor. Verifique sua internet.' };
  return { erro: 'A análise falhou. Tente de novo.' };
}
