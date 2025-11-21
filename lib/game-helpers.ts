// Helper functions para convertir entre Prisma y Game types
import { Game, Player, GameStatus, GameMode } from '@/types/game';
import { Game as PrismaGame } from '@prisma/client';

export function prismaGameToGame(prismaGame: PrismaGame): Game {
  return {
    id: prismaGame.id,
    code: prismaGame.code,
    status: prismaGame.status as GameStatus,
    mode: prismaGame.mode as GameMode,
    round_time: prismaGame.roundTime,
    current_round: prismaGame.currentRound,
    max_rounds: prismaGame.maxRounds,
    leader_id: prismaGame.leaderId,
    created_at: prismaGame.createdAt.toISOString(),
    players: (prismaGame.players as unknown) as Player[],
    current_word: prismaGame.currentWord || undefined,
    impostor_id: prismaGame.impostorId || undefined,
    votes: (prismaGame.votes as unknown) as Record<string, string> | undefined,
    round_started_at: prismaGame.roundStartedAt?.toISOString(),
    current_turn_player_id: prismaGame.currentTurnPlayerId || undefined,
  };
}

