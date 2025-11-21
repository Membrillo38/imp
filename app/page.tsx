'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdSense from '@/components/AdSense';

export default function Home() {
  const [showJoin, setShowJoin] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }
    router.push(`/create?name=${encodeURIComponent(playerName)}`);
  };

  const handleJoinGame = async () => {
    if (!gameCode.trim() || !playerName.trim()) {
      alert('Por favor ingresa el código y tu nombre');
      return;
    }
    
    setIsLoading(true);
    router.push(`/game/${gameCode}?name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-fuchsia-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-8 py-16 relative z-10">
        {/* AdSense Placeholder 1 */}
        <div className="absolute top-4 left-4 right-4 z-0">
          <AdSense adSlot="1" style={{ minHeight: '90px' }} />
        </div>

        <div className="w-full max-w-md space-y-8 rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-4 border-pink-200 transform hover:scale-105 transition-transform duration-300">
          <div className="text-center">
            <div className="text-7xl mb-3 animate-bounce">🎭</div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent mb-2 drop-shadow-lg">
              IMPOSTOR
            </h1>
            <p className="text-gray-700 text-lg font-medium">
              Encuentra al impostor antes de que sea demasiado tarde
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                Tu nombre
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ingresa tu nombre"
                className="w-full px-4 py-3 rounded-xl bg-pink-50 border-2 border-pink-300 text-gray-800 placeholder-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-300 focus:border-pink-500 font-medium transition-all"
                maxLength={20}
              />
            </div>

            {!showJoin ? (
              <div className="space-y-3">
                <button
                  onClick={handleCreateGame}
                  disabled={isLoading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-black rounded-xl hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600 transition-all shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 text-lg uppercase tracking-wide transform active:scale-95"
                >
                  ✨ Crear Juego
                </button>
                <button
                  onClick={() => setShowJoin(true)}
                  className="w-full px-6 py-4 bg-white border-2 border-pink-400 text-pink-600 font-bold rounded-xl hover:bg-pink-50 transition-all shadow-md hover:shadow-lg hover:scale-105 text-lg uppercase tracking-wide transform active:scale-95"
                >
                  🔑 Unirse con Código
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-800 font-bold mb-2 text-sm uppercase tracking-wide">
                    Código del juego
                  </label>
                  <input
                    type="text"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-400 text-pink-700 placeholder-pink-300 focus:outline-none focus:ring-4 focus:ring-pink-300 text-center text-3xl font-black tracking-widest shadow-inner"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleJoinGame}
                  disabled={isLoading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-black rounded-xl hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-2xl disabled:opacity-50 text-lg uppercase tracking-wide transform hover:scale-105 active:scale-95"
                >
                  {isLoading ? '⏳ Uniéndose...' : '🚀 Unirse al Juego'}
                </button>
                <button
                  onClick={() => setShowJoin(false)}
                  className="w-full px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-md hover:shadow-lg hover:scale-105 text-lg uppercase tracking-wide transform active:scale-95"
                >
                  ← Volver
                </button>
              </div>
            )}
          </div>

          {/* AdSense Placeholder 2 */}
          <div className="mt-6">
            <AdSense adSlot="2" style={{ minHeight: '250px' }} />
          </div>
        </div>
      </main>
    </div>
  );
}
