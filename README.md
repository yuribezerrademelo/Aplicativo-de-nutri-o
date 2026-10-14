# Aplicativo de nutrição

App de acompanhamento nutricional focado em comida brasileira de verdade. O usuário fotografa ou descreve a refeição, recebe uma estimativa honesta de calorias e macros (em faixas, com margem de erro) e pode refinar o resultado contando preparo, ingredientes e porção. Tudo isso com coaching sem culpa, baseado no contexto do dia.

## Stack

- **App:** Expo + React Native + TypeScript
- **Backend:** Supabase (Auth, Postgres com RLS, Storage, Edge Functions)
- **IA:** Claude API (visão + saída estruturada em JSON), chamada apenas pela edge function

## Documentação

- [Plano do MVP e roadmap](docs/PLANO-MVP.md)
