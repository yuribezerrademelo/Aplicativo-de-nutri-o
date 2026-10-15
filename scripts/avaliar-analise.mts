/// <reference types="node" />
/**
 * Avalia o motor de análise contra casos de referência (avaliacao/casos/*.json).
 *
 *   npm run avaliar
 *   npm run avaliar -- --modelo=claude-haiku-5-5 --esforco=low
 *   npm run avaliar -- --caso=cuscuz
 *
 * Precisa da chave da Claude API em .env.avaliacao (ANTHROPIC_API_KEY=...).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

import {
  analisarRefeicao,
  ErroAnalise,
  ESFORCO_PADRAO,
  MODELO_PADRAO,
  type EntradaAnalise,
  type ResultadoAnalise,
  type TipoImagem,
} from '../supabase/functions/_shared/analise.ts';
import { VERSAO_PROMPT } from '../supabase/functions/_shared/prompt-analise.ts';

type Caso = {
  descricao: string;
  texto?: string;
  /** Arquivo de imagem na mesma pasta do caso. */
  imagem?: string;
  /** Calorias de referência; 0 significa "não é comida". */
  esperado_kcal: number;
  fonte?: string;
};

type Linha = {
  caso: string;
  esperado: number;
  provavel?: number;
  min?: number;
  max?: number;
  erroPct?: number;
  dentroDaFaixa?: boolean;
  tokens?: number;
  falha?: string;
};

/** Preço aproximado em US$ por milhão de tokens (entrada, saída). Confira em platform.claude.com. */
const PRECOS: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
};

const PASTA_CASOS = join('avaliacao', 'casos');
const PASTA_RESULTADOS = join('avaliacao', 'resultados');
const TIPOS: Record<string, TipoImagem> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function argumento(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  return process.argv.find((a) => a.startsWith(prefixo))?.slice(prefixo.length);
}

function carregarChave(): string {
  try {
    process.loadEnvFile('.env.avaliacao');
  } catch {
    // arquivo opcional: a chave também pode vir do ambiente
  }
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    console.error('Falta a chave. Crie o arquivo .env.avaliacao na raiz com: ANTHROPIC_API_KEY=sua-chave');
    process.exit(1);
  }
  return chave;
}

function montarEntrada(caso: Caso): EntradaAnalise {
  const entrada: EntradaAnalise = { texto: caso.texto };
  if (caso.imagem) {
    const tipo = TIPOS[extname(caso.imagem).toLowerCase()];
    if (!tipo) throw new Error(`Formato de imagem não suportado: ${caso.imagem}`);
    entrada.imagem = { tipo, base64: readFileSync(join(PASTA_CASOS, caso.imagem)).toString('base64') };
  }
  return entrada;
}

function avaliarResultado(nome: string, caso: Caso, r: ResultadoAnalise, tokens: number): Linha {
  if (caso.esperado_kcal === 0) {
    return { caso: nome, esperado: 0, provavel: r.total.kcal_provavel, dentroDaFaixa: !r.reconhecido, tokens };
  }
  const { kcal_min: min, kcal_provavel: provavel, kcal_max: max } = r.total;
  return {
    caso: nome,
    esperado: caso.esperado_kcal,
    provavel,
    min,
    max,
    erroPct: ((provavel - caso.esperado_kcal) / caso.esperado_kcal) * 100,
    dentroDaFaixa: caso.esperado_kcal >= min && caso.esperado_kcal <= max,
    tokens,
  };
}

async function main() {
  const apiKey = carregarChave();
  const modelo = argumento('modelo') ?? MODELO_PADRAO;
  const esforco = (argumento('esforco') ?? ESFORCO_PADRAO) as 'low' | 'medium' | 'high';
  const filtro = argumento('caso');

  const arquivos = readdirSync(PASTA_CASOS)
    .filter((a) => a.endsWith('.json'))
    .filter((a) => !filtro || a.includes(filtro))
    .sort();
  if (!arquivos.length) {
    console.error('Nenhum caso encontrado em avaliacao/casos.');
    process.exit(1);
  }

  console.log(`Modelo ${modelo} · esforço ${esforco} · prompt ${VERSAO_PROMPT} · ${arquivos.length} casos\n`);

  const linhas: Linha[] = [];
  const detalhes: Record<string, unknown>[] = [];
  let tokensEntrada = 0;
  let tokensSaida = 0;

  for (const arquivo of arquivos) {
    const nome = arquivo.replace(/\.json$/, '');
    const caso = JSON.parse(readFileSync(join(PASTA_CASOS, arquivo), 'utf8')) as Caso;
    process.stdout.write(`• ${nome}… `);
    const inicio = Date.now();
    try {
      const { resultado, uso } = await analisarRefeicao(montarEntrada(caso), { apiKey, modelo, esforco });
      tokensEntrada += uso.entrada;
      tokensSaida += uso.saida;
      const linha = avaliarResultado(nome, caso, resultado, uso.entrada + uso.saida);
      linhas.push(linha);
      detalhes.push({ caso: nome, esperado_kcal: caso.esperado_kcal, resultado, uso });
      console.log(`${((Date.now() - inicio) / 1000).toFixed(1)}s`);
    } catch (e) {
      const falha = e instanceof ErroAnalise ? `${e.codigo}: ${e.message}` : String(e);
      linhas.push({ caso: nome, esperado: caso.esperado_kcal, falha });
      console.log('falhou');
    }
  }

  console.log();
  console.table(
    linhas.map((l) => ({
      caso: l.caso,
      esperado: l.esperado,
      estimado: l.falha ? '—' : l.esperado === 0 ? (l.dentroDaFaixa ? 'não é comida ✓' : `${l.provavel} kcal`) : `${l.provavel} (${l.min}–${l.max})`,
      erro: l.erroPct === undefined ? '' : `${l.erroPct > 0 ? '+' : ''}${l.erroPct.toFixed(0)}%`,
      'na faixa': l.falha ? l.falha : l.dentroDaFaixa ? 'sim' : 'NÃO',
    })),
  );

  const ok = linhas.filter((l) => !l.falha);
  const comKcal = ok.filter((l) => l.erroPct !== undefined);
  const erroMedio = comKcal.reduce((s, l) => s + Math.abs(l.erroPct!), 0) / (comKcal.length || 1);
  const naFaixa = ok.filter((l) => l.dentroDaFaixa).length;
  const [precoEntrada, precoSaida] = PRECOS[modelo] ?? [0, 0];
  const custo = (tokensEntrada * precoEntrada + tokensSaida * precoSaida) / 1e6;

  console.log(`Erro médio absoluto: ${erroMedio.toFixed(1)}%`);
  console.log(`Valor de referência dentro da faixa: ${naFaixa} de ${ok.length} casos`);
  if (linhas.length > ok.length) console.log(`Falhas: ${linhas.length - ok.length}`);
  if (custo) console.log(`Custo aproximado: US$ ${custo.toFixed(4)} (US$ ${(custo / (ok.length || 1)).toFixed(4)} por análise)`);

  if (!existsSync(PASTA_RESULTADOS)) mkdirSync(PASTA_RESULTADOS, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const saida = join(PASTA_RESULTADOS, `${carimbo}-${modelo}.json`);
  writeFileSync(saida, JSON.stringify({ modelo, esforco, versao_prompt: VERSAO_PROMPT, linhas, detalhes }, null, 2));
  console.log(`\nDetalhes salvos em ${saida}`);
}

main();
