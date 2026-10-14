import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { cores, espaco, fonte, raio } from '@/theme';

type Props = TextInputProps & { rotulo: string };

export function CampoTexto({ rotulo, style, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={cores.textoSuave}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: espaco.xs },
  rotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.superficie,
  },
});
