-- Esquema de base de datos para el juego Impostor
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Crear la tabla de juegos
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  mode TEXT NOT NULL DEFAULT 'voice', -- 'voice' o 'text'
  round_time INTEGER NOT NULL DEFAULT 60,
  current_round INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 3,
  current_word TEXT,
  impostor_id UUID,
  leader_id UUID NOT NULL,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  votes JSONB DEFAULT '{}'::jsonb,
  round_started_at TIMESTAMPTZ,
  current_turn_player_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índice en el código para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);

-- Habilitar Realtime para la tabla games
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Política de seguridad: Permitir lectura pública
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON games
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON games
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON games
    FOR UPDATE USING (true);

