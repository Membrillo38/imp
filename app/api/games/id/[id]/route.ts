import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { prisma } = await import('@/lib/prisma');
    const { prismaGameToGame } = await import('@/lib/game-helpers');
    
    const { id } = await params;
    const gameData = await prisma.game.findUnique({
      where: { id },
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

