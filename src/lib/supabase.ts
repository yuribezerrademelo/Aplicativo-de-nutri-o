import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const chavePublica = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Falso quando o .env ainda não foi preenchido; o app mostra uma tela de aviso. */
export const supabaseConfigurado = url.startsWith('https://') && chavePublica.length > 0;

export const supabase = createClient(
  // O placeholder só existe para o app abrir e mostrar o aviso de configuração.
  supabaseConfigurado ? url : 'https://placeholder.supabase.co',
  supabaseConfigurado ? chavePublica : 'placeholder',
  {
    auth: {
      // Guarda a sessão no aparelho: o usuário não precisa entrar toda vez.
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Renova o token só enquanto o app está aberto (registrado uma única vez).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
