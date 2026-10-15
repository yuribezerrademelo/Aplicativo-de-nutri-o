# Avaliação do motor de análise

Conjunto de casos para medir a qualidade das estimativas sempre que o prompt, o modelo ou o esforço mudarem.

## Rodar

1. Crie o arquivo `.env.avaliacao` na raiz do projeto (ele é ignorado pelo Git):
   ```
   ANTHROPIC_API_KEY=sua-chave
   ```
2. Rode:
   ```bash
   npm run avaliar                                    # modelo e esforço padrão
   npm run avaliar -- --modelo=claude-haiku-5-5       # comparar com outro modelo
   npm run avaliar -- --esforco=low                   # comparar esforço
   npm run avaliar -- --caso=cuscuz                   # só os casos com "cuscuz" no nome
   ```

O resultado mostra, por caso, a estimativa com a faixa e o erro em relação à referência. No final aparecem:

- **Erro médio absoluto:** quanto a estimativa provável erra, em média.
- **Referência dentro da faixa:** quantas vezes o valor real caiu entre o mínimo e o máximo. Mede se as faixas são honestas: ficar muito abaixo de 80% indica faixas estreitas demais.
- **Custo aproximado** por análise.

Os detalhes completos ficam em `avaliacao/resultados/` (ignorado pelo Git).

## Adicionar um caso

Cada caso é um `.json` em `avaliacao/casos/`:

```json
{
  "descricao": "Almoço de domingo",
  "imagem": "almoco-domingo.jpg",
  "texto": "opcional: o que você contaria no app",
  "esperado_kcal": 780,
  "fonte": "de onde veio a referência"
}
```

- `imagem` é opcional e aponta para um arquivo JPEG, PNG ou WebP na mesma pasta. As fotos ficam fora do Git por padrão.
- `esperado_kcal: 0` indica algo que não é comida; o caso passa se o motor responder "não reconhecido".

### Fotos das suas conversas antigas

Os melhores casos são refeições cujo valor você conhece bem: pesou os ingredientes, tinha a tabela nutricional ou o peso da balança do restaurante por quilo. As estimativas antigas do chat também servem como referência, mas são estimativas, não a verdade. Marque isso na `fonte` para lembrar a diferença.
