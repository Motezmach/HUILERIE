# 🚀 Get Ready

## 0. Requirements (install these first)
- **Node.js** v18 or higher → [nodejs.org](https://nodejs.org)
- **npm** comes with Node.js (no separate install needed)
- **Git** → [git-scm.com](https://git-scm.com)

> Check versions after install:
> ```bash
> node -v
> npm -v
> ```

---

## 1. Install dependencies
```bash
npm install
```

## 2. Create your `.env` file
Create a file named `.env` in the root folder with:
```
DATABASE_URL="your-postgres-connection-string"
JWT_SECRET="your-secret-key"
```
> Use a free [Neon](https://neon.tech) database for `DATABASE_URL`

## 3. Setup the database
```bash
npx prisma migrate deploy
```
> This creates all the tables in your database.

## 4. Run locally
```bash
npm run dev
```
> App runs at `http://localhost:3000`

## 5. Default login
```
Username: admin
Password: admin123
```

---

## ☁️ Deploy to Vercel
Add these environment variables in Vercel dashboard:
- `DATABASE_URL`
- `JWT_SECRET`

Then push to GitHub — Vercel will auto-deploy.

---

## ⚠️ Notes
- Do **not** use Prisma Accelerate (`prisma://`) — use a direct Postgres URL
- The `.env` file is **not** included in the repo (gitignored) — you must create it manually
