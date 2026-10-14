import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { cores, espaco, fonte, raio } from '@/theme';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
  carregando?: boolean;
  desabilitado?: boolean;
};

export function Botao({ titulo, onPress, variante = 'primario', carregando, desabilitado }: Props) {
  const primario = variante === 'primario';
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.base,
        primario ? styles.primario : styles.secundario,
        (pressed || inativo) && { opacity: 0.6 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? cores.primariaTexto : cores.primaria} />
      ) : (
        <Text style={[styles.texto, { color: primario ? cores.primariaTexto : cores.primaria }]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: raio.md,
    paddingHorizontal: espaco.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primario: { backgroundColor: cores.primaria },
  secundario: { backgroundColor: 'transparent' },
  texto: { fontSize: fonte.corpo, fontWeight: '600' },
});
