/**
 * Modo simulado do motor de análise.
 *
 * Usado enquanto a chave da Claude API não está configurada: devolve estimativas
 * de exemplo, plausíveis e marcadas como simuladas, para o fluxo do app ser
 * construído e testado sem custo. Não tenta ser preciso.
 */
import type { EntradaAnalise } from './analise.ts';
import {
  ajustarGramas,
  normalizarResultado,
  type Confianca,
  type ItemEstimado,
  type Pergunta,
  type ResultadoAnalise,
} from './estimativa.ts';

type Referencia = {
  chave: RegExp;
  nome: string;
  porcao: string;
  gramas: number;
  preparo: string;
  proteina: boolean;
  /** kcal, proteína, carboidrato, gordura e fibra por 100 g (valores aproximados). */
  por100: [number, number, number, number, number];
};

const REFERENCIAS: Referencia[] = [
  { chave: /arroz/, nome: 'Arroz branco', porcao: '4 colheres de sopa', gramas: 100, preparo: 'cozido', proteina: false, por100: [128, 2.5, 28.1, 0.2, 1.6] },
  { chave: /feij[aã]o/, nome: 'Feijão carioca', porcao: '1 concha média', gramas: 100, preparo: 'cozido', proteina: false, por100: [76, 4.8, 13.6, 0.5, 8.5] },
  { chave: /cuscuz/, nome: 'Cuscuz de milho', porcao: '1 fatia média', gramas: 150, preparo: 'cozido no vapor', proteina: false, por100: [113, 2.2, 25.3, 0.7, 2.1] },
  { chave: /tapioca/, nome: 'Tapioca', porcao: '1 unidade média', gramas: 70, preparo: 'na frigideira, sem recheio', proteina: false, por100: [245, 0.2, 60, 0.1, 0.5] },
  { chave: /ovos?/, nome: 'Ovo', porcao: '2 unidades', gramas: 100, preparo: 'cozido', proteina: true, por100: [146, 13.3, 0.6, 9.5, 0] },
  { chave: /frango/, nome: 'Peito de frango', porcao: '1 filé médio', gramas: 120, preparo: 'grelhado', proteina: true, por100: [159, 32, 0, 2.5, 0] },
  { chave: /f[ií]gado/, nome: 'Fígado bovino', porcao: '1 bife médio', gramas: 100, preparo: 'grelhado', proteina: true, por100: [225, 29.9, 4.2, 9, 0] },
  { chave: /bife|carne/, nome: 'Bife bovino', porcao: '1 bife médio', gramas: 100, preparo: 'grelhado', proteina: true, por100: [219, 32, 0, 9.5, 0] },
  { chave: /calabresa|lingui[cç]a/, nome: 'Calabresa', porcao: '4 rodelas', gramas: 60, preparo: 'acebolada', proteina: true, por100: [300, 16, 1, 26, 0] },
  { chave: /macaxeira|mandioca|aipim/, nome: 'Macaxeira', porcao: '2 pedaços médios', gramas: 150, preparo: 'cozida', proteina: false, por100: [125, 0.6, 30.1, 0.3, 1.6] },
  { chave: /p[aã]es?\b|p[aã]o franc/, nome: 'Pão francês', porcao: '1 unidade', gramas: 50, preparo: 'puro', proteina: false, por100: [300, 8, 58.6, 3.1, 2.3] },
  { chave: /banana/, nome: 'Banana', porcao: '1 unidade', gramas: 70, preparo: 'in natura', proteina: false, por100: [98, 1.3, 26, 0.1, 2] },
  { chave: /farofa/, nome: 'Farofa', porcao: '2 colheres de sopa', gramas: 30, preparo: 'pronta', proteina: false, por100: [406, 2.1, 80.3, 9.1, 7.8] },
  { chave: /salada/, nome: 'Salada', porcao: '1 porção', gramas: 80, preparo: 'sem molho', proteina: false, por100: [15, 1, 3, 0.2, 2] },
  { chave: /caf[eé] com leite/, nome: 'Café com leite', porcao: '1 xícara', gramas: 200, preparo: 'com açúcar', proteina: false, por100: [45, 2, 5, 2, 0] },
  { chave: /refri|refrigerante/, nome: 'Refrigerante', porcao: '1 lata', gramas: 350, preparo: 'comum', proteina: false, por100: [39, 0, 10, 0, 0] },
];

const PRATO_DA_FOTO = ['arroz', 'feijão', 'frango', 'salada'];

const LARGURA: Record<Confianca, number> = { alta: 0.12, media: 0.25, baixa: 0.4 };

function criarItem(ref: Referencia, gramas = ref.gramas, confianca: Confianca = 'media', porcao = ref.porcao): ItemEstimado {
  const f = gramas / 100;
  const [kcal, p, c, g, fibra] = ref.por100;
  const provavel = kcal * f;
  return {
    nome: ref.nome,
    porcao,
    gramas,
    preparo: ref.preparo,
    kcal_min: Math.round(provavel * (1 - LARGURA[confianca])),
    kcal_provavel: Math.round(provavel),
    kcal_max: Math.round(provavel * (1 + LARGURA[confianca])),
    proteina_g: p * f,
    carboidrato_g: c * f,
    gordura_g: g * f,
    fibra_g: fibra * f,
    confianca,
  };
}

