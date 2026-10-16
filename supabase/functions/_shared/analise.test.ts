/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analisarRefeicao,
  calcularTotais,
  ErroAnalise,
  montarMensagens,
  normalizarItem,
  tipoDaEntrada,
  validarEntrada,
  type ItemEstimado,
  type SaidaModelo,
} from './analise.ts';

const item = (nome: string, min: number, prov: number, max: number): ItemEstimado => ({
  nome,
  porcao: '1 porção',
  gramas: 100,
  preparo: 'cozido',
  kcal_min: min,
  kcal_provavel: prov,
  kcal_max: max,
  proteina_g: 5,
  carboidrato_g: 20,
  gordura_g: 2,
  fibra_g: 1,
  confianca: 'media',
});

test('totais: provável soma e a faixa combina incertezas sem exagerar', () => {
  const t = calcularTotais([item('arroz', 160, 200, 240), item('feijão', 70, 100, 130)]);
  assert.equal(t.kcal_provavel, 300);
  // sqrt(40² + 30²) = 50 → faixa 250–350, mais estreita que somar extremos (230–370)
  assert.equal(t.kcal_min, 250);
  assert.equal(t.kcal_max, 350);
  assert.equal(t.proteina_g, 10);
});

test('item: ordena min/provável/max e corrige números inválidos', () => {
  const i = normalizarItem({ ...item('x', 300, 200, 100), gramas: -5, fibra_g: Number.NaN, confianca: 'talvez' as never });
  assert.deepEqual([i.kcal_min, i.kcal_provavel, i.kcal_max], [100, 200, 300]);
  assert.equal(i.gramas, 0);
  assert.equal(i.fibra_g, 0);
  assert.equal(i.confianca, 'media');
});

test('entrada: exige foto ou texto, e refinamento exige análise anterior', () => {
  assert.throws(() => validarEntrada({}), ErroAnalise);
  assert.throws(() => validarEntrada({ texto: 'arroz', correcao: 'foi frito' }), /análise anterior/);
  assert.throws(() => validarEntrada({ imagem: { base64: 'abc', tipo: 'image/gif' } }), /Formato/);
  assert.equal(tipoDaEntrada(validarEntrada({ texto: '  cuscuz com ovo ' })), 'texto');
  assert.equal(tipoDaEntrada(validarEntrada({ imagem: { base64: 'abc', tipo: 'image/jpeg' } })), 'foto');
});

test('mensagens: refinamento vira conversa com a análise anterior', () => {
  const anterior = { reconhecido: true, itens: [item('frango', 150, 200, 250)], suposicoes: [], perguntas: [], observacao: '' };
  const e = validarEntrada({ texto: 'frango e arroz', anterior, correcao: 'o frango foi frito' });
  assert.equal(tipoDaEntrada(e), 'refinamento');
  const m = montarMensagens(e);
  assert.deepEqual(m.map((x) => x.role), ['user', 'assistant', 'user']);
  assert.ok(!String(m[1].content).includes('"total"'), 'o total calculado não volta para o modelo');
  assert.match(String(m[2].content), /frito/);
});

test('mensagens: contexto do usuário vai antes do pedido, em bloco próprio', () => {
  const m = montarMensagens(validarEntrada({ texto: 'frango' }), 'Fatos sobre os hábitos do usuário:\n- Filés finos');
  const texto = (m[0].content as { type: string; text?: string }[]).find((b) => b.type === 'text')!.text!;
  assert.match(texto, /^<contexto_do_usuario>\nFatos sobre/);
  assert.match(texto, /<\/contexto_do_usuario>\n\nAnalise a refeição descrita/);
  const semContexto = (montarMensagens(validarEntrada({ texto: 'frango' }))[0].content as { text?: string }[])[0].text!;
  assert.doesNotMatch(semContexto, /contexto_do_usuario/);
});

test('chamada: ignora blocos de raciocínio e usa o JSON do bloco de texto', async () => {
  const saida: SaidaModelo = {
    reconhecido: true,
    itens: [item('cuscuz', 180, 220, 260), item('ovo frito', 80, 100, 120)],
    suposicoes: ['ovo frito com pouco óleo'],
    perguntas: [{ pergunta: 'O cuscuz levou manteiga?', opcoes: ['Sim', 'Não'] }],
    observacao: 'A manteiga é o que mais pesa na incerteza.',
  };
  let corpoEnviado: Record<string, unknown> = {};
  const fetchFalso = (async (_url: string, init: RequestInit) => {
    corpoEnviado = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({
        content: [
          { type: 'thinking', thinking: '...' },
          { type: 'text', text: JSON.stringify(saida) },
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1200, output_tokens: 400 },
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const r = await analisarRefeicao({ texto: 'cuscuz com ovo' }, { apiKey: 'teste', fetch: fetchFalso });
  assert.equal(r.resultado.total.kcal_provavel, 320);
  assert.deepEqual(r.uso, { entrada: 1200, saida: 400 });
  assert.equal(r.modelo, 'claude-sonnet-5-5');
  const config = corpoEnviado.output_config as { format: { type: string } };
  assert.equal(config.format.type, 'json_schema');
});

test('chamada: erros da API viram mensagens amigáveis', async () => {
  const fetchComErro = (status: number) =>
    (async () => new Response(JSON.stringify({ error: { message: 'x' } }), { status })) as typeof fetch;
  await assert.rejects(analisarRefeicao({ texto: 'a' }, { apiKey: 'k', fetch: fetchComErro(529) }), { codigo: 'ia_indisponivel' });
  await assert.rejects(analisarRefeicao({ texto: 'a' }, { apiKey: 'k', fetch: fetchComErro(401) }), { codigo: 'configuracao' });
});
