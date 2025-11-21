import { supabase, isSupabaseConfigured } from './supabase';
import { Game, Player, GameStatus, GameSettings, GameMode } from '@/types/game';
import { getRandomWord } from './words';
import { prismaGameToGame } from './game-helpers';

// Importar Prisma solo cuando sea necesario (server-side)
// Esto evita que Prisma se incluya en el bundle del cliente
async function getPrisma() {
  if (typeof window !== 'undefined') {
    throw new Error('Prisma solo puede usarse en el servidor');
  }
  const { prisma } = await import('./prisma');
  return prisma;
}

export async function createGame(leaderName: string, settings: GameSettings): Promise<Game | null> {
  try {
    const prisma = await getPrisma();
    
    // Generar código único de 6 dígitos
    let code: string;
    let isUnique = false;
    
    while (!isUnique) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await prisma.game.findUnique({ where: { code } });
      if (!existing) isUnique = true;
    }
    
    const leader: Player = {
      id: crypto.randomUUID(),
      name: leaderName,
      is_impostor: false,
      is_leader: true,
      points: 0,
    };

    const gameData = await prisma.game.create({
      data: {
        id: crypto.randomUUID(),
        code: code!,
        status: 'waiting',
        mode: settings.mode,
        roundTime: settings.roundTime,
        currentRound: 0,
        maxRounds: settings.maxRounds,
        leaderId: leader.id,
        players: [leader] as unknown as any,
      },
    });

    return prismaGameToGame(gameData);
  } catch (error) {
    console.error('Error creando juego:', error);
    return null;
  }
}

export async function joinGame(code: string, playerName: string): Promise<Game | null> {
  try {
    const prisma = await getPrisma();
    const gameData = await prisma.game.findUnique({
      where: { code },
    });

    if (!gameData) {
      console.error('Juego no encontrado');
      return null;
    }

    const players = (gameData.players as unknown) as Player[];
    
    // Verificar que el juego no haya empezado
    if (gameData.status !== 'waiting') {
      return null;
    }

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: playerName,
      is_impostor: false,
      is_leader: false,
      points: 0,
    };

    const updatedPlayers = [...players, newPlayer];

    const updatedGame = await prisma.game.update({
      where: { id: gameData.id },
      data: { players: updatedPlayers as any },
    });

    return prismaGameToGame(updatedGame);
  } catch (error) {
    console.error('Error uniéndose al juego:', error);
    return null;
  }
}

export async function startGame(gameId: string): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const gameData = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!gameData) {
      return false;
    }

    const players = (gameData.players as unknown) as Player[];

    // Verificar que hay al menos 3 jugadores
    if (players.length < 3) {
      return false;
    }

    // Seleccionar impostor aleatorio
    const impostorIndex = Math.floor(Math.random() * players.length);
    const updatedPlayers = players.map((player, index) => ({
      ...player,
      is_impostor: index === impostorIndex,
    }));

    const impostorId = updatedPlayers[impostorIndex].id;
    const word = getRandomWord();

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'starting',
        currentRound: 1,
        players: updatedPlayers as unknown as any,
        impostorId: impostorId,
        currentWord: word,
        roundStartedAt: new Date(),
      },
    });

    // Notificar cambio a través de Supabase Realtime si está disponible
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('games')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', gameId);
      } catch (error) {
        // Ignorar errores de Realtime
      }
    }

    return true;
  } catch (error) {
    console.error('Error iniciando juego:', error);
    return false;
  }
}

export async function updateGameStatus(gameId: string, status: GameStatus, updates?: Partial<Game>): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const gameData = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!gameData) {
      return false;
    }

    const updateData: any = {
      status,
      ...(updates?.round_started_at && { roundStartedAt: new Date(updates.round_started_at) }),
      ...(updates?.current_turn_player_id && { currentTurnPlayerId: updates.current_turn_player_id }),
    };
    
    // Si estamos pasando a discusión en modo texto, establecer el primer turno
    if (status === 'discussion' && gameData.mode === 'text') {
      const players = (gameData.players as unknown) as Player[];
      if (!updateData.currentTurnPlayerId) {
        const firstPlayer = players.find(p => !p.is_impostor && !p.has_answered);
        if (firstPlayer) {
          updateData.currentTurnPlayerId = firstPlayer.id;
        }
      }
    }
    
    await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    });

    // Notificar cambio a través de Supabase Realtime si está disponible
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('games')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', gameId);
      } catch (error) {
        // Ignorar errores de Realtime
      }
    }

    return true;
  } catch (error) {
    console.error('Error actualizando estado del juego:', error);
    return false;
  }
}

