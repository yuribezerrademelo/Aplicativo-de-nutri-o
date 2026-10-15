import { calcularIdade, type DadosMetabolicos, type MetodoTmb, type NivelAtividade, type Objetivo, type Ritmo, type Sexo } from './metabolismo';
import { isoParaData } from './formatos';

/** Linha da tabela public.perfis. */
export type Perfil = {
  id: string;
  nome: string | null;
  sexo: Sexo | null;
  data_nascimento: string | null; // AAAA-MM-DD
  altura_cm: number | null;
  peso_kg: number | null;
  nivel_atividade: NivelAtividade | null;
  tmb_medida_kcal: number | null;
  percentual_gordura: number | null;
  objetivo: Objetivo | null;
  ritmo: Ritmo | null;
  meta_kcal: number | null;
  meta_ajustada_manualmente: boolean;
};

/** Campos que o formulário grava (o id vem da sessão). */
export type DadosPerfil = Omit<Perfil, 'id'>;

/** O perfil está pronto quando tem tudo o que o cálculo da meta precisa. */
export function perfilCompleto(p: Perfil | null): p is Perfil & {
  sexo: Sexo;
  data_nascimento: string;
  altura_cm: number;
  peso_kg: number;
  nivel_atividade: NivelAtividade;
  objetivo: Objetivo;
  meta_kcal: number;
} {
  return !!(
    p &&
    p.sexo &&
    p.data_nascimento &&
    p.altura_cm &&
    p.peso_kg &&
    p.nivel_atividade &&
    p.objetivo &&
    p.meta_kcal
  );
}

export function dadosMetabolicosDoPerfil(p: Perfil): DadosMetabolicos | null {
  if (!perfilCompleto(p)) return null;
  return {
    sexo: p.sexo,
    idade: calcularIdade(isoParaData(p.data_nascimento)),
    alturaCm: Number(p.altura_cm),
    pesoKg: Number(p.peso_kg),
    nivelAtividade: p.nivel_atividade,
    objetivo: p.objetivo,
    ritmo: p.ritmo,
    tmbMedida: p.tmb_medida_kcal != null ? Number(p.tmb_medida_kcal) : null,
    percentualGordura: p.percentual_gordura != null ? Number(p.percentual_gordura) : null,
  };
}

/* Textos mostrados na interface */

export const OPCOES_SEXO: { valor: Sexo; titulo: string }[] = [
  { valor: 'feminino', titulo: 'Feminino' },
  { valor: 'masculino', titulo: 'Masculino' },
];

export const OPCOES_ATIVIDADE: { valor: NivelAtividade; titulo: string; descricao: string }[] = [
  { valor: 'sedentario', titulo: 'Sedentário', descricao: 'Pouco ou nenhum exercício, rotina mais sentada' },
  { valor: 'leve', titulo: 'Levemente ativo', descricao: 'Exercício leve de 1 a 3 vezes por semana' },
  { valor: 'moderado', titulo: 'Moderadamente ativo', descricao: 'Exercício moderado de 3 a 5 vezes por semana' },
  { valor: 'intenso', titulo: 'Muito ativo', descricao: 'Treino puxado de 6 a 7 vezes por semana' },
  { valor: 'muito_intenso', titulo: 'Extremamente ativo', descricao: 'Treino pesado diário ou trabalho físico intenso' },
];

export const OPCOES_OBJETIVO: { valor: Objetivo; titulo: string; descricao: string }[] = [
  { valor: 'perder', titulo: 'Perder peso', descricao: 'Comer um pouco abaixo do que você gasta' },
  { valor: 'manter', titulo: 'Manter o peso', descricao: 'Comer perto do que você gasta' },
  { valor: 'ganhar', titulo: 'Ganhar peso', descricao: 'Comer um pouco acima do que você gasta' },
];

export const OPCOES_RITMO: Record<'perder' | 'ganhar', { valor: Ritmo; titulo: string; descricao: string }[]> = {
  perder: [
    { valor: 'leve', titulo: 'Leve · 10% abaixo', descricao: 'Mais fácil de sustentar no dia a dia' },
    { valor: 'moderado', titulo: 'Moderado · 15% abaixo', descricao: 'Equilíbrio entre resultado e conforto' },
    { valor: 'acelerado', titulo: 'Acelerado · 20% abaixo', descricao: 'Resultado mais rápido, exige mais disciplina' },
  ],
  ganhar: [
    { valor: 'leve', titulo: 'Leve · 5% acima', descricao: 'Ganho mais limpo, com menos gordura' },
    { valor: 'moderado', titulo: 'Moderado · 10% acima', descricao: 'Bom ritmo para quem treina com regularidade' },
    { valor: 'acelerado', titulo: 'Acelerado · 15% acima', descricao: 'Para quem tem dificuldade em ganhar peso' },
  ],
};

export const DESCRICAO_METODO_TMB: Record<MetodoTmb, string> = {
  avaliacao: 'medida na sua avaliação física',
  katch_mcardle: 'calculada pelo seu % de gordura (Katch-McArdle)',
  mifflin: 'estimada por sexo, idade, altura e peso (Mifflin-St Jeor)',
};

export const TITULO_ATIVIDADE = Object.fromEntries(OPCOES_ATIVIDADE.map((o) => [o.valor, o.titulo])) as Record<
  NivelAtividade,
  string
>;
