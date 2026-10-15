import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import type { DadosPerfil, Perfil } from '@/lib/perfil';
import { supabase } from '@/lib/supabase';
import { useSessao } from './SessaoProvider';

type ContextoPerfil = {
  perfil: Perfil | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  /** Grava o perfil; devolve uma mensagem de erro ou null em caso de sucesso. */
  salvar: (dados: DadosPerfil) => Promise<string | null>;
};

const Contexto = createContext<ContextoPerfil | null>(null);

type ResultadoBusca = { perfil: Perfil | null; erro: string | null };

async function buscarPerfil(idUsuario: string): Promise<ResultadoBusca> {
  const { data, error } = await supabase.from('perfis').select('*').eq('id', idUsuario).maybeSingle();
  if (error) return { perfil: null, erro: 'Não foi possível carregar seus dados. Verifique sua conexão.' };
  return { perfil: data as Perfil | null, erro: null };
}

/** Carrega o perfil do usuário logado e expõe como salvar alterações. */
export function PerfilProvider({ children }: PropsWithChildren) {
  const { sessao } = useSessao();
  const idUsuario = sessao?.user.id;

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const aplicarResultado = useCallback((r: ResultadoBusca) => {
    if (r.erro) setErro(r.erro);
    else {
      setErro(null);
      setPerfil(r.perfil);
    }
    setCarregando(false);
  }, []);

  // Carga inicial: o estado já começa como "carregando".
  useEffect(() => {
    if (!idUsuario) return;
    let ativo = true;
    buscarPerfil(idUsuario).then((r) => {
      if (ativo) aplicarResultado(r);
    });
    return () => {
      ativo = false;
    };
  }, [idUsuario, aplicarResultado]);

  /** Usado pelo botão "Tentar de novo". */
  const recarregar = useCallback(async () => {
    if (!idUsuario) return;
    setCarregando(true);
    aplicarResultado(await buscarPerfil(idUsuario));
  }, [idUsuario, aplicarResultado]);

  const salvar = useCallback(
    async (dados: DadosPerfil) => {
      if (!idUsuario) return 'Sessão expirada. Entre novamente.';
      const { data, error } = await supabase
        .from('perfis')
        .upsert({ id: idUsuario, ...dados })
        .select()
        .single();
      if (error) return 'Não foi possível salvar. Verifique sua conexão e tente de novo.';
      setPerfil(data as Perfil);
      return null;
    },
    [idUsuario],
  );

  return (
    <Contexto.Provider value={{ perfil, carregando, erro, recarregar, salvar }}>{children}</Contexto.Provider>
  );
}

export function usePerfil() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('usePerfil precisa estar dentro de <PerfilProvider>');
  return valor;
}
