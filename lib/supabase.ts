import { createClient } from '@supabase/supabase-js';

// Estas variables deben ser configuradas en el archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Solo crear el cliente si tenemos las credenciales reales
const hasValidCredentials = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key' &&
  supabaseUrl.startsWith('http');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Función helper para verificar si Supabase está configurado
export const isSupabaseConfigured = () => hasValidCredentials;

