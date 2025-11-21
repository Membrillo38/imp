// Helper para hacer llamadas a API desde el cliente
// Como Prisma solo funciona en el servidor, necesitamos crear API routes

export async function getGameByCode(code: string) {
  const res = await fetch(`/api/games/${code}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getGameById(id: string) {
  const res = await fetch(`/api/games/id/${id}`);
  if (!res.ok) return null;
  return res.json();
}

