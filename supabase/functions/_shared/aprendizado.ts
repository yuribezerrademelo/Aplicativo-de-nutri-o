/**
 * Aprendizado com IA: além das regras de porção (memoria.ts), extrai fatos
 * duradouros das especificações que o usuário escreveu ("batata na airfryer
 * é sempre sem óleo"). Só roda quando há chave da API.
 */
import type { ItemEstimado } from './estimativa.ts';
import type { Memoria } from './memoria.ts';

export const MODELO_APRENDIZADO_PADRAO = 'claude-haiku-5-5';

const PROMPT = `Você mantém a memória de um app de acompanhamento alimentar. Recebe a primeira estimativa da IA para uma refeição, o que o usuário confirmou, as especificações que ele escreveu e os fatos já guardados.

Extraia de 0 a 2 fatos DURADOUROS sobre os hábitos do usuário que ajudem a estimar refeições futuras: como ele costuma preparar certos alimentos, quantidades de óleo, utensílios e tamanhos de prato, marcas que usa, porções habituais.

Regras:
- Só fatos que provavelmente se repetem. Nada específico apenas desta refeição.
- Não repita fatos já guardados; para atualizar um, reutilize exatamente a mesma chave.
- chave: curta, minúscula, no formato "tema:assunto" (ex.: "preparo:batata", "utensilio:prato").
- texto: uma frase curta em português, na segunda pessoa (ex.: "Você faz batata na airfryer sem óleo.").
- Sem julgamentos sobre a alimentação. Se não houver nada duradouro, retorne lista vazia.`;

const SCHEMA = {
  type: 'object',
  properties: {
    fatos: {
      type: 'array',
      items: {
        type: 'object',
        properties: { chave: { type: 'string' }, texto: { type: 'string' } },
        required: ['chave', 'texto'],
        additionalProperties: false,
      },
    },
  },
  required: ['fatos'],
  additionalProperties: false,
};

const resumoItens = (itens: ItemEstimado[] = []) =>
  itens.map((i) => `${i.nome} (~${Math.round(i.gramas)} g, ${i.preparo || 'preparo não informado'})`).join('; ') || 'nenhum';

export async function extrairFatosComIA(
  dados: { original?: { itens?: ItemEstimado[] } | null; confirmados: ItemEstimado[]; especificacoes: string[]; memorias: Memoria[] },
  opcoes: { apiKey: string; modelo?: string; fetch?: typeof fetch },
): Promise<{ fatos: { chave: string; texto: string }[]; uso: { entrada: number; saida: number } }> {
  if (!dados.especificacoes.length) return { fatos: [], uso: { entrada: 0, saida: 0 } };

  const contexto = [
    `Primeira estimativa: ${resumoItens(dados.original?.itens)}`,
    `Confirmado pelo usuário: ${resumoItens(dados.confirmados)}`,
    `Especificações do usuário:\n${dados.especificacoes.map((e) => `- ${e}`).join('\n')}`,
    `Fatos já guardados:\n${dados.memorias.map((m) => `- [${m.chave ?? 'manual'}] ${m.texto}`).join('\n') || '- nenhum'}`,
  ].join('\n\n');

  const resposta = await (opcoes.fetch ?? fetch)('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': opcoes.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: opcoes.modelo || MODELO_APRENDIZADO_PADRAO,
      max_tokens: 2000,
      system: PROMPT,
      messages: [{ role: 'user', content: contexto }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    }),
  });
  if (!resposta.ok) return { fatos: [], uso: { entrada: 0, saida: 0 } };

  const corpo = (await resposta.json().catch(() => ({}))) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  try {
    const { fatos } = JSON.parse(corpo.content?.find((b) => b.type === 'text')?.text ?? '{"fatos":[]}');
    const validos = (Array.isArray(fatos) ? fatos : [])
      .filter((f) => typeof f?.chave === 'string' && typeof f?.texto === 'string')
      .map((f) => ({ chave: f.chave.trim().toLowerCase().slice(0, 80), texto: f.texto.trim().slice(0, 300) }))
      .filter((f) => f.chave && f.texto.length >= 3)
      .slice(0, 2);
    return { fatos: validos, uso: { entrada: corpo.usage?.input_tokens ?? 0, saida: corpo.usage?.output_tokens ?? 0 } };
  } catch {
    return { fatos: [], uso: { entrada: 0, saida: 0 } };
  }
}
