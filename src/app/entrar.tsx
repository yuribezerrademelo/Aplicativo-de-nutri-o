import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { mensagemDeErroAuth } from '@/lib/erros-auth';
import { supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

type Modo = 'entrar' | 'criar';
type Aviso = { tipo: 'erro' | 'info'; texto: string } | null;

export default function TelaEntrar() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  const criando = modo === 'criar';

  async function enviar() {
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !senha) {
      setAviso({ tipo: 'erro', texto: 'Preencha e-mail e senha.' });
      return;
    }

    setEnviando(true);
    setAviso(null);

    if (criando) {
      const { data, error } = await supabase.auth.signUp({ email: emailLimpo, password: senha });
      if (error) setAviso({ tipo: 'erro', texto: mensagemDeErroAuth(error) });
      // Sem sessão = o projeto exige confirmação por e-mail.
      else if (!data.session)
        setAviso({ tipo: 'info', texto: 'Conta criada! Confirme pelo link que enviamos ao seu e-mail e depois entre.' });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha });
      if (error) setAviso({ tipo: 'erro', texto: mensagemDeErroAuth(error) });
    }
    // Em caso de sucesso, a navegação troca de tela sozinha (ver _layout.tsx).
    setEnviando(false);
  }

  function alternarModo() {
    setModo(criando ? 'entrar' : 'criar');
    setAviso(null);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={styles.cabecalho}>
            <Text style={styles.marca}>Nutri</Text>
            <Text style={styles.slogan}>
              Comida de verdade, estimativa honesta e nada de culpa.
            </Text>
          </View>

          <View style={styles.formulario}>
            <Text style={styles.titulo}>{criando ? 'Criar conta' : 'Entrar'}</Text>

            <CampoTexto
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <CampoTexto
              rotulo="Senha"
              value={senha}
              onChangeText={setSenha}
              placeholder={criando ? 'Mínimo de 6 caracteres' : 'Sua senha'}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={criando ? 'new-password' : 'current-password'}
              textContentType={criando ? 'newPassword' : 'password'}
              onSubmitEditing={enviar}
            />

            {aviso && (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.aviso, aviso.tipo === 'erro' ? styles.avisoErro : styles.avisoInfo]}
              >
                {aviso.texto}
              </Text>
            )}

            <Botao titulo={criando ? 'Criar conta' : 'Entrar'} onPress={enviar} carregando={enviando} />
            <Botao
              titulo={criando ? 'Já tenho conta' : 'Ainda não tenho conta'}
              onPress={alternarModo}
              variante="secundario"
              desabilitado={enviando}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: espaco.lg, gap: espaco.xl },
  cabecalho: { gap: espaco.sm },
  marca: { fontSize: 40, fontWeight: '800', color: cores.primaria, letterSpacing: -1 },
  slogan: { fontSize: fonte.corpo, color: cores.textoSuave, lineHeight: 24 },
  formulario: {
    gap: espaco.md,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    padding: espaco.lg,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  aviso: { fontSize: fonte.pequeno, lineHeight: 20, padding: espaco.md, borderRadius: raio.sm },
  avisoErro: { color: cores.erro, backgroundColor: cores.erroFundo },
  avisoInfo: { color: cores.primaria, backgroundColor: '#E7F0EA' },
});
