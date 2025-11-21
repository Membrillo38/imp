'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Game, Player, GameStatus } from '@/types/game';
import { getGameByCode, getGameById } from '@/lib/api-helpers';
import { subscribeToGame } from '@/lib/game-subscription';
import AdSense from '@/components/AdSense';

function GamePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const playerName = searchParams.get('name') || '';
  const isLeader = searchParams.get('leader') === 'true';

  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selectedVote, setSelectedVote] = useState<string>('');
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!playerName || !code) {
      router.push('/');
      return;
    }

    const initializeGame = async () => {
      try {
        // Obtener juego por código usando API
        const game = await getGameByCode(code);

        if (!game) {
          alert('No se pudo encontrar el juego.');
          router.push('/');
          return;
        }

        const player = game.players.find((p: Player) => p.name === playerName);

        // Si no es líder y no está en el juego, unirse
        if (!isLeader && !player) {
          setIsJoining(true);
          try {
            const res = await fetch('/api/games/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, playerName }),
            });
            const joinedGame = await res.json();
            
            if (joinedGame && joinedGame.id) {
              setGame(joinedGame);
              const newPlayer = joinedGame.players.find((p: Player) => p.name === playerName);
              setCurrentPlayer(newPlayer || null);
              
              const unsubscribe = subscribeToGame(joinedGame.id, handleGameUpdate);
              unsubscribeRef.current = unsubscribe;
            } else {
              alert('No se pudo unir al juego. Verifica el código.');
              router.push('/');
            }
          } catch (error) {
            alert('Error al unirse al juego.');
            router.push('/');
          }
          setIsJoining(false);
        } else {
          setGame(game);
          setCurrentPlayer(player || null);
          
          const unsubscribe = subscribeToGame(game.id, handleGameUpdate);
          unsubscribeRef.current = unsubscribe;
        }
      } catch (error) {
        console.error('Error inicializando juego:', error);
        alert('Error al cargar el juego.');
        router.push('/');
      }
    };

    initializeGame();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [code, playerName, isLeader]);

  useEffect(() => {
    if (game?.round_started_at && (game.status === 'discussion' || game.status === 'word_reveal')) {
      const startTime = new Date(game.round_started_at).getTime();
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = game.round_time - elapsed;
        setTimeLeft(Math.max(0, remaining));

        if (remaining <= 0 && game.status === 'discussion') {
          // Tiempo agotado, pasar a votación
          fetch('/api/games/' + game.id + '/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateStatus', status: 'voting' }),
          });
        }
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [game?.round_started_at, game?.round_time, game?.status, game?.id]);

  const handleGameUpdate = (updatedGame: Game) => {
    setGame(updatedGame);
    const player = updatedGame.players.find(p => p.name === playerName);
    setCurrentPlayer(player || null);

    // Auto-transiciones de estado
    if (updatedGame.status === 'starting' && game?.status === 'waiting') {
      setTimeout(() => {
        fetch('/api/games/' + updatedGame.id + '/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateStatus', status: 'word_reveal' }),
        });
      }, 3000);
    }

    if (updatedGame.status === 'word_reveal' && game?.status !== 'word_reveal') {
      setTimeout(() => {
        fetch('/api/games/' + updatedGame.id + '/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'updateStatus', 
            status: 'discussion',
            updates: { round_started_at: new Date().toISOString() }
          }),
        });
      }, 3000);
    }

    // Verificar si todos han respondido en modo texto
    if (updatedGame.status === 'discussion' && updatedGame.mode === 'text') {
      const nonImpostorPlayers = updatedGame.players.filter(p => !p.is_impostor);
      const allAnswered = nonImpostorPlayers.every(p => p.has_answered);
      if (allAnswered && nonImpostorPlayers.length > 0 && nonImpostorPlayers.some(p => p.has_answered)) {
        setTimeout(() => {
          fetch('/api/games/' + updatedGame.id + '/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateStatus', status: 'voting' }),
          });
        }, 2000);
      }
    }
  };

  const handleStartGame = async () => {
    if (!game || game.players.length < 3) {
      alert('Se necesitan al menos 3 jugadores para empezar');
      return;
    }
    await fetch('/api/games/' + game.id + '/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
  };

  const handleSubmitAnswer = async () => {
    if (!game || !currentPlayer || !answer.trim()) return;
    await fetch('/api/games/' + game.id + '/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'submitAnswer', 
        playerId: currentPlayer.id, 
        answer 
      }),
    });
    setAnswer('');
  };

  const handleSubmitVote = async () => {
    if (!game || !currentPlayer || !selectedVote) return;
    await fetch('/api/games/' + game.id + '/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'submitVote', 
        voterId: currentPlayer.id, 
        votedPlayerId: selectedVote 
      }),
    });
  };

  const handleNextRound = async () => {
    if (!game) return;
    await fetch('/api/games/' + game.id + '/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'nextRound' }),
    });
  };

  const handleFinishVoting = async () => {
    if (!game) return;
    await fetch('/api/games/' + game.id + '/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'processVoting' }),
    });
  };

  if (isJoining) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500">
        <div className="text-center space-y-4 p-8 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border-4 border-pink-300">
          <div className="text-5xl animate-bounce">🎮</div>
          <p className="text-2xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent">
            Uniéndose al juego...
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!game || !currentPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500">
        <div className="text-center space-y-4 p-8 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border-4 border-pink-300">
          <div className="text-5xl animate-spin">⏳</div>
          <p className="text-2xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent">
            Cargando juego...
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de espera (lobby)
  if (game.status === 'waiting') {
    const isLeader = currentPlayer.is_leader;
    const canStart = game.players.length >= 3;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* AdSense Placeholder 3 - Lateral izquierdo */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-0 hidden lg:block">
          <AdSense adSlot="3" style={{ minHeight: '600px', width: '160px' }} />
        </div>

        {/* AdSense Placeholder 4 - Lateral derecho */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-0 hidden lg:block">
          <AdSense adSlot="4" style={{ minHeight: '600px', width: '160px' }} />
        </div>

        <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-4 border-pink-300 relative z-10">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🎪</div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent mb-3">
              LOBBY
            </h1>
            <div className="space-y-2">
              <p className="text-gray-700 font-bold text-sm uppercase tracking-wide">Código del juego</p>
              <div className="px-6 py-4 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl border-2 border-pink-400 shadow-inner">
                <p className="text-6xl font-black text-pink-600 tracking-widest font-mono">
                  {game.code}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 bg-gradient-to-br from-pink-50 to-rose-50 p-5 rounded-2xl border-2 border-pink-200">
            <h2 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
              <span>👥</span>
              Jugadores ({game.players.length}/10)
            </h2>
            <div className="space-y-2">
              {game.players.map((player, index) => (
                <div
                  key={player.id}
                  className={`px-5 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                    player.id === currentPlayer.id
                      ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white shadow-lg border-2 border-pink-600'
                      : 'bg-white text-gray-800 border-2 border-pink-200 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">{index + 1}</span>
                      {player.name}
                      {player.is_leader && ' 👑'}
                      {player.id === currentPlayer.id && ' ✨'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-pink-100 p-3 rounded-xl border-2 border-pink-300 text-center">
              <div className="text-2xl mb-1">{game.mode === 'voice' ? '🎤' : '✍️'}</div>
              <div className="text-xs font-black text-pink-700 uppercase">{game.mode === 'voice' ? 'Voz' : 'Escrito'}</div>
            </div>
            <div className="bg-rose-100 p-3 rounded-xl border-2 border-rose-300 text-center">
              <div className="text-2xl mb-1">⏱️</div>
              <div className="text-xs font-black text-rose-700">{game.round_time}s</div>
            </div>
            <div className="bg-fuchsia-100 p-3 rounded-xl border-2 border-fuchsia-300 text-center">
              <div className="text-2xl mb-1">🔄</div>
              <div className="text-xs font-black text-fuchsia-700">{game.max_rounds} rondas</div>
            </div>
          </div>

          {isLeader && (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className={`w-full px-6 py-5 rounded-2xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 ${
                canStart
                  ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-2xl border-2 border-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed border-2 border-gray-300'
              }`}
            >
              {canStart
                ? `🚀 Iniciar Juego (${game.players.length} jugadores)`
                : `⏳ Esperando más jugadores (${game.players.length}/3)`}
            </button>
          )}

          {!isLeader && (
            <div className="text-center p-4 bg-pink-50 rounded-xl border-2 border-pink-200">
              <p className="text-pink-700 font-bold flex items-center justify-center gap-2">
                <span className="animate-pulse">⏳</span>
                Esperando a que el líder inicie el juego...
              </p>
            </div>
          )}

          {/* AdSense Placeholder 5 */}
          <div className="mt-6">
            <AdSense adSlot="5" style={{ minHeight: '250px' }} />
          </div>
        </div>
      </div>
    );
  }

  // Pantalla "Comenzamos a jugar"
  if (game.status === 'starting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="text-center space-y-6 p-12 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border-4 border-pink-300 relative z-10">
          <div className="text-8xl animate-bounce mb-4">🎮</div>
          <h1 className="text-7xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent animate-pulse">
            ¡Comenzamos a Jugar!
          </h1>
          <p className="text-gray-700 text-2xl font-bold">
            Preparando la primera ronda...
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de palabra
  if (game.status === 'word_reveal') {
    const isImpostor = currentPlayer.is_impostor;
    const word = isImpostor ? 'IMPOSTOR' : game.current_word;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-2xl text-center space-y-6 p-8 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border-4 border-pink-300 relative z-10">
          <div className="flex items-center justify-center gap-2 text-gray-700">
            <span className="text-3xl">🔄</span>
            <h2 className="text-3xl font-black">
              Ronda {game.current_round} de {game.max_rounds}
            </h2>
          </div>
          
          <div className={`p-10 rounded-3xl border-4 shadow-2xl transform hover:scale-105 transition-transform ${
            isImpostor 
              ? 'bg-gradient-to-br from-red-100 to-pink-100 border-red-400' 
              : 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-400'
          }`}>
            <p className={`mb-3 text-lg font-bold ${
              isImpostor ? 'text-red-700' : 'text-emerald-700'
            }`}>
              Tu palabra es:
            </p>
            <p className={`text-7xl font-black ${
              isImpostor ? 'text-red-600' : 'text-emerald-600'
            } drop-shadow-lg`}>
              {word}
            </p>
          </div>
          
          {isImpostor && (
            <div className="p-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl border-2 border-red-600 shadow-lg">
              <p className="text-white font-black text-2xl flex items-center justify-center gap-2">
                <span className="text-3xl">🎭</span>
                Eres el IMPOSTOR
              </p>
              <p className="text-white/90 font-bold mt-2">
                No dejes que te descubran
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-center gap-2 text-pink-600 font-bold">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-200"></div>
            <span className="ml-2">Preparando la discusión...</span>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de discusión
  if (game.status === 'discussion') {
    const isImpostor = currentPlayer.is_impostor;
    const hasAnswered = currentPlayer.has_answered;
    const allAnswers = game.players
      .filter(p => p.has_answered && p.answer)
      .map(p => ({ name: p.name, answer: p.answer! }));

    if (game.mode === 'voice') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 p-4 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-4 border-pink-300 relative z-10">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent mb-3">
                Ronda {game.current_round} - Discusión
              </h2>
              <div className={`text-8xl font-black mb-2 ${
                timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-pink-600'
              }`}>
                {timeLeft}s
              </div>
              <p className="text-gray-700 font-bold text-lg">⏱️ Tiempo restante</p>
            </div>

            <div className={`rounded-2xl p-5 mb-6 border-2 ${
              isImpostor 
                ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-400' 
                : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-400'
            }`}>
              <p className={`text-center font-black text-lg ${
                isImpostor ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {isImpostor 
                  ? '🎭 Eres el impostor - Intenta no ser descubierto'
                  : `Tu palabra era: ${game.current_word}`}
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border-2 border-pink-200">
              <h3 className="text-gray-800 font-black text-xl mb-3 flex items-center gap-2">
                <span>👥</span> Jugadores
              </h3>
              <div className="space-y-2">
                {game.players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`px-5 py-3 rounded-xl font-bold transition-all ${
                      player.id === currentPlayer.id
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white shadow-lg border-2 border-pink-600'
                        : 'bg-white text-gray-800 border-2 border-pink-200 shadow-md'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{index + 1}</span>
                      {player.name}
                      {player.is_impostor && isImpostor && ' 🎭'}
                      {player.id === currentPlayer.id && ' ✨'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Modo escrito
      const currentTurnPlayer = game.current_turn_player_id 
        ? game.players.find(p => p.id === game.current_turn_player_id)
        : game.players.find(p => !p.is_impostor && !p.has_answered);
      const isMyTurn = currentTurnPlayer?.id === currentPlayer.id && !hasAnswered && !currentPlayer.is_impostor;

      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 p-4 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-4 border-pink-300 space-y-6 relative z-10">
            <div className="text-center">
              <h2 className="text-4xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent mb-3">
                Ronda {game.current_round} - Escribe tu respuesta
              </h2>
              {!isImpostor && (
                <div className="inline-block px-5 py-2 bg-emerald-100 rounded-xl border-2 border-emerald-400">
                  <p className="text-emerald-700 font-bold">
                    Tu palabra era: <span className="text-2xl">{game.current_word}</span>
                  </p>
                </div>
              )}
              {isImpostor && (
                <div className="inline-block px-5 py-2 bg-red-100 rounded-xl border-2 border-red-400">
                  <p className="text-red-700 font-black text-lg flex items-center gap-2">
                    <span>🎭</span> Eres el impostor - Escribe algo convincente
                  </p>
                </div>
              )}
            </div>

            {currentPlayer.is_impostor && (
              <div className="text-center p-6 bg-red-50 rounded-2xl border-2 border-red-400">
                <p className="text-red-700 font-black text-lg flex items-center justify-center gap-2">
                  <span className="text-2xl">🎭</span>
                  Eres el impostor - Observa las respuestas de los demás
                </p>
              </div>
            )}

            {!currentPlayer.is_impostor && isMyTurn && !hasAnswered && (
              <div className="space-y-3 bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-2xl border-2 border-pink-300">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="w-full px-5 py-4 rounded-xl bg-white border-2 border-pink-400 text-gray-800 placeholder-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-300 font-bold text-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && answer.trim()) {
                      handleSubmitAnswer();
                    }
                  }}
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim()}
                  className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-black rounded-xl hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 transform hover:scale-105 active:scale-95 text-lg"
                >
                  ✨ Enviar Respuesta
                </button>
              </div>
            )}

            {!currentPlayer.is_impostor && !isMyTurn && !hasAnswered && (
              <div className="text-center p-6 bg-pink-50 rounded-2xl border-2 border-pink-200">
                <p className="text-pink-700 font-bold text-xl flex items-center justify-center gap-2">
                  <span className="animate-pulse">⏳</span>
                  Esperando a {currentTurnPlayer?.name}...
                </p>
              </div>
            )}

            {!currentPlayer.is_impostor && hasAnswered && (
              <div className="text-center p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-400">
                <p className="text-emerald-700 font-black text-lg flex items-center justify-center gap-2">
                  <span className="text-2xl">✓</span>
                  Has enviado tu respuesta. Esperando a los demás...
                </p>
              </div>
            )}

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border-2 border-pink-200">
              <h3 className="text-gray-800 font-black text-xl mb-3 flex items-center gap-2">
                <span>💬</span> Respuestas
              </h3>
              <div className="space-y-2">
                {allAnswers.length > 0 ? (
                  allAnswers.map((item, idx) => (
                    <div key={idx} className="px-4 py-3 bg-white rounded-xl border-2 border-pink-200 shadow-md">
                      <span className="font-black text-pink-600">{item.name}:</span>{' '}
                      <span className="text-gray-800 font-semibold">{item.answer}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-pink-600 text-center font-bold py-4">Aún no hay respuestas</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Pantalla de votación
  if (game.status === 'voting') {
    const hasVoted = currentPlayer.vote !== undefined;
    const voteCounts: Record<string, number> = {};
    game.votes && Object.values(game.votes).forEach(votedId => {
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    });

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-4 border-pink-300 relative z-10">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🗳️</div>
            <h2 className="text-4xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
              Votación - Ronda {game.current_round}
            </h2>
            <p className="text-gray-700 font-bold text-lg">
              ¿Quién crees que es el impostor?
            </p>
          </div>

          {!hasVoted ? (
            <div className="space-y-3 mb-6">
              {game.players
                .filter(p => p.id !== currentPlayer.id)
                .map((player, index) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedVote(player.id)}
                    className={`w-full px-6 py-4 rounded-2xl text-left font-black text-lg transition-all transform hover:scale-105 active:scale-95 ${
                      selectedVote === player.id
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white shadow-2xl border-2 border-pink-600'
                        : 'bg-white text-gray-800 border-2 border-pink-200 shadow-lg hover:bg-pink-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{index + 1}</span>
                      {player.name}
                    </span>
                  </button>
                ))}
            </div>
          ) : (
            <div className="text-center p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-400 mb-6">
              <p className="text-emerald-700 font-black text-lg flex items-center justify-center gap-2">
                <span className="text-2xl">✓</span>
                Has votado. Esperando a los demás...
              </p>
            </div>
          )}

          {!hasVoted && selectedVote && (
            <button
              onClick={handleSubmitVote}
              className="w-full px-6 py-4 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white font-black rounded-2xl hover:from-red-600 hover:via-pink-600 hover:to-rose-600 transition-all shadow-2xl hover:shadow-2xl transform hover:scale-105 active:scale-95 text-lg uppercase tracking-wide"
            >
              🎯 Confirmar Voto
            </button>
          )}

          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border-2 border-pink-200 mt-6">
            <h3 className="text-gray-800 font-black text-xl mb-3 flex items-center gap-2">
              <span>📊</span> Votos
            </h3>
            <div className="space-y-2">
              {game.players.map((player) => {
                const votes = voteCounts[player.id] || 0;
                return votes > 0 ? (
                  <div key={player.id} className="px-4 py-3 bg-white rounded-xl border-2 border-pink-200 shadow-md">
                    <span className="font-black text-pink-600">{player.name}:</span>{' '}
                    <span className="text-gray-800 font-bold text-lg">{votes} {votes === 1 ? 'voto' : 'votos'}</span>
                  </div>
                ) : null;
              })}
              {Object.keys(voteCounts).length === 0 && (
                <p className="text-pink-600 text-center font-bold py-2">Aún no hay votos</p>
              )}
            </div>
          </div>

          {currentPlayer.is_leader && Object.keys(game.votes || {}).length === game.players.length && (
            <button
              onClick={handleFinishVoting}
              className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-black rounded-2xl hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 transition-all shadow-2xl hover:shadow-2xl transform hover:scale-105 active:scale-95 text-lg uppercase tracking-wide"
            >
              ✅ Finalizar Votación
            </button>
          )}

          {/* AdSense Placeholder 6 */}
          <div className="mt-6">
            <AdSense adSlot="6" style={{ minHeight: '250px' }} />
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de resultados
  if (game.status === 'results') {
    const votedOutPlayer = game.players.find(p => p.is_voted_out);
    const wasImpostor = votedOutPlayer?.is_impostor;
    const canContinue = game.current_round < game.max_rounds;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500 p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-rose-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-4 border-pink-300 space-y-6 relative z-10">
          <div className="text-center">
            <div className="text-6xl mb-3">{wasImpostor ? '🎉' : '😱'}</div>
            <h2 className="text-4xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent mb-4">
              Resultados - Ronda {game.current_round}
            </h2>
            {votedOutPlayer && (
              <div className={`p-6 rounded-3xl border-4 shadow-2xl ${
                wasImpostor 
                  ? 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-400' 
                  : 'bg-gradient-to-br from-red-100 to-pink-100 border-red-400'
              }`}>
                <p className="text-3xl font-black mb-2 text-gray-800">
                  {votedOutPlayer.name} fue eliminado
                </p>
                <p className={`text-2xl font-black ${
                  wasImpostor ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {wasImpostor ? '✓ Era el IMPOSTOR - Todos ganan!' : '✗ No era el impostor - Impostor gana!'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-5 border-2 border-pink-200">
            <h3 className="text-gray-800 font-black text-2xl mb-4 flex items-center gap-2">
              <span>🏆</span> Puntos
            </h3>
            <div className="space-y-2">
              {game.players
                .sort((a, b) => b.points - a.points)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex justify-between items-center px-5 py-3 rounded-xl font-bold transition-all ${
                      player.id === currentPlayer.id
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white shadow-lg border-2 border-pink-600'
                        : 'bg-white text-gray-800 border-2 border-pink-200 shadow-md'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">#{index + 1}</span>
                      {player.name}
                      {player.is_impostor && ' 🎭'}
                      {player.id === currentPlayer.id && ' ✨'}
                    </span>
                    <span className="text-2xl font-black">{player.points} pts</span>
                  </div>
                ))}
            </div>
          </div>

          {canContinue && currentPlayer.is_leader && (
            <button
              onClick={handleNextRound}
              className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-black rounded-2xl hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600 transition-all shadow-2xl hover:shadow-2xl transform hover:scale-105 active:scale-95 text-lg uppercase tracking-wide"
            >
              🔄 Siguiente Ronda
            </button>
          )}

          {!canContinue && (
            <div className="text-center space-y-4 p-6 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl border-2 border-pink-300">
              <p className="text-3xl font-black text-gray-800">🎮 Juego Finalizado</p>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-black rounded-2xl hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 uppercase tracking-wide"
              >
                🏠 Volver al Inicio
              </button>
            </div>
          )}

          {/* AdSense Placeholder 7 */}
          <div className="mt-6">
            <AdSense adSlot="7" style={{ minHeight: '250px' }} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500">
        <div className="text-center space-y-4 p-8 rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl border-4 border-pink-300">
          <div className="text-5xl animate-bounce">🎮</div>
          <p className="text-2xl font-black bg-gradient-to-r from-pink-600 via-rose-600 to-fuchsia-600 bg-clip-text text-transparent">
            Cargando juego...
          </p>
        </div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  );
}

