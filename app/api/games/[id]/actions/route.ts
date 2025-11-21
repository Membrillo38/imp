import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { 
      startGame, 
      submitAnswer, 
      submitVote, 
      nextRound, 
      processVotingResults,
      updateGameStatus 
    } = await import('@/lib/game-utils');
    
    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    let result = false;

    switch (action) {
      case 'start':
        result = await startGame(id);
        break;
      case 'submitAnswer':
        result = await submitAnswer(id, data.playerId, data.answer);
        break;
      case 'submitVote':
        result = await submitVote(id, data.voterId, data.votedPlayerId);
        break;
      case 'nextRound':
        result = await nextRound(id);
        break;
      case 'processVoting':
        result = await processVotingResults(id);
        break;
      case 'updateStatus':
        result = await updateGameStatus(id, data.status, data.updates);
        break;
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    return NextResponse.json({ success: result });
  } catch (error) {
    console.error('Error en acción del juego:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

