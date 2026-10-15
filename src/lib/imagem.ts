import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type FotoPreparada = { uri: string; base64: string };

/** Lado maior da foto enviada para análise: nítida o bastante e barata em tokens. */
const LADO_MAXIMO = 1280;

type Resultado = { foto: FotoPreparada } | { cancelado: true } | { erro: string };

/** Abre a câmera ou a galeria e devolve a foto já reduzida e em base64 (JPEG). */
export async function obterFoto(origem: 'camera' | 'galeria'): Promise<Resultado> {
  if (origem === 'camera') {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) return { erro: 'Sem permissão para usar a câmera. Libere nas configurações do celular.' };
  }

  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
  const escolha =
    origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
  if (escolha.canceled || !escolha.assets?.length) return { cancelado: true };

  const { uri, width, height } = escolha.assets[0];
  try {
    const contexto = ImageManipulator.manipulate(uri);
    if (Math.max(width, height) > LADO_MAXIMO) {
      contexto.resize(width >= height ? { width: LADO_MAXIMO } : { height: LADO_MAXIMO });
    }
    const renderizada = await contexto.renderAsync();
    const salva = await renderizada.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    if (!salva.base64) return { erro: 'Não foi possível preparar a foto.' };
    return { foto: { uri: salva.uri, base64: salva.base64 } };
  } catch {
    return { erro: 'Não foi possível preparar a foto. Tente outra.' };
  }
}
