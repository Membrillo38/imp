import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { createGame } = await import('@/lib/game-utils');
    const body = await request.json();
    const { leaderName, settings } = body;

    if (!leaderName || !settings) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const game = await createGame(leaderName, settings);
    
    if (!game) {
      return NextResponse.json({ error: 'Error al crear el juego' }, { status: 500 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error creando juego:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

