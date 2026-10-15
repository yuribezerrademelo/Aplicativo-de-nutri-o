/**
 * Motor de análise de refeições.
 *
 * TypeScript puro (sem APIs do Deno ou do Node): roda dentro da edge function
 * e também no script de avaliação local, garantindo que os dois usem o mesmo código.
 */
import { PROMPT_ANALISE } from './prompt-analise.ts';

import {
  normalizarResultado,
  type ResultadoAnalise,
  type SaidaModelo,
} from './estimativa.ts';

export * from './estimativa.ts';

export type TipoImagem = 'image/jpeg' | 'image/png' | 'image/webp';

export type EntradaAnalise = {
  imagem?: { base64: string; tipo: TipoImagem };
  /** Descrição da refeição ou complemento à foto. */
  texto?: string;
  /** Resultado anterior, quando o usuário está refinando. */
  anterior?: ResultadoAnalise;
  /** O que o usuário especificou para refinar. */
  correcao?: string;
};

export type TipoAnalise = 'foto' | 'texto' | 'refinamento';

export type OpcoesAnalise = {
  apiKey: string;
  modelo?: string;
  esforco?: 'low' | 'medium' | 'high';
  /** Permite simular a API nos testes. */
  fetch?: typeof fetch;
};

export type UsoTokens = { entrada: number; saida: number };

export const MODELO_PADRAO = 'claude-sonnet-5-5';
export const ESFORCO_PADRAO = 'medium';

const LIMITE_BASE64 = 7_000_000; // ~5 MB de imagem
const LIMITE_TEXTO = 2000;
const LIMITE_CORRECAO = 1000;
const TIPOS_IMAGEM: TipoImagem[] = ['image/jpeg', 'image/png', 'image/webp'];

export class ErroAnalise extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensagem: string, status: number) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/* Schema da resposta (formato aceito pelos structured outputs)        */
/* ------------------------------------------------------------------ */

const numero = (description: string) => ({ type: 'number', description });

export const SCHEMA_SAIDA = {
  type: 'object',
  properties: {
    reconhecido: { type: 'boolean', description: 'false se a entrada não mostra nem descreve comida ou bebida' },
    itens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          porcao: { type: 'string', description: 'medida caseira, ex.: 2 escumadeiras' },
          gramas: numero('peso estimado em gramas (ml para bebidas)'),
          preparo: { type: 'string', description: 'preparo assumido, ex.: grelhado com fio de óleo' },
          kcal_min: numero('limite inferior da faixa'),
          kcal_provavel: numero('valor mais provável'),
          kcal_max: numero('limite superior da faixa'),
          proteina_g: numero('gramas de proteína no valor provável'),
          carboidrato_g: numero('gramas de carboidrato no valor provável'),
          gordura_g: numero('gramas de gordura no valor provável'),
          fibra_g: numero('gramas de fibra no valor provável'),
          confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        },
        required: [
          'nome',
          'porcao',
          'gramas',
          'preparo',
          'kcal_min',
          'kcal_provavel',
          'kcal_max',
          'proteina_g',
          'carboidrato_g',
          'gordura_g',
          'fibra_g',
          'confianca',
        ],
        additionalProperties: false,
      },
    },
    suposicoes: { type: 'array', items: { type: 'string' } },
    perguntas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pergunta: { type: 'string' },
          opcoes: { type: 'array', items: { type: 'string' } },
        },
        required: ['pergunta', 'opcoes'],
        additionalProperties: false,
      },
    },
    observacao: { type: 'string' },
  },
  required: ['reconhecido', 'itens', 'suposicoes', 'perguntas', 'observacao'],
  additionalProperties: false,
} as const;

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const textoOuNada = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Valida o corpo recebido pela função. Lança ErroAnalise (400) se algo estiver errado. */
export function validarEntrada(bruto: unknown): EntradaAnalise {
  const invalida = (msg: string) => new ErroAnalise('entrada_invalida', msg, 400);
  if (!ehObjeto(bruto)) throw invalida('Corpo da requisição inválido.');

  const entrada: EntradaAnalise = {};

  if (bruto.imagem !== undefined) {
    const img = bruto.imagem;
    if (!ehObjeto(img) || typeof img.base64 !== 'string' || !img.base64) throw invalida('Imagem inválida.');
    if (!TIPOS_IMAGEM.includes(img.tipo as TipoImagem)) throw invalida('Formato de imagem não suportado (use JPEG, PNG ou WebP).');
    if (img.base64.length > LIMITE_BASE64) throw invalida('Imagem grande demais. Tente uma foto menor.');
    entrada.imagem = { base64: img.base64, tipo: img.tipo as TipoImagem };
  }

  entrada.texto = textoOuNada(bruto.texto);
  if (entrada.texto && entrada.texto.length > LIMITE_TEXTO) throw invalida('Descrição longa demais.');

  entrada.correcao = textoOuNada(bruto.correcao);
  if (entrada.correcao && entrada.correcao.length > LIMITE_CORRECAO) throw invalida('Especificação longa demais.');

  if (bruto.anterior !== undefined) {
    if (!ehObjeto(bruto.anterior) || !Array.isArray(bruto.anterior.itens)) throw invalida('Análise anterior inválida.');
    entrada.anterior = normalizarResultado(bruto.anterior as unknown as SaidaModelo);
  }

  if (!entrada.imagem && !entrada.texto) throw invalida('Envie uma foto ou uma descrição da refeição.');
  if (entrada.correcao && !entrada.anterior) throw invalida('Para refinar, envie também a análise anterior.');
  if (entrada.anterior && !entrada.correcao) throw invalida('Conte o que quer especificar sobre o prato.');

  return entrada;
}

