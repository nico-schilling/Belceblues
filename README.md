# Belceblues · Setlists

PWA para crear, compartir e imprimir los setlists de **Belceblues** en cada show.

- **Repertorio** sincronizado con la playlist de Spotify de la banda (se agregan las nuevas, se marcan las que salen; tonos, notas y etiquetas cargadas por la banda se conservan).
- **Shows**: elegir canciones de la playlist, ordenarlas arrastrando, intermedios entre sets, tono de cada canción, transiciones (enganchado, cuenta, fade, corte…) y observaciones.
- **Proponer**: pregunta rango etario, estilos, ánimo, tipo de evento, nivel de energía, duración y cantidad de sets, y arma un setlist con curva de energía (arranca arriba, respira al medio, cierra a full).
- **PDF**: versión *escenario* (letra grande) y *detallada*; en el teléfono se comparte directo (WhatsApp, mail…) o se descarga.
- **Compartido**: todos los integrantes ven lo mismo (Supabase) y los cambios llegan en vivo.

## Stack

Vite + React + TypeScript · `vite-plugin-pwa` · Supabase (Postgres + RLS) · Spotify Web API (PKCE, sin backend) · jsPDF · dnd-kit.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173/Belceblues/
npm run build
npm run lint
```

`.env` tiene la URL y la clave **publicable** de Supabase (son públicas por diseño). El acceso a los datos lo controla el **código de banda**: la app lo manda en el header `x-band-code` y las políticas RLS lo validan contra un hash bcrypt guardado en `private.band_secret`. El esquema está en `supabase/migrations/`.

Para cambiar el código de banda, en el SQL Editor de Supabase:

```sql
insert into private.band_secret (id, code_hash)
values (true, extensions.crypt('NUEVO-CODIGO', extensions.gen_salt('bf')))
on conflict (id) do update set code_hash = excluded.code_hash;
```

## Spotify

1. En <https://developer.spotify.com/dashboard> (cuenta dueña de la playlist, con Premium) crear una app con **Web API**.
2. Redirect URI: `https://nico-schilling.github.io/Belceblues/` (y `http://127.0.0.1:5173/Belceblues/` para desarrollo).
3. En *User Management* agregar a quienes vayan a sincronizar (máx. 5 en modo desarrollo).
4. En la app → **Ajustes**: pegar el link de la playlist y el Client ID → *Conectar con Spotify* → *Sincronizar*.

La cuenta que sincroniza debe ser dueña o colaboradora de la playlist (restricción de Spotify desde 2026).

## Deploy

Cada push a `main` publica en GitHub Pages vía `.github/workflows/deploy.yml`.
Requiere una vez: **Settings → Pages → Source: GitHub Actions**.

## Instalar en el teléfono

- **iPhone**: Safari → Compartir → *Agregar a pantalla de inicio*.
- **Android**: Chrome → ⋮ → *Instalar app*.
