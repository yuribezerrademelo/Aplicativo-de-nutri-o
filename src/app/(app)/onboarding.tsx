import { FormularioPerfil } from '@/components/FormularioPerfil';
import { usePerfil } from '@/providers/PerfilProvider';

/** Primeiro acesso: ao salvar, o layout libera a tela inicial automaticamente. */
export default function TelaOnboarding() {
  const { perfil, salvar } = usePerfil();
  return <FormularioPerfil inicial={perfil} onSalvar={salvar} />;
}
