'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGameByCode } from '@/lib/api-helpers';
import AdSense from '@/components/AdSense';
import { GameMode, type GameSettings } from '@/types/game';

function CreateGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || '';

  const [mode, setMode] = useState<GameMode>('voice');
  const [roundTime, setRoundTime] = useState(60);
  const [maxRounds, setMaxRounds] = useState(3);
  const [isCreating, setIsCreating] = useState(false);
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    setIsCreating(true);
    setError('');

    const settings: GameSettings = {
      mode,
      roundTime,
      maxRounds,
    };

    try {
      const res = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderName: playerName, settings }),
      });

      const game = await res.json();

      if (game && game.code) {
        setGameCode(game.code);
        setTimeout(() => {
          router.push(`/game/${game.code}?name=${encodeURIComponent(playerName)}&leader=true`);
        }, 2500);
      } else {
        setError('Error al crear el juego. Intenta de nuevo.');
        setIsCreating(false);
      }
    } catch (error) {
      setError('Error al crear el juego. Intenta de nuevo.');
      setIsCreating(false);
    }
  };

  if (gameCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="text-center space-y-6 p-8 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border-4 border-pink-300 relative z-10 transform hover:scale-105 transition-transform">
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-4xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent">¡Juego Creado!</h2>
          <div className="space-y-3">
            <p className="text-gray-700 font-semibold">Tu código de juego es:</p>
            <div className="px-6 py-4 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl border-2 border-pink-400 shadow-inner">
              <p className="text-7xl font-black text-pink-600 tracking-widest font-mono">
                {gameCode}
              </p>
            </div>
            <p className="text-pink-600 text-sm font-bold">📱 Comparte este código con tus amigos</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-pink-600">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-200"></div>
            <span className="ml-2 font-semibold">Redirigiendo al lobby...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-fuchsia-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* AdSense Placeholder 1 */}
      <div className="absolute top-4 left-4 right-4 z-0">
        <AdSense adSlot="1" style={{ minHeight: '90px' }} />
      </div>

      <main className="w-full max-w-2xl relative z-10">
        <div className="rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-4 border-pink-200 space-y-6 transform hover:scale-105 transition-transform">
          <div className="text-center">
            <div className="text-5xl mb-2">⚙️</div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">Configurar Juego</h1>
            <p className="text-gray-700 font-semibold">Ajusta los parámetros de tu partida</p>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl font-bold">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-gray-800 font-black mb-3 text-sm uppercase tracking-wide">
                🎮 Modo de Juego
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('voice')}
                  className={`px-6 py-5 rounded-2xl font-black transition-all transform hover:scale-105 active:scale-95 ${
                    mode === 'voice'
                      ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white shadow-2xl border-2 border-pink-600'
                      : 'bg-pink-50 text-gray-700 hover:bg-pink-100 border-2 border-pink-300 shadow-lg'
                  }`}
                >
                  <div className="text-3xl mb-1">🎤</div>
                  <div className="text-sm">Modo Voz</div>
                </button>
                <button
                  onClick={() => setMode('text')}
                  className={`px-6 py-5 rounded-2xl font-black transition-all transform hover:scale-105 active:scale-95 ${
                    mode === 'text'
                      ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white shadow-2xl border-2 border-pink-600'
                      : 'bg-pink-50 text-gray-700 hover:bg-pink-100 border-2 border-pink-300 shadow-lg'
                  }`}
                >
                  <div className="text-3xl mb-1">✍️</div>
                  <div className="text-sm">Modo Escrito</div>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-5 rounded-2xl border-2 border-pink-200">
              <label className="block text-gray-800 font-black mb-3 text-sm uppercase tracking-wide">
                ⏱️ Tiempo por Ronda: <span className="text-pink-600 text-2xl">{roundTime}s</span>
              </label>
              <input
                type="range"
                min="30"
                max="180"
                step="10"
                value={roundTime}
                onChange={(e) => setRoundTime(Number(e.target.value))}
                className="w-full h-3 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between text-pink-600 text-sm mt-2 font-bold">
                <span>30s</span>
                <span>180s</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-fuchsia-50 p-5 rounded-2xl border-2 border-rose-200">
              <label className="block text-gray-800 font-black mb-3 text-sm uppercase tracking-wide">
                🔄 Número de Rondas: <span className="text-rose-600 text-2xl">{maxRounds}</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={maxRounds}
                onChange={(e) => setMaxRounds(Number(e.target.value))}
                className="w-full h-3 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
              <div className="flex justify-between text-rose-600 text-sm mt-2 font-bold">
                <span>1</span>
                <span>5</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.back()}
                className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-black rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 uppercase tracking-wide"
              >
                ← Volver
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-black rounded-xl hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600 transition-all shadow-2xl hover:shadow-2xl disabled:opacity-50 hover:scale-105 active:scale-95 uppercase tracking-wide text-lg"
              >
                {isCreating ? '⏳ Creando...' : '✨ Crear Juego'}
              </button>
            </div>
          </div>
        </div>

        {/* AdSense Placeholder 2 */}
        <div className="mt-6">
          <AdSense adSlot="2" style={{ minHeight: '250px' }} />
        </div>
      </main>
    </div>
  );
}

export default function CreateGamePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500">
        <div className="text-center text-white">
          <p className="text-xl">Cargando...</p>
        </div>
      </div>
    }>
      <CreateGameContent />
    </Suspense>
  );
}

