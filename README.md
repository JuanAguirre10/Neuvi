# Neuvi — MVP

Plataforma web de gestión para psicólogos independientes y centros psicológicos en Perú: agenda sin cruces, pacientes con historia clínica, paquetes de sesiones, pagos, aviso automático de renovación, recordatorios por WhatsApp y reportes.

- Planificación y alcance: [`docs/PLANIFICACION.md`](docs/PLANIFICACION.md)
- Stack: Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma 6 · PostgreSQL (Neon) · Vercel

## Requisitos

- Node.js 20 o superior (probado con Node 24)
- Una base PostgreSQL. Se recomienda [Neon](https://neon.tech), que es la misma que usa Vercel.

## Puesta en marcha local

```bash
npm install
cp .env.example .env        # completa DATABASE_URL, DATABASE_URL_UNPOOLED y SESSION_SECRET
npm run db:migrate          # crea las tablas (o: npm run db:push)
npm run db:seed             # datos de demostración (BORRA los datos existentes)
npm run dev                 # http://localhost:3000
```

### Usuarios de demostración

Todos usan la contraseña **`neuvi2026`**.

| Correo | Rol | Organización |
|---|---|---|
| `admin@bienestar.pe` | Administradora | Centro Psicológico Bienestar |
| `recepcion@bienestar.pe` | Recepción | Centro Psicológico Bienestar |
| `lucia@bienestar.pe` | Psicóloga (adultos) | Centro Psicológico Bienestar |
| `diego@bienestar.pe` | Psicólogo (infantil) | Centro Psicológico Bienestar |
| `andrea@bienestar.pe` | Psicóloga (pareja) | Centro Psicológico Bienestar |
| `ana@neuvi.demo` | Psicóloga independiente | Consultorio Ps. Ana Torres |

Para ver la historia clínica, entra como el psicólogo tratante (por ejemplo `lucia@bienestar.pe`). Ni la recepción ni la administradora pueden verla.

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run typecheck` / `npm run lint` | Verificación de tipos / ESLint |
| `npm run db:migrate` | Crea y aplica una migración (desarrollo) |
| `npm run db:deploy` | Aplica migraciones pendientes (producción) |
| `npm run db:seed` | Carga datos demo |
| `npm run db:studio` | Explorador visual de la BD |

## Despliegue en Vercel

1. Sube el proyecto a GitHub e impórtalo en Vercel. Si `neuvi/` está dentro de otro repositorio, configura **Root Directory = `neuvi`**.
2. En **Storage → Marketplace**, agrega **Neon**. Esto crea `DATABASE_URL` y `DATABASE_URL_UNPOOLED`. Si ya tienes una base en Neon, puedes pegar sus URLs en ambas variables.
3. Agrega las variables de entorno:
   - `SESSION_SECRET`: genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
   - `NEXT_PUBLIC_NEUVI_WHATSAPP`: `51972540056`.
4. Usa este **Build Command**: `prisma generate && prisma migrate deploy && next build`.
5. Despliega. Para cargar los datos demo en producción, ejecuta `npm run db:seed` localmente con las variables de Neon.

## Seguridad y datos sensibles

- La historia clínica y las notas de evolución solo las ve el psicólogo tratante (`src/lib/permissions.ts`).
- Nadie puede asignarse a sí mismo un paciente con historia clínica de otro profesional, y cada cambio de psicólogo tratante queda en una bitácora visible en la ficha (`src/lib/domain/assignments.ts`).
- Las contraseñas se guardan con bcrypt y la sesión es una cookie `httpOnly` firmada.
- Los mensajes de WhatsApp nunca incluyen información clínica.
- Los datos de salud son *datos sensibles* según la Ley N.º 29733. Antes de un piloto real se debe publicar la política de privacidad.
