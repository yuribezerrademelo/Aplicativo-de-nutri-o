import { router } from 'expo-router';

import { FormularioPerfil } from '@/components/FormularioPerfil';
import type { DadosPerfil } from '@/lib/perfil';
import { usePerfil } from '@/providers/PerfilProvider';

export default function TelaEditarPerfil() {
  const { perfil, salvar } = usePerfil();

  async function salvarEVoltar(dados: DadosPerfil) {
    const falha = await salvar(dados);
    if (!falha) router.back();
    return falha;
  }

  return <FormularioPerfil inicial={perfil} onSalvar={salvarEVoltar} onCancelar={() => router.back()} />;
}
