# Deploy WaveSage to a public HTTPS host (phone testing anywhere)

WaveSage stores accounts and User Wave report photos on disk.
Use a host with a **persistent volume** (Render / Railway / Fly).
Do **not** use Vercel serverless for report testing — files will not stick.

## Recommended: Render (HTTPS + disk)

### 1. Put the project on GitHub

1. Install [Git for Windows](https://git-scm.com/download/win) if needed.
2. Create a new empty repo on GitHub (no README).
3. In this folder:

```bash
git init
git add .
git commit -m "Prepare WaveSage for Render deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USER/surf-app.git
git push -u origin main
```

Do **not** commit `.env.local` or `data/users.json` (already gitignored).

### 2. Create the Render service

1. Sign up at [https://render.com](https://render.com) with GitHub.
2. **New** → **Blueprint** → select this repo (uses `render.yaml`),  
   **or** **New Web Service** → Docker → this repo.
3. Add env vars:
   - `AUTH_SECRET` — long random string (Render can generate it)
   - `WAVESAGE_DATA_DIR=/data`
   - `OPENAI_API_KEY` — optional
4. Attach a **persistent disk** mounted at `/data` (1 GB is enough).
5. Deploy. Render gives you a URL like `https://wavesage.onrender.com`.

Starter plan is required for disks; free instances sleep and have no persistent disk.

### 3. Test on iPhone

1. Open the `https://…onrender.com` URL in Safari.
2. Create an account / sign in.
3. Share → **Add to Home Screen**.
4. For User Wave reports: allow Location, submit a photo **within ~2 miles** of the spot.

Point Capacitor at the same URL when you build the native shell:

```bash
set CAPACITOR_SERVER_URL=https://YOUR-APP.onrender.com
npm run mobile:ios
```

## Alternatives

| Host | Notes |
|------|--------|
| Railway | `railway up` + volume at `/data`, set `WAVESAGE_DATA_DIR=/data` |
| Fly.io | Dockerfile + volume mounted at `/data` |
| Vercel | Fine for UI only; **not** for lasting accounts/report photos |

## Local HTTPS tunnel (PC must stay on)

If you only need HTTPS while developing:

```bash
npm run dev:lan
npx --yes cloudflared tunnel --url http://localhost:3000
```

Use the printed `https://…trycloudflare.com` URL on your phone. This stops when your PC sleeps.
