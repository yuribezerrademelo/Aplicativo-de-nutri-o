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
docs/
  PLANO-MVP.md      escopo do MVP, decisões e roadmap
```

## Verificação

```bash
npm run typecheck   # tipos
npm run lint        # padrões de código
npm test            # testes do cálculo de meta (src/lib/*.test.ts)
```
