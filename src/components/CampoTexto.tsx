import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { cores, espaco, fonte, raio } from '@/theme';

type Props = TextInputProps & {
  rotulo: string;
  /** Unidade mostrada à direita do campo, ex.: "kg". */
  sufixo?: string;
  /** Texto de apoio abaixo do campo. */
  ajuda?: string;
};

export function CampoTexto({ rotulo, sufixo, ajuda, style, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.caixa}>
        <TextInput
          accessibilityLabel={rotulo}
          placeholderTextColor={cores.textoSuave}
          style={[styles.input, style]}
          {...props}
        />
        {sufixo ? <Text style={styles.sufixo}>{sufixo}</Text> : null}
      </View>
      {ajuda ? <Text style={styles.ajuda}>{ajuda}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: espaco.xs },
  rotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave },
  caixa: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    backgroundColor: cores.superficie,
  },
  input: { flex: 1, minHeight: 50, fontSize: fonte.corpo, color: cores.texto },
  sufixo: { fontSize: fonte.corpo, color: cores.textoSuave, marginLeft: espaco.sm },
  ajuda: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 18 },
});
