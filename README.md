# WaveSage

Morning surf intelligence: live wave conditions, equipment recommendations from your quiver, and an AI coach that explains the why.

## Three engines

1. **Surf Conditions Engine** (`src/engines/conditions`) — Fetches live marine forecast data from [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api), surface wind from Open-Meteo Weather, and tide predictions from [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/) (US coastal spots).
2. **Equipment Recommendation Engine** (`src/engines/equipment`) — Scores boards and fins against current conditions and your skill level. Returns top picks with tradeoffs and how each setup would feel.
3. **AI Coach** (`src/engines/coach`) — Turns structured data into natural-language advice. Uses OpenAI when `OPENAI_API_KEY` is set; falls back to smart templates otherwise.

## Quick start

```bash
cd surf-app
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (phone / HTTPS)

See [DEPLOY.md](./DEPLOY.md) to put WaveSage on a public HTTPS host (Render recommended) so you can test from your iPhone anywhere, including User Wave reports.

## Configuration

Edit `.env.local`:

| Variable | Description |
|----------|-------------|
| `DEFAULT_LAT` / `DEFAULT_LNG` | Your home break coordinates |
| `DEFAULT_SPOT_NAME` | Display name for your spot |
| `DEFAULT_SHORE_BEARING` | Compass direction the beach faces (for offshore/onshore wind) |
| `OPENAI_API_KEY` | Optional — enables natural-language AI coach |

## Usage

- Ask **"Where's best in SoCal today?"** for a regional rundown across 19 beaches.
- Ask **"How are conditions at Huntington?"** (or any beach name) for a specific spot.
- Ask **"What board should I ride?"** for gear recommendations from your inventory.
- Preload boards and fins in the sidebar; the app ranks variations and explains differences.

## API routes

- `GET /api/conditions` — Current surf conditions
- `POST /api/recommendations` — Conditions + ranked equipment
- `POST /api/chat` — Full coach response (conditions + gear + natural language)

## Project structure

```
src/
  engines/
    conditions/   # Live data collection
    equipment/    # Matching logic
    coach/        # Natural language layer
  app/api/        # HTTP endpoints
  components/     # Chat + inventory UI
  lib/            # Shared types and inventory storage
```

## Next steps

- Spot search / geolocation for travel days
- International tide data (outside NOAA coverage)
- Persist inventory to a database instead of localStorage
- Mobile app shell (React Native) sharing the same engines
