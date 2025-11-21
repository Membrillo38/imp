import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { prisma } = await import('@/lib/prisma');
    const { prismaGameToGame } = await import('@/lib/game-helpers');
    
    const { code } = await params;
    const gameData = await prisma.game.findUnique({
      where: { code },
    });

    if (!gameData) {
      return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 });
    }

    const game = prismaGameToGame(gameData);
    return NextResponse.json(game);
  } catch (error) {
    console.error('Error obteniendo juego:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

