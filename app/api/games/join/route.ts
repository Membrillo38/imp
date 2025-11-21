import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { joinGame } = await import('@/lib/game-utils');
    const body = await request.json();
    const { code, playerName } = body;

    if (!code || !playerName) {
      return NextResponse.json({ error: 'Código y nombre requeridos' }, { status: 400 });
    }

    const game = await joinGame(code, playerName);
    
    if (!game) {
      return NextResponse.json({ error: 'No se pudo unir al juego' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error uniéndose al juego:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

