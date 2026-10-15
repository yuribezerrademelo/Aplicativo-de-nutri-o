/**
 * Cálculo do gasto calórico e da meta diária.
 * Funções puras, sem dependências, para poderem ser testadas isoladamente.
 */

export type Sexo = 'masculino' | 'feminino';
export type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso';
export type Objetivo = 'perder' | 'manter' | 'ganhar';
export type Ritmo = 'leve' | 'moderado' | 'acelerado';
export type MetodoTmb = 'avaliacao' | 'katch_mcardle' | 'mifflin';

export const FATOR_ATIVIDADE: Record<NivelAtividade, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

/** Ajuste sobre o gasto total: negativo = déficit, positivo = superávit. */
export const AJUSTE_POR_RITMO: Record<'perder' | 'ganhar', Record<Ritmo, number>> = {
  perder: { leve: -0.1, moderado: -0.15, acelerado: -0.2 },
  ganhar: { leve: 0.05, moderado: 0.1, acelerado: 0.15 },
};

export const IDADE_MINIMA = 18;
export const IDADE_MAXIMA = 100;

export type DadosMetabolicos = {
  sexo: Sexo;
  idade: number;
  alturaCm: number;
  pesoKg: number;
  nivelAtividade: NivelAtividade;
  objetivo: Objetivo;
  ritmo?: Ritmo | null;
  /** TMB medida em avaliação física / bioimpedância (prioridade máxima). */
  tmbMedida?: number | null;
  /** % de gordura corporal, se conhecido (permite usar Katch-McArdle). */
  percentualGordura?: number | null;
};

export type CalculoMeta = {
  tmb: number;
  metodoTmb: MetodoTmb;
  fatorAtividade: number;
  gastoTotal: number;
  /** Ex.: -0.15 para déficit de 15%; 0 para manutenção. */
  ajuste: number;
  metaCalculada: number;
  /** Verdadeiro quando o déficit escolhido levaria a meta abaixo da TMB. */
  limitadaPelaTmb: boolean;
};

/** Idade em anos completos na data de referência. */
export function calcularIdade(nascimento: Date, hoje: Date = new Date()): number {
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

/** Mifflin-St Jeor: a fórmula mais usada para adultos sem dados de composição corporal. */
export function tmbMifflin(sexo: Sexo, pesoKg: number, alturaCm: number, idade: number): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idade;
  return sexo === 'masculino' ? base + 5 : base - 161;
}

/** Katch-McArdle: usa a massa magra, mais precisa quando o % de gordura é conhecido. */
export function tmbKatchMcArdle(pesoKg: number, percentualGordura: number): number {
  const massaMagra = pesoKg * (1 - percentualGordura / 100);
  return 370 + 21.6 * massaMagra;
}

/** Escolhe a melhor TMB disponível: medida > Katch-McArdle > Mifflin-St Jeor. */
export function calcularTmb(d: DadosMetabolicos): { valor: number; metodo: MetodoTmb } {
  if (d.tmbMedida && d.tmbMedida > 0) {
    return { valor: Math.round(d.tmbMedida), metodo: 'avaliacao' };
  }
  if (d.percentualGordura && d.percentualGordura > 0) {
    return { valor: Math.round(tmbKatchMcArdle(d.pesoKg, d.percentualGordura)), metodo: 'katch_mcardle' };
  }
  return { valor: Math.round(tmbMifflin(d.sexo, d.pesoKg, d.alturaCm, d.idade)), metodo: 'mifflin' };
}

const arredondarDezena = (n: number) => Math.round(n / 10) * 10;

export function ajusteDoObjetivo(objetivo: Objetivo, ritmo?: Ritmo | null): number {
  if (objetivo === 'manter') return 0;
  return AJUSTE_POR_RITMO[objetivo][ritmo ?? 'moderado'];
}

export function calcularMeta(d: DadosMetabolicos): CalculoMeta {
  const { valor: tmb, metodo: metodoTmb } = calcularTmb(d);
  const fatorAtividade = FATOR_ATIVIDADE[d.nivelAtividade];
  const gastoTotal = Math.round(tmb * fatorAtividade);
  const ajuste = ajusteDoObjetivo(d.objetivo, d.ritmo);

  let metaCalculada = arredondarDezena(gastoTotal * (1 + ajuste));
  let limitadaPelaTmb = false;

  // Trava de segurança: um déficit nunca leva a meta abaixo do gasto basal.
  if (d.objetivo === 'perder' && metaCalculada < tmb) {
    metaCalculada = Math.ceil(tmb / 10) * 10;
    limitadaPelaTmb = true;
  }

  return { tmb, metodoTmb, fatorAtividade, gastoTotal, ajuste, metaCalculada, limitadaPelaTmb };
}