export function tipoDaEntrada(e: EntradaAnalise): TipoAnalise {
  if (e.anterior) return 'refinamento';
  return e.imagem ? 'foto' : 'texto';
}

/** Monta a conversa enviada ao modelo. O refinamento vira um turno extra. */
export function montarMensagens(e: EntradaAnalise) {
  const conteudo: Record<string, unknown>[] = [];
  if (e.imagem) {
    conteudo.push({ type: 'image', source: { type: 'base64', media_type: e.imagem.tipo, data: e.imagem.base64 } });
  }

  let pedido: string;
  if (e.imagem && e.texto) pedido = `Analise a refeição da foto. O usuário acrescentou:\n<descricao>${e.texto}</descricao>`;
  else if (e.imagem) pedido = 'Analise a refeição da foto.';
  else pedido = `Analise a refeição descrita pelo usuário (sem foto):\n<descricao>${e.texto}</descricao>`;
  conteudo.push({ type: 'text', text: pedido });

  const mensagens: { role: 'user' | 'assistant'; content: unknown }[] = [{ role: 'user', content: conteudo }];

  if (e.anterior && e.correcao) {
    const { total: _total, ...saidaAnterior } = e.anterior;
    mensagens.push({ role: 'assistant', content: JSON.stringify(saidaAnterior) });
    mensagens.push({
      role: 'user',
      content: `O usuário especificou sobre o prato:\n<especificacao>${e.correcao}</especificacao>\nRefaça a análise completa incorporando essa informação.`,
    });
  }
  return mensagens;
}

/* ------------------------------------------------------------------ */
/* Chamada à Claude API                                                */
/* ------------------------------------------------------------------ */

type RespostaApi = {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { type?: string; message?: string };
};

export async function analisarRefeicao(
  entrada: EntradaAnalise,
  opcoes: OpcoesAnalise,
): Promise<{ resultado: ResultadoAnalise; uso: UsoTokens; modelo: string }> {
  const modelo = opcoes.modelo || MODELO_PADRAO;
  const fazerFetch = opcoes.fetch ?? fetch;

  const resposta = await fazerFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opcoes.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 16000, // inclui o raciocínio do modelo
      system: PROMPT_ANALISE,
      messages: montarMensagens(entrada),
      output_config: {
        effort: opcoes.esforco || ESFORCO_PADRAO,
        format: { type: 'json_schema', schema: SCHEMA_SAIDA },
      },
    }),
  });

  const corpo = (await resposta.json().catch(() => ({}))) as RespostaApi;

  if (!resposta.ok) {
    const detalhe = corpo.error?.message ?? `HTTP ${resposta.status}`;
    if (resposta.status === 401 || resposta.status === 403)
      throw new ErroAnalise('configuracao', `Chave da Claude API inválida (${detalhe}).`, 500);
    if (resposta.status === 429 || resposta.status === 529 || resposta.status >= 500)
      throw new ErroAnalise('ia_indisponivel', 'O serviço de análise está ocupado agora. Tente de novo em instantes.', 503);
    throw new ErroAnalise('erro_api', `A análise falhou: ${detalhe}`, 502);
  }

  if (corpo.stop_reason === 'refusal')
    throw new ErroAnalise('recusado', 'Não foi possível analisar essa entrada.', 422);
  if (corpo.stop_reason === 'max_tokens')
    throw new ErroAnalise('resposta_incompleta', 'A análise ficou incompleta. Tente de novo.', 502);

  // A resposta pode trazer blocos de raciocínio antes do texto com o JSON.
  const texto = corpo.content?.find((b) => b.type === 'text')?.text;
  if (!texto) throw new ErroAnalise('resposta_vazia', 'A análise voltou vazia. Tente de novo.', 502);

  let saida: SaidaModelo;
  try {
    saida = JSON.parse(texto);
  } catch {
    throw new ErroAnalise('resposta_invalida', 'A análise voltou num formato inesperado. Tente de novo.', 502);
  }

  return {
    resultado: normalizarResultado(saida),
    uso: { entrada: corpo.usage?.input_tokens ?? 0, saida: corpo.usage?.output_tokens ?? 0 },
    modelo,
  };
}
