# Chord Transposer

Upload a screenshot of a chord sheet → transpose to any key instantly.

---

## Deploy to Vercel (step by step)

### What you need first
- A free account at github.com
- A free account at vercel.com (sign up with GitHub)
- Your Anthropic API key from console.anthropic.com

---

### Step 1 — Put the code on GitHub

1. Go to github.com → click the **+** icon → **New repository**
2. Name it `chord-transposer`, leave it Public, click **Create repository**
3. On your computer, open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chord-transposer.git
git push -u origin main
```

(Replace YOUR_USERNAME with your GitHub username)

---

### Step 2 — Deploy on Vercel

1. Go to vercel.com → **Add New Project**
2. Click **Import** next to your `chord-transposer` repository
3. Leave all settings as default — Vercel auto-detects Vite
4. Click **Deploy** and wait ~1 minute

Your app is now live! But the API won't work yet — we need to add your key.

---

### Step 3 — Add your API key (the secret part)

1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key (sk-ant-...)
   - **Environment:** Production, Preview, Development (tick all three)
3. Click **Save**
4. Go to **Deployments** → click the three dots on your latest deployment → **Redeploy**

That's it. Your app is live at `your-project-name.vercel.app` 🎉

---

### Future updates

Any time you want to update the app, just edit the code and run:

```bash
git add .
git commit -m "describe your change"
git push
```

Vercel automatically redeploys within about 30 seconds.

---

## Project structure

```
chord-transposer/
├── api/
│   └── extract.js        ← Vercel serverless function (holds API key)
├── src/
│   ├── main.jsx          ← React entry point
│   └── App.jsx           ← The full app
├── index.html
├── package.json
└── vite.config.js
```
