import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase, supabaseConfigurado } from '@/lib/supabase';

type ContextoSessao = {
  sessao: Session | null;
  carregando: boolean;
};

const Contexto = createContext<ContextoSessao | null>(null);

/** Mantém a sessão do Supabase disponível para o app inteiro. */
export function SessaoProvider({ children }: PropsWithChildren) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(supabaseConfigurado);

  useEffect(() => {
    if (!supabaseConfigurado) return;

    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    // Entrar, sair e renovação de token chegam por aqui.
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <Contexto.Provider value={{ sessao, carregando }}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return valor;
}
