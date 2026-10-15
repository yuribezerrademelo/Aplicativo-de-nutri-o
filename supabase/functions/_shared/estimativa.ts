/**
 * Estrutura de uma estimativa e cálculos sobre ela.
 *
 * Módulo leve e sem dependências: usado pela edge function, pelo simulador,
 * pelo script de avaliação e também pelo app (por exemplo, ao ajustar as gramas
 * de um item), sem arrastar o prompt para dentro do aplicativo.
 */
export type Confianca = 'alta' | 'media' | 'baixa';

export type ItemEstimado = {
  nome: string;
  porcao: string;
  gramas: number;
  preparo: string;
  kcal_min: number;
  kcal_provavel: number;
  kcal_max: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number;
  confianca: Confianca;
};

export type Pergunta = { pergunta: string; opcoes: string[] };

/** O que o modelo devolve. */
export type SaidaModelo = {
  reconhecido: boolean;
  itens: ItemEstimado[];
  suposicoes: string[];
  perguntas: Pergunta[];
  observacao: string;
};

export type Totais = {
  kcal_min: number;
  kcal_provavel: number;
  kcal_max: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number;
};

/** O que o app recebe: a saída do modelo já validada, mais os totais calculados em código. */
export type ResultadoAnalise = SaidaModelo & {
  total: Totais;
  /** Verdadeiro quando veio do modo simulado (sem IA), para o app avisar o usuário. */
  simulado?: boolean;
};

/* ------------------------------------------------------------------ */
/* Saída                                                               */
/* ------------------------------------------------------------------ */

const numeroSeguro = (v: unknown, casas = 1) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

const textoSeguro = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Garante números válidos e min ≤ provável ≤ max em cada item. */
export function normalizarItem(item: ItemEstimado): ItemEstimado {
  const [kcal_min, kcal_provavel, kcal_max] = [item.kcal_min, item.kcal_provavel, item.kcal_max]
    .map((v) => numeroSeguro(v, 0))
    .sort((a, b) => a - b);
  const confianca: Confianca = ['alta', 'media', 'baixa'].includes(item.confianca) ? item.confianca : 'media';
  return {
    nome: textoSeguro(item.nome) || 'Item',
    porcao: textoSeguro(item.porcao),
    gramas: numeroSeguro(item.gramas, 0),
    preparo: textoSeguro(item.preparo),
    kcal_min,
    kcal_provavel,
    kcal_max,
    proteina_g: numeroSeguro(item.proteina_g),
    carboidrato_g: numeroSeguro(item.carboidrato_g),
    gordura_g: numeroSeguro(item.gordura_g),
    fibra_g: numeroSeguro(item.fibra_g),
    confianca,
  };
}

/**
 * Soma os itens. O provável é a soma simples; a faixa combina as incertezas
 * dos itens como erros independentes (raiz da soma dos quadrados), em vez de
 * somar todos os mínimos e máximos, o que exageraria a margem do prato.
 */
export function calcularTotais(itens: ItemEstimado[]): Totais {
  const soma = (f: (i: ItemEstimado) => number) => itens.reduce((acc, i) => acc + f(i), 0);
  const provavel = soma((i) => i.kcal_provavel);
  const abaixo = Math.sqrt(soma((i) => (i.kcal_provavel - i.kcal_min) ** 2));
  const acima = Math.sqrt(soma((i) => (i.kcal_max - i.kcal_provavel) ** 2));
  const um = (n: number) => Math.round(n * 10) / 10;
  return {
    kcal_min: Math.max(0, Math.round(provavel - abaixo)),
    kcal_provavel: Math.round(provavel),
    kcal_max: Math.round(provavel + acima),
    proteina_g: um(soma((i) => i.proteina_g)),
    carboidrato_g: um(soma((i) => i.carboidrato_g)),
    gordura_g: um(soma((i) => i.gordura_g)),
    fibra_g: um(soma((i) => i.fibra_g)),
  };
}

export function normalizarResultado(saida: SaidaModelo & { simulado?: boolean }): ResultadoAnalise {
  const reconhecido = saida.reconhecido !== false;
  const itens = reconhecido && Array.isArray(saida.itens) ? saida.itens.map(normalizarItem) : [];
  const listaDeTextos = (v: unknown) => (Array.isArray(v) ? v.map(textoSeguro).filter(Boolean) : []);
  const perguntas = Array.isArray(saida.perguntas)
    ? saida.perguntas
        .map((p) => ({ pergunta: textoSeguro(p?.pergunta), opcoes: listaDeTextos(p?.opcoes).slice(0, 4) }))
        .filter((p) => p.pergunta)
        .slice(0, 3)
    : [];
  return {
    reconhecido,
    itens,
    suposicoes: listaDeTextos(saida.suposicoes),
    perguntas,
    observacao: textoSeguro(saida.observacao),
    total: calcularTotais(itens),
    ...(saida.simulado ? { simulado: true } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Ajustes feitos pelo usuário                                         */
/* ------------------------------------------------------------------ */

/**
 * O usuário informou o peso real de um item: escala calorias e macros na mesma
 * proporção. Como a porção deixa de ser incerteza, a faixa encolhe para no
 * máximo ±15% (sobra a incerteza de composição e preparo) e a confiança vira alta.
 */
export function ajustarGramas(item: ItemEstimado, gramas: number): ItemEstimado {
  if (!(gramas > 0) || !(item.gramas > 0)) return item;
  const fator = gramas / item.gramas;
  const provavel = item.kcal_provavel * fator;
  const metadeRelativa = (lado: number) =>
    item.kcal_provavel > 0 ? Math.min(Math.abs(lado - item.kcal_provavel) / item.kcal_provavel, 0.15) : 0;
  const um = (n: number) => Math.round(n * fator * 10) / 10;
  return {
    ...item,
    gramas: Math.round(gramas),
    porcao: `${Math.round(gramas)} g`,
    kcal_min: Math.round(provavel * (1 - metadeRelativa(item.kcal_min))),
    kcal_provavel: Math.round(provavel),
    kcal_max: Math.round(provavel * (1 + metadeRelativa(item.kcal_max))),
    proteina_g: um(item.proteina_g),
    carboidrato_g: um(item.carboidrato_g),
    gordura_g: um(item.gordura_g),
    fibra_g: um(item.fibra_g),
    confianca: 'alta',
  };
}

/** Substitui os itens de um resultado e recalcula os totais. */
export function comItens(resultado: ResultadoAnalise, itens: ItemEstimado[]): ResultadoAnalise {
  return { ...resultado, itens, total: calcularTotais(itens) };
}
