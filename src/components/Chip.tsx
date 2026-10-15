import { Pressable, StyleSheet, Text } from 'react-native';

import { cores, espaco, fonte } from '@/theme';

type Props = { titulo: string; selecionado?: boolean; onPress: () => void };

/** Pílula de escolha rápida (perguntas de refinamento, tipo de refeição). */
export function Chip({ titulo, selecionado = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selecionado && styles.selecionado, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.texto, selecionado && styles.textoSelecionado]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    justifyContent: 'center',
  },
  selecionado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  texto: { fontSize: fonte.pequeno + 1, color: cores.texto, fontWeight: '500' },
  textoSelecionado: { color: cores.primariaTexto, fontWeight: '600' },
});
