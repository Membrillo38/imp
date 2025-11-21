// Cliente-side subscription helper que no importa Prisma
import { Game } from '@/types/game';
import { supabase, isSupabaseConfigured } from './supabase';

export function subscribeToGame(gameId: string, callback: (game: Game) => void) {
  // Polling cada 2 segundos para obtener actualizaciones
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/api/games/id/${gameId}`);
      if (res.ok) {
        const game = await res.json();
        callback(game);
      }
    } catch (error) {
      console.error('Error en polling:', error);
    }
  }, 2000);

  // También intentar usar Supabase Realtime si está disponible
  if (isSupabaseConfigured()) {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          if (payload.new) {
            try {
              const res = await fetch(`/api/games/id/${gameId}`);
              if (res.ok) {
                const game = await res.json();
                callback(game);
              }
            } catch (error) {
              callback(payload.new as Game);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }

  return () => clearInterval(interval);
}

