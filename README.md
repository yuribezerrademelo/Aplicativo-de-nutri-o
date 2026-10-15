# Aplicativo de nutrição

App de acompanhamento nutricional focado em comida brasileira de verdade. O usuário fotografa ou descreve a refeição, recebe uma estimativa honesta de calorias e macros (em faixas, com margem de erro) e pode refinar o resultado contando preparo, ingredientes e porção. Tudo isso com coaching sem culpa, baseado no contexto do dia.

## Stack

- **App:** Expo (SDK 57) + React Native + TypeScript + Expo Router
- **Backend:** Supabase (Auth, Postgres com RLS, Storage, Edge Functions)
- **IA:** Claude API (visão + saída estruturada em JSON), chamada apenas pela edge function

## Como rodar

**Pré-requisitos:** Node.js LTS, Git e o app **Expo Go** no celular (Play Store).

1. **Clonar e instalar**
   ```bash
   git clone https://github.com/yuribezerrademelo/aplicativo-de-nutri-o.git
   cd aplicativo-de-nutri-o
   npm install
   ```

2. **Criar o projeto no Supabase** (supabase.com, região São Paulo).
   - No **SQL Editor**, cole e rode o conteúdo de cada arquivo de `supabase/migrations/`, em ordem.
   - Durante o desenvolvimento, desligue a confirmação de e-mail em
     **Authentication → Sign In / Providers → Email → Confirm email**. Religue antes de abrir para outras pessoas.

3. **Configurar as chaves**: copie `.env.example` para `.env` e preencha com a Project URL e a publishable key
   (botão **Connect** no painel do Supabase).

4. **Rodar**
   ```bash
   npx expo start
   ```
   Abra o Expo Go e escaneie o QR code. Celular e computador precisam estar na mesma rede Wi-Fi;
   se não funcionar, use `npx expo start --tunnel`.

## Motor de análise (edge function)

A análise das refeições roda na edge function `analisar-refeicao`, que chama a Claude API. A chave da API fica só no Supabase, nunca no app.

1. **Chave da Claude API:** crie em [platform.claude.com](https://platform.claude.com/) → API Keys e carregue créditos.
2. **Segredo no Supabase:** no painel, **Edge Functions → Secrets**, adicione `ANTHROPIC_API_KEY` com a sua chave. Opcionais:
   - `ANALISE_MODELO` (padrão `claude-sonnet-5-5`)
   - `ANALISE_ESFORCO`: `low`, `medium` ou `high` (padrão `medium`)
   - `ANALISE_LIMITE_DIARIO`: análises por usuário em 24 h (padrão `40`)
3. **Deploy** (não precisa de Docker):
   ```bash
   npx supabase login
   npx supabase functions deploy analisar-refeicao --project-ref SEU_PROJECT_REF --use-api
   ```
4. **Avaliar a qualidade** das estimativas localmente: veja [avaliacao/README.md](avaliacao/README.md).

Mudou o prompt (`supabase/functions/_shared/prompt-analise.ts`)? Rode `npm run avaliar` antes e depois, atualize `VERSAO_PROMPT` e faça o deploy de novo.

## Estrutura

```
src/
  app/              telas (cada arquivo é uma rota do Expo Router)
    _layout.tsx     raiz: decide telas de logado / não logado
    entrar.tsx      login e criação de conta
    (app)/          telas que exigem login
      onboarding    primeiro acesso: dados basais, objetivo e meta
      index         tela inicial
      editar-perfil edição dos dados
  components/       componentes reutilizáveis
  lib/              cliente Supabase, cálculo da meta e utilitários
  providers/        contextos (sessão e perfil)
  theme.ts          cores, espaçamentos e fontes
supabase/
  migrations/       SQL do banco, em ordem
  functions/
    _shared/        motor de análise (prompt, schema, chamada à API), usado pela função e pelos testes
    analisar-refeicao/  edge function: login, limite diário, registro de uso
scripts/            script de avaliação do motor
avaliacao/          casos de referência para medir as estimativas
docs/
  PLANO-MVP.md      escopo do MVP, decisões e roadmap
```

## Verificação

```bash
npm run typecheck   # tipos
npm run lint        # padrões de código
npm test            # testes do cálculo de meta e do motor de análise
npm run avaliar     # qualidade das estimativas contra casos de referência (usa a API, tem custo)
```
