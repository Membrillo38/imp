# 🎭 Impostor - Juego Multijugador

Un juego multijugador en tiempo real tipo "Among Us" donde los jugadores deben encontrar al impostor. Desarrollado con Next.js, Supabase y Supabase Realtime.

## 🎮 Características

- **Multijugador en tiempo real** usando Supabase Realtime
- **Dos modos de juego**:
  - 🎤 **Modo Voz**: Discusión con temporizador
  - ✍️ **Modo Escrito**: Turnos para escribir respuestas
- **Sistema de votación** para encontrar al impostor
- **Sistema de puntos** basado en aciertos
- **Configuración personalizable**: tiempo por ronda, número de rondas
- **Diseño moderno** con colores vibrantes en tonos rosa

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd my-app
```

### 2. Instalar dependencias

npm install

### 3. Configurar Supabase y Base de Datos

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el contenido de `supabase-schema.sql`
4. Ve a **Project Settings > API** y copia:
   - `Project URL`
   - `anon public` key
5. Ve a **Project Settings > Database** y copia la **Connection string** (URI)

### 4. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa las variables:

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public
NEXT_PUBLIC_GOOGLE_ADSENSE_ID=tu_adsense_id (opcional)
```

### 5. Ejecutar el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎯 Cómo Jugar

### Crear un Juego

1. Ingresa tu nombre
2. Haz clic en "Crear Juego"
3. Configura los parámetros:
   - Modo de juego (Voz o Escrito)
   - Tiempo por ronda (30-180 segundos)
   - Número de rondas (1-5)
4. Comparte el código de 6 dígitos con tus amigos

### Unirse a un Juego

1. Ingresa tu nombre
2. Haz clic en "Unirse con Código"
3. Ingresa el código de 6 dígitos
4. Espera a que el líder inicie el juego

### Flujo del Juego

1. **Lobby**: Espera a que haya al menos 3 jugadores
2. **Inicio**: El líder inicia el juego
3. **Palabra**: Cada jugador ve una palabra (excepto el impostor)
4. **Discusión**:
   - **Modo Voz**: Todos discuten con temporizador
   - **Modo Escrito**: Turnos para escribir respuestas
5. **Votación**: Vota quién crees que es el impostor
6. **Resultados**: Ve quién fue eliminado y los puntos
7. **Siguiente Ronda** o **Fin del Juego**

### Sistema de Puntos

- **+10 puntos**: Si votas correctamente al impostor
- **+15 puntos**: Si eres el impostor y no te descubren
- **0 puntos**: Si votas incorrectamente

## 🛠️ Tecnologías

- **Next.js 16** - Framework React
- **TypeScript** - Tipado estático
- **Prisma** - ORM para base de datos
- **Supabase** - Base de datos PostgreSQL y Realtime
- **Supabase Realtime** - Sincronización en tiempo real
- **Tailwind CSS** - Estilos
- **Google AdSense** - Publicidad (opcional)

## 📁 Estructura del Proyecto

```
my-app/
├── app/
│   ├── page.tsx              # Pantalla principal
│   ├── create/
│   │   └── page.tsx          # Configuración del juego
│   └── game/
│       └── [code]/
│           └── page.tsx      # Pantalla del juego
├── lib/
│   ├── supabase.ts          # Cliente de Supabase
│   ├── prisma.ts            # Cliente de Prisma
│   ├── game-utils.ts        # Lógica del juego
│   ├── game-helpers.ts      # Helpers de conversión
│   ├── api-helpers.ts       # Helpers de API
│   └── words.ts             # Lista de palabras
├── components/
│   └── AdSense.tsx          # Componente de publicidad
├── app/api/                 # API Routes
└── prisma/
    └── schema.prisma        # Schema de Prisma
├── types/
│   └── game.ts               # Tipos TypeScript
└── supabase-schema.sql      # Esquema de base de datos
```

## 🎨 Personalización

### Cambiar palabras

Edita `lib/words.ts` para agregar o modificar las palabras del juego.

### Cambiar colores

Los colores principales están en tonos rosa. Puedes modificar los gradientes en los componentes:
- `from-pink-400 via-rose-400 to-fuchsia-500` (fondo)
- `from-pink-500 via-rose-500 to-fuchsia-500` (botones)

## 📝 Notas

- Se necesitan al menos 3 jugadores para iniciar
- El impostor se selecciona aleatoriamente al inicio
- Cada ronda tiene una palabra diferente
- El líder puede iniciar el juego y avanzar rondas

## 🐛 Solución de Problemas

#### No se conecta a la base de datos
- Verifica que `DATABASE_URL` esté correctamente configurado en `.env.local`
- Asegúrate de que el esquema SQL se haya ejecutado en Supabase
- Ejecuta `npx prisma generate` para regenerar el cliente

#### No se conecta a Supabase Realtime
- Verifica que las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctas
- Asegúrate de que Realtime esté habilitado en Supabase
- Verifica que la publicación de Realtime incluya la tabla `games`

#### Los cambios no se sincronizan
- Verifica que la publicación de Realtime incluya la tabla `games`
- Revisa la consola del navegador para errores
- El sistema usa polling como fallback si Realtime no está disponible

#### Google AdSense no aparece
- Si no hay `NEXT_PUBLIC_GOOGLE_ADSENSE_ID` configurado, se mostrarán placeholders grises
- Esto es normal y permite probar el juego sin configurar AdSense
- Se han incluido 7+ placeholders de AdSense en diferentes páginas

## 📄 Licencia

MIT
