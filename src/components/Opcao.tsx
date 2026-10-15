import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores, espaco, fonte, raio } from '@/theme';

type Props = {
  titulo: string;
  descricao?: string;
  selecionado: boolean;
  onPress: () => void;
};

/** Cartão de escolha única (funciona como um botão de rádio). */
export function Opcao({ titulo, descricao, selecionado, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionado }}
      onPress={onPress}
      style={({ pressed }) => [styles.cartao, selecionado && styles.selecionado, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.marcador, selecionado && styles.marcadorAtivo]}>
        {selecionado ? <View style={styles.ponto} /> : null}
      </View>
      <View style={styles.textos}>
        <Text style={[styles.titulo, selecionado && { color: cores.primaria }]}>{titulo}</Text>
        {descricao ? <Text style={styles.descricao}>{descricao}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.md,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  selecionado: { borderColor: cores.primaria, borderWidth: 2, padding: espaco.md - 1 },
  marcador: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorAtivo: { borderColor: cores.primaria },
  ponto: { width: 10, height: 10, borderRadius: 5, backgroundColor: cores.primaria },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: fonte.corpo, fontWeight: '600', color: cores.texto },
  descricao: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 18 },
});
