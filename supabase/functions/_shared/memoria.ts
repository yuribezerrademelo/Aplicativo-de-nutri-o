/**
 * Memória do usuário: aprender com as correções e devolver isso como contexto.
 *
 * Módulo puro (sem rede, sem prompt): usado pelas edge functions e também pelo app,
 * que mostra o histórico e o viés na tela "Minha memória".
 */
import { ajustarGramas, comItens, type ItemEstimado, type ResultadoAnalise } from './estimativa.ts';

export type Memoria = {
  id?: string;
  texto: string;
  origem: 'automatica' | 'manual';
  chave: string | null;
  dados?: { alimento?: string; gramas?: number } | null;
};

/** Fato novo ou atualizado, a ser gravado com upsert por (usuario_id, chave). */
export type FatoAprendido = { chave: string; texto: string; dados: { alimento: string; gramas: number } };

/** O que a análise precisa de cada refeição passada. */
export type RefeicaoHistorico = {
  kcal_provavel: number;
  itens: ItemEstimado[];
  analise_original?: { itens?: ItemEstimado[]; total?: { kcal_provavel?: number } } | null;
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const fmt = (n: number) => String(Math.round(n));

/* ------------------------------------------------------------------ */
/* Aprender                                                            */
/* ------------------------------------------------------------------ */

/**
 * Compara a estimativa original com o que o usuário confirmou. Quando a porção
 * de um item mudou bastante (25% ou mais), vira um fato sobre o tamanho das
 * porções daquele alimento.
 */
export function aprenderComCorrecoes(original: { itens?: ItemEstimado[] } | null | undefined, confirmados: ItemEstimado[]): FatoAprendido[] {
  if (!original?.itens?.length) return [];
  const fatos: FatoAprendido[] = [];
  for (const final of confirmados) {
    const antes = original.itens.find((i) => normalizar(i.nome) === normalizar(final.nome));
    if (!antes || !(antes.gramas > 0) || !(final.gramas > 0)) continue;
    const variacao = final.gramas / antes.gramas - 1;
    if (Math.abs(variacao) < 0.25) continue;
    fatos.push({
      chave: `porcao:${normalizar(final.nome)}`,
      texto: `${final.nome}: suas porções costumam ter cerca de ${fmt(final.gramas)} g (a primeira estimativa foi de ${fmt(antes.gramas)} g).`,
      dados: { alimento: final.nome, gramas: Math.round(final.gramas) },
    });
  }
  return fatos;
}

/* ------------------------------------------------------------------ */
/* Resumir o histórico                                                  */
/* ------------------------------------------------------------------ */

export type ResumoHistorico = {
  frequentes: { nome: string; vezes: number; gramasMediana: number; preparo: string }[];
  /** Confirmado ÷ estimativa inicial, em kcal. 0.8 = o usuário confirma 20% menos. */
  vies: { razao: number; refeicoes: number } | null;
};

const mediana = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function resumirHistorico(refeicoes: RefeicaoHistorico[]): ResumoHistorico {
  const porAlimento = new Map<string, { nome: string; gramas: number[]; preparos: Map<string, number> }>();
  for (const r of refeicoes) {
    for (const i of r.itens ?? []) {
      const k = normalizar(i.nome);
      const atual: { nome: string; gramas: number[]; preparos: Map<string, number> } = porAlimento.get(k) ?? {
        nome: i.nome,
        gramas: [],
        preparos: new Map(),
      };
      if (i.gramas > 0) atual.gramas.push(i.gramas);
      if (i.preparo) atual.preparos.set(i.preparo, (atual.preparos.get(i.preparo) ?? 0) + 1);
      porAlimento.set(k, atual);
    }
  }
  const frequentes = [...porAlimento.values()]
    .filter((a) => a.gramas.length >= 2)
    .map((a) => ({
      nome: a.nome,
      vezes: a.gramas.length,
      gramasMediana: Math.round(mediana(a.gramas)),
      preparo: [...a.preparos.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '',
    }))
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, 6);

  const comOriginal = refeicoes.filter((r) => (r.analise_original?.total?.kcal_provavel ?? 0) > 0);
  const somaOriginal = comOriginal.reduce((s, r) => s + Number(r.analise_original!.total!.kcal_provavel), 0);
  const somaFinal = comOriginal.reduce((s, r) => s + Number(r.kcal_provavel), 0);
  const vies = comOriginal.length >= 3 && somaOriginal > 0 ? { razao: somaFinal / somaOriginal, refeicoes: comOriginal.length } : null;

  return { frequentes, vies };
}

/** Texto do viés para pessoas e para a IA; nulo quando a diferença é pequena. */
export function descreverVies(vies: ResumoHistorico['vies']): string | null {
  if (!vies) return null;
  const diferenca = Math.round((vies.razao - 1) * 100);
  if (Math.abs(diferenca) < 10) return null;
  return diferenca < 0
    ? `Nas últimas ${vies.refeicoes} refeições, o valor confirmado ficou em média ${-diferenca}% abaixo da primeira estimativa.`
    : `Nas últimas ${vies.refeicoes} refeições, o valor confirmado ficou em média ${diferenca}% acima da primeira estimativa.`;
}

/* ------------------------------------------------------------------ */
/* Contexto para a análise                                             */
/* ------------------------------------------------------------------ */

export function montarContextoUsuario(memorias: Memoria[], resumo: ResumoHistorico): string | undefined {
  const linhas: string[] = [];
  if (memorias.length) {
    linhas.push('Fatos sobre os hábitos do usuário:');
    for (const m of memorias) linhas.push(`- ${m.texto}`);
  }
  if (resumo.frequentes.length) {
    linhas.push('Alimentos frequentes nas refeições confirmadas (peso mediano):');
    for (const f of resumo.frequentes) {
      linhas.push(`- ${f.nome}: ${f.vezes} vezes, ~${f.gramasMediana} g${f.preparo ? `, geralmente ${f.preparo}` : ''}`);
    }
  }
  const vies = descreverVies(resumo.vies);
  if (vies) linhas.push(vies);
  return linhas.length ? linhas.join('\n') : undefined;
}

/** No modo simulado, aplica as porções lembradas aos itens correspondentes. */
export function aplicarMemoriaNoSimulado(resultado: ResultadoAnalise, memorias: Memoria[]): ResultadoAnalise {
  const porcoes = memorias.filter((m) => m.dados?.alimento && (m.dados.gramas ?? 0) > 0);
  if (!porcoes.length) return resultado;
  const usadas: string[] = [];
  const itens = resultado.itens.map((item) => {
    const m = porcoes.find((p) => normalizar(p.dados!.alimento!) === normalizar(item.nome));
    if (!m || item.gramas === m.dados!.gramas) return item;
    usadas.push(m.dados!.alimento!);
    return { ...ajustarGramas(item, m.dados!.gramas!), confianca: 'media' as const };
  });
  if (!usadas.length) return resultado;
  return {
    ...comItens(resultado, itens),
    suposicoes: [...resultado.suposicoes, `Usei a porção que você costuma confirmar para: ${usadas.join(', ')}.`],
  };
}
