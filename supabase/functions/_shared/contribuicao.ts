/**
 * Base coletiva: o que entra e como o contribuinte é pseudonimizado.
 * Só entram porções em que o usuário informou o peso (ajuste de gramas).
 */
import type { ItemEstimado } from './estimativa.ts';

export type Contribuicao = {
  contribuinte: string;
  alimento: string;
  preparo: string | null;
  gramas_estimadas: number | null;
  gramas_confirmadas: number;
  kcal_por_100g: number | null;
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Itens com peso informado pelo usuário: porção "123 g" e diferente da primeira estimativa. */
export function selecionarContribuicoes(
  original: { itens?: ItemEstimado[] } | null | undefined,
  confirmados: ItemEstimado[],
  contribuinte: string,
): Contribuicao[] {
  return confirmados
    .filter((i) => /^\d+ g$/.test(i.porcao) && i.gramas > 0)
    .map((i) => {
      const antes = original?.itens?.find((o) => normalizar(o.nome) === normalizar(i.nome));
      return { item: i, antes };
    })
    .filter(({ item, antes }) => !antes || antes.gramas !== item.gramas)
    .map(({ item, antes }) => ({
      contribuinte,
      alimento: normalizar(item.nome).slice(0, 80),
      preparo: item.preparo ? normalizar(item.preparo).slice(0, 80) : null,
      gramas_estimadas: antes?.gramas ? Math.round(antes.gramas * 10) / 10 : null,
      gramas_confirmadas: Math.round(item.gramas * 10) / 10,
      kcal_por_100g: item.gramas > 0 ? Math.round((item.kcal_provavel / item.gramas) * 1000) / 10 : null,
    }));
}

/** Código pseudônimo do usuário: SHA-256 de "sal:id". Sem o sal, não dá para voltar ao id. */
export async function codigoContribuinte(usuarioId: string, sal: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${sal}:${usuarioId}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