export async function submitAnswer(gameId: string, playerId: string, answer: string): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const gameData = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!gameData) {
      return false;
    }

    const players = (gameData.players as unknown) as Player[];
    const updatedPlayers = players.map(player => 
      player.id === playerId 
        ? { ...player, has_answered: true, answer }
        : player
    );

    // En modo texto, avanzar al siguiente jugador que no haya respondido
    let nextTurnPlayerId = gameData.currentTurnPlayerId;
    if (gameData.mode === 'text') {
      const remainingPlayers = updatedPlayers.filter(p => !p.has_answered && !p.is_impostor);
      
      if (remainingPlayers.length > 0) {
        const nextPlayer = remainingPlayers[0];
        nextTurnPlayerId = nextPlayer.id;
      } else {
        nextTurnPlayerId = null;
      }
    }

    const updateData: any = { 
        players: updatedPlayers as unknown as any,
    };
    
    if (gameData.mode === 'text') {
      updateData.currentTurnPlayerId = nextTurnPlayerId;
    }

    await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    });

    // Notificar cambio a través de Supabase Realtime si está disponible
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('games')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', gameId);
      } catch (error) {
        // Ignorar errores de Realtime
      }
    }

    return true;
  } catch (error) {
    console.error('Error enviando respuesta:', error);
    return false;
  }
}

export async function submitVote(gameId: string, voterId: string, votedPlayerId: string): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const gameData = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!gameData) {
      return false;
    }

    const votes = ((gameData.votes as unknown) as Record<string, string>) || {};
    votes[voterId] = votedPlayerId;

    await prisma.game.update({
      where: { id: gameId },
        data: { votes: votes as unknown as any },
    });

    // Notificar cambio a través de Supabase Realtime si está disponible
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('games')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', gameId);
      } catch (error) {
        // Ignorar errores de Realtime
      }
    }

    return true;
  } catch (error) {
    console.error('Error enviando voto:', error);
    return false;
  }
}

export async function nextRound(gameId: string): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const gameData = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!gameData) {
      return false;
    }

    if (gameData.currentRound >= gameData.maxRounds) {
      return updateGameStatus(gameId, 'finished');
    }

    const word = getRandomWord();
    const players = (gameData.players as unknown) as Player[];
    const updatedPlayers = players.map(player => ({
      ...player,
      has_answered: false,
      answer: undefined,
      vote: undefined,
      is_voted_out: false,
    }));

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'word_reveal',
        currentRound: gameData.currentRound + 1,
        players: updatedPlayers as unknown as any,
        currentWord: word,
        votes: {},
        roundStartedAt: new Date(),
        currentTurnPlayerId: null,
      },
    });

    // Notificar cambio a través de Supabase Realtime si está disponible
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('games')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', gameId);
      } catch (error) {
        // Ignorar errores de Realtime
      }
    }

    return true;
  } catch (error) {
    console.error('Error avanzando ronda:', error);
    return false;
  }
}

export async function processVotingResults(gameId: string): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const gameData = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!gameData) {
      return false;
    }

    const votes = ((gameData.votes as unknown) as Record<string, string>) || {};
    const impostorId = gameData.impostorId;
    const players = (gameData.players as unknown) as Player[];

    // Contar votos
    const voteCounts: Record<string, number> = {};
    Object.values(votes).forEach(votedId => {
      if (votedId) {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
      }
    });

    // Encontrar el más votado
    const mostVotedId = Object.keys(voteCounts).length > 0
      ? Object.entries(voteCounts).reduce((a, b) => 
          voteCounts[a[0]] > voteCounts[b[0]] ? a : b
        )?.[0]
      : undefined;

    const updatedPlayers = players.map(player => {
      let points = player.points;
      const wasVotedOut = mostVotedId ? player.id === mostVotedId : false;
      const isImpostor = player.id === impostorId;

      // Si el impostor fue votado correctamente
      if (wasVotedOut && isImpostor) {
        if (!isImpostor && votes[player.id] === impostorId) {
          points += 10;
        }
      } else if (wasVotedOut && !isImpostor) {
        if (isImpostor) {
          points += 15;
        }
      } else if (!wasVotedOut && isImpostor) {
        points += 15;
      }

      return {
        ...player,
        points,
        is_voted_out: wasVotedOut,
      };
    });

    await prisma.game.update({
      where: { id: gameId },
      data: {
        players: updatedPlayers as unknown as any,
        status: 'results',
      },
    });

    // Notificar cambio a través de Supabase Realtime si está disponible
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('games')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', gameId);
      } catch (error) {
        // Ignorar errores de Realtime
      }
    }

    return true;
  } catch (error) {
    console.error('Error procesando resultados de votación:', error);
    return false;
  }
}

// subscribeToGame movido a lib/game-subscription.ts para evitar importar Prisma en el cliente