/** Lê "150 g de arroz" ou "2 ovos" no texto. */
function itensDoTexto(texto: string): ItemEstimado[] {
  const t = texto.toLowerCase();
  const itens: ItemEstimado[] = [];
  for (const ref of REFERENCIAS) {
    const achado = ref.chave.exec(t);
    if (!achado) continue;
    const antes = t.slice(Math.max(0, achado.index - 30), achado.index);
    const gramas = /(\d+)\s*(?:g|gramas)\s+(?:de\s+)?(?:\S+\s+)?$/.exec(antes);
    const unidades = /(\d+)\s+$/.exec(antes);
    if (gramas) itens.push(criarItem(ref, Number(gramas[1]), 'alta', `${gramas[1]} g`));
    else if (unidades && ['Ovo', 'Pão francês', 'Banana'].includes(ref.nome)) {
      const n = Number(unidades[1]);
      const porUnidade = ref.nome === 'Ovo' ? 50 : ref.gramas;
      itens.push(criarItem(ref, n * porUnidade, 'media', `${n} unidade${n > 1 ? 's' : ''}`));
    } else itens.push(criarItem(ref));
  }
  return itens;
}

function perguntasPara(itens: ItemEstimado[]): Pergunta[] {
  const perguntas: Pergunta[] = [];
  if (itens.some((i) => REFERENCIAS.find((r) => r.nome === i.nome)?.proteina))
    perguntas.push({ pergunta: 'Como a proteína foi preparada?', opcoes: ['Grelhada', 'Frita', 'Assada', 'Cozida'] });
  perguntas.push({ pergunta: 'Usou óleo ou manteiga no preparo?', opcoes: ['Não', 'Um fio', 'Bastante'] });
  perguntas.push({ pergunta: 'A porção era maior ou menor do que parece?', opcoes: ['Menor', 'Como estimado', 'Maior'] });
  return perguntas.slice(0, 3);
}

const OBSERVACAO = 'Estimativa simulada, sem IA: os números são de exemplo para testar o app.';

function escalar(item: ItemEstimado, fator: number, preparo?: string): ItemEstimado {
  const extraGordura = fator > 1 ? (item.kcal_provavel * (fator - 1)) / 9 : 0;
  return {
    ...item,
    preparo: preparo ?? item.preparo,
    kcal_min: Math.round(item.kcal_min * fator),
    kcal_provavel: Math.round(item.kcal_provavel * fator),
    kcal_max: Math.round(item.kcal_max * fator),
    gordura_g: fator > 1 ? item.gordura_g + extraGordura : item.gordura_g * fator,
  };
}

/** Aplica a especificação do usuário sobre a análise anterior, com regras simples. */
function refinar(anterior: ResultadoAnalise, correcao: string): ItemEstimado[] {
  const c = correcao.toLowerCase();
  const ehProteina = (i: ItemEstimado) => !!REFERENCIAS.find((r) => r.nome === i.nome)?.proteina;
  let itens = anterior.itens.map((i) => ({ ...i }));

  if (/frit[oa]/.test(c)) itens = itens.map((i) => (ehProteina(i) ? escalar(i, 1.35, 'frito') : i));
  else if (/grelhad|assad|cozid|sem [óo]leo/.test(c))
    itens = itens.map((i) => (ehProteina(i) ? escalar(i, 0.95, /assad/.test(c) ? 'assado' : 'grelhado') : i));

  if (/bastante|muito [óo]leo|muita manteiga/.test(c))
    itens.push({ nome: 'Óleo do preparo', porcao: '1 colher de sopa', gramas: 13, preparo: 'adicionado', kcal_min: 90, kcal_provavel: 115, kcal_max: 130, proteina_g: 0, carboidrato_g: 0, gordura_g: 13, fibra_g: 0, confianca: 'media' });
  if (/\bmenor\b/.test(c)) itens = itens.map((i) => escalar(i, 0.8));
  if (/\bmaior\b/.test(c)) itens = itens.map((i) => escalar(i, 1.2));

  // "150 g de arroz": o peso informado vira verdade para o item correspondente.
  for (const m of c.matchAll(/(\d+)\s*(?:g|gramas)\s+(?:de\s+)?([a-zà-ú]+)/g)) {
    const alvo = itens.findIndex((i) => i.nome.toLowerCase().includes(m[2].slice(0, 5)));
    if (alvo >= 0) itens[alvo] = ajustarGramas(itens[alvo], Number(m[1]));
  }
  return itens;
}

export async function simularAnalise(entrada: EntradaAnalise, atrasoMs = 800): Promise<ResultadoAnalise> {
  // Pequena espera para o app exercitar os estados de carregamento.
  if (atrasoMs > 0) await new Promise((r) => setTimeout(r, atrasoMs));

  if (entrada.anterior && entrada.correcao) {
    return normalizarResultado({
      reconhecido: true,
      itens: refinar(entrada.anterior, entrada.correcao),
      suposicoes: [...entrada.anterior.suposicoes, `Você informou: ${entrada.correcao}`],
      perguntas: [],
      observacao: OBSERVACAO,
      simulado: true,
    });
  }

  let itens = entrada.texto ? itensDoTexto(entrada.texto) : [];
  const suposicoes: string[] = [];

  if (!itens.length && entrada.imagem) {
    itens = PRATO_DA_FOTO.map((nome) => criarItem(REFERENCIAS.find((r) => r.chave.test(nome))!));
    suposicoes.push('Prato típico de exemplo: a foto não é analisada no modo simulado.');
  } else if (!itens.length) {
    itens = [
      {
        nome: 'Refeição descrita',
        porcao: '1 prato',
        gramas: 350,
        preparo: 'não identificado',
        kcal_min: 300,
        kcal_provavel: 500,
        kcal_max: 700,
        proteina_g: 25,
        carboidrato_g: 60,
        gordura_g: 17,
        fibra_g: 5,
        confianca: 'baixa',
      },
    ];
    suposicoes.push('Nenhum alimento conhecido pelo simulador foi encontrado no texto.');
  }

  return normalizarResultado({
    reconhecido: true,
    itens,
    suposicoes,
    perguntas: perguntasPara(itens),
    observacao: OBSERVACAO,
    simulado: true,
  });
}
