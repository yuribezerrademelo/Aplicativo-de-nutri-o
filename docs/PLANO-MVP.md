# Plano do MVP

Status: **proposta, aguardando aprovação do Yuri**

## Objetivo

Substituir o fluxo manual que funcionou por 2 meses e meio (mandar foto da refeição para o Claude e receber estimativa + análise) por um app que faz isso com contexto automático: dados do usuário, meta e o que já foi consumido no dia.

O MVP está pronto quando o Yuri conseguir usar o app no S24 Ultra durante uma semana inteira, no lugar das conversas manuais, sem sentir que perdeu qualidade.

## O que entra no MVP

1. **Login** por e-mail e senha (Supabase Auth).
2. **Onboarding e perfil**: sexo, data de nascimento, altura, peso e nível de atividade. O app calcula a TMB (Mifflin-St Jeor) e o gasto total (TMB × fator de atividade), sugere uma meta calórica e deixa o usuário ajustar. Campo opcional para TMB medida em bioimpedância.
3. **Registrar refeição** por foto (câmera ou galeria) ou só por texto.
4. **Estimativa honesta**: cada item com gramas estimadas, preparo assumido, kcal em faixa (mín / provável / máx), macros (proteína, carbo, gordura, fibra), nível de confiança e suposições explícitas.
5. **Refinamento**: botão "Deseja especificar algo do seu prato?" com perguntas sugeridas pela IA em toque rápido + texto livre. Cada refinamento gera uma nova estimativa. O usuário também pode corrigir a porção de um item na mão.
6. **Confirmar**: a refeição entra no dia e abate da meta.
7. **Tela do dia**: kcal consumidas vs. meta, macros do dia, lista de refeições (editar e apagar).
8. **Comentário de coaching** curto depois de confirmar, com o contexto do dia e tom sem culpa.
9. **Limite diário de análises por usuário** na edge function, para controlar custo quando entrarem amigos.

## O que fica para depois

- Tabela TACO/TBCA como fonte dos valores por 100 g
- Histórico e gráficos semanais, evolução do peso
- Chat de coaching livre ("o que janto hoje?")
- Login com Google, notificações, uso offline
- Publicação na Play Store

## Roadmap

| Etapa | Entrega | O que você testa no celular |
|---|---|---|
| 0. Fundação | Projeto Expo, Supabase conectado, login | Criar conta, sair e entrar de novo |
| 1. Perfil e meta | Onboarding, cálculo de TMB e meta, tabela `perfis` com RLS | Preencher seus dados e conferir a meta |
| 2. Motor de análise | Edge function + prompt + JSON validado; script que roda as fotos de referência | Comparar as estimativas com as das suas conversas antigas |
| 3. Fluxo de registro | Câmera → estimativa → refinar → confirmar | Registrar refeições reais |
| 4. Tela do dia e coaching | Saldo do dia, macros, comentário pós-refeição | Usar um dia inteiro |
| 5. Uso diário | Ajustes de interface, APK instalável | Uma semana usando no lugar do chat |
| 6. Abrir para amigos | SMTP próprio, confirmação de e-mail, limites | Mandar o APK para 2 ou 3 amigos |

A etapa 2 vem antes da interface de propósito: o motor de análise é o coração do produto e dá para calibrar o prompt com as suas fotos de referência sem depender de tela nenhuma.

## Decisões tomadas

### Exibição do saldo do dia
Barra de progresso em direção à meta, com dois níveis visuais: o preenchimento sólido vai até o valor provável e uma faixa mais clara mostra a margem (mín a máx). O número provável fica no canto superior da barra ("1.640 / 2.100 kcal") e a faixa aparece como detalhe menor logo abaixo ("entre 1.480 e 1.830"). Assim o usuário tem a noção visual e a numérica ao mesmo tempo.

### Meta calórica por objetivo
A meta nasce do objetivo de cada pessoa, não de um padrão único:

1. **Gasto basal (TMB)**, por ordem de preferência:
   - valor medido em avaliação física / bioimpedância, se o usuário tiver;
   - Katch-McArdle, se o usuário informar o % de gordura;
   - Mifflin-St Jeor, a partir de sexo, idade, altura e peso.
2. **Gasto total** = TMB × fator de atividade (1,2 sedentário; 1,375 leve; 1,55 moderado; 1,725 intenso; 1,9 muito intenso).
3. **Objetivo e ritmo** definem o ajuste:
   - perder peso: déficit leve (10%), moderado (15%) ou acelerado (20%);
   - manter: sem ajuste;
   - ganhar peso: superávit leve (5%), moderado (10%) ou acelerado (15%).
4. **Trava de segurança**: a meta de perda nunca fica abaixo da TMB; se o ritmo escolhido levaria a isso, o app limita e explica por quê.

O usuário vê de onde veio cada número e pode ajustar a meta manualmente.

**Fase 2:** importar a avaliação física por foto ou PDF, com a IA extraindo TMB, % de gordura e massa magra automaticamente.
