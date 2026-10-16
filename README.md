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

## Motor de análise e coaching (edge functions)

A análise das refeições roda na edge function `analisar-refeicao` e o comentário do coach em `comentar-refeicao`; as duas chamam a Claude API. A chave da API fica só no Supabase, nunca no app.

**Modo simulado:** enquanto o segredo `ANTHROPIC_API_KEY` não existir, a função devolve estimativas de exemplo, marcadas como simuladas no app. Serve para desenvolver e testar o fluxo inteiro sem custo. Ao cadastrar a chave, a função passa a usar a IA na hora, sem novo deploy.

1. **Deploy** das funções (gratuito, não precisa de Docker; sem nome, publica todas):
   ```bash
   npx supabase login
   npx supabase functions deploy --project-ref SEU_PROJECT_REF --use-api
   ```
2. **Quando quiser a IA de verdade:** crie a chave em [platform.claude.com](https://platform.claude.com/) → API Keys (uso pago, por créditos) e, no painel do Supabase, em **Edge Functions → Secrets**, adicione `ANTHROPIC_API_KEY`. Opcionais:
   - `ANALISE_MODELO` (padrão `claude-sonnet-5-5`)
   - `ANALISE_ESFORCO`: `low`, `medium` ou `high` (padrão `medium`)
   - `ANALISE_LIMITE_DIARIO`: análises por usuário em 24 h (padrão `40`)
   - `COACHING_MODELO` (padrão `claude-haiku-5-5`, mais barato para textos curtos)
   - `COACHING_LIMITE_DIARIO`: comentários por usuário em 24 h (padrão `30`)
3. **Avaliar a qualidade** das estimativas localmente: veja [avaliacao/README.md](avaliacao/README.md).

Mudou o prompt (`supabase/functions/_shared/prompt-analise.ts`)? Rode `npm run avaliar` antes e depois, atualize `VERSAO_PROMPT` e faça o deploy de novo.

## Gerar o APK (instalar sem o Expo Go)

O build roda na nuvem do Expo (EAS), sem Android Studio. Plano gratuito do Expo é suficiente.

1. Crie uma conta em [expo.dev](https://expo.dev) e entre pelo terminal:
   ```bash
   npx eas-cli@latest login
   ```
2. Cadastre as chaves do Supabase no ambiente `preview` do EAS (o `.env` local não vai para a nuvem):
   ```bash
   npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://SEU-PROJETO.supabase.co --environment preview --visibility plaintext
   npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value SUA_PUBLISHABLE_KEY --environment preview --visibility plaintext
   ```
   As duas são públicas por natureza; a chave da Claude nunca entra aqui.
3. Gere o APK:
   ```bash
   npx eas-cli@latest build -p android --profile preview
   ```
   Na primeira vez ele pergunta se pode criar o projeto no Expo e a chave de assinatura Android: responda sim.
4. Ao terminar, o terminal mostra um link e um QR code. Abra no celular, baixe o APK e instale (o Android pede para permitir instalação de fontes desconhecidas).

Para mandar a amigos, é só compartilhar o mesmo link.

## Estrutura

```
src/
  app/              telas (cada arquivo é uma rota do Expo Router)
    _layout.tsx     raiz: decide telas de logado / não logado
    entrar.tsx      login e criação de conta
    (app)/          telas que exigem login
      onboarding    primeiro acesso: dados basais, objetivo e meta
      index         tela do dia: barra com faixa, macros, refeições e comentários
      registrar     foto/texto → estimativa → especificar → confirmar
      editar-perfil edição dos dados
  components/       componentes reutilizáveis
  lib/              cliente Supabase, cálculo da meta e utilitários
  providers/        contextos (sessão e perfil)
  theme.ts          cores, espaçamentos e fontes
supabase/
  migrations/       SQL do banco, em ordem
  functions/
    _shared/        motor de análise: estimativa.ts (tipos e cálculos, usado também pelo app),
                    analise.ts (prompt, schema, chamada à API), simulador.ts (modo sem IA)
                    e coaching.ts (contexto do dia, prompt sem culpa, versão simulada)
    analisar-refeicao/  edge function: login, limite diário, registro de uso
    comentar-refeicao/  edge function: comentário do coach no contexto do dia
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
