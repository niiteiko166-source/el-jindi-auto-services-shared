# EL-JINDI Auto Services - Deployment Guide

**Deployment Target:** Vercel (frontend and Express API) + Prisma Postgres
**Cost:** Depends on your Vercel and PostgreSQL plans
**Estimated Deployment Time:** 15-20 minutes  
**Status:** Ready for Vercel deployment

> The Render instructions below are retained as legacy reference. For the active deployment, use the Vercel steps in this section.

## Vercel Deployment

1. Import the GitHub repository into Vercel.
2. Keep the project root set to the directory containing `package.json`.
3. Use these settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add these Vercel environment variables:
   - `DATABASE_URL`: your PostgreSQL connection string
   - `JWT_SECRET`: a long random production secret
   - `NODE_ENV`: `production`
   - `VERCEL`: `1`
5. Deploy. `vercel.json` routes `/api/*` to the Express serverless function and all other paths to the Vite SPA.

Prisma Postgres provides the PostgreSQL database. Copy the **pooled** connection string from the Prisma Console into Vercel as `DATABASE_URL`. The application uses the standard `pg` driver, so Prisma Client is not required for this existing data layer.

Set `PG_POOL_MAX=1` in Vercel to avoid opening unnecessary connections across serverless instances. Do not upload `.env` or database credentials to GitHub.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup (Step 1)](#database-setup-step-1)
4. [GitHub Setup (Step 2)](#github-setup-step-2)
5. [Render Setup (Step 3)](#render-setup-step-3)
6. [Verify Deployment (Step 4)](#verify-deployment-step-4)
7. [Security & Post-Deployment](#security--post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Browser (React + Vite Frontend)                        â”‚
â”‚  - Local UI state cache (localStorage)                  â”‚
â”‚  - Syncs with backend via /api/data/sync                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚ HTTPS
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Render Web Service (Node.js + Express)                 â”‚
â”‚  - REST API endpoints (/api/customers, /api/invoices)   â”‚
â”‚  - JWT authentication                                   â”‚
â”‚  - PostgreSQL adapter                                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚ Connection pooling
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Render Managed PostgreSQL (Managed DB)                 â”‚
â”‚  - Table: app_state (JSON-based data store)             â”‚
â”‚  - Managed backups (configure in Render dashboard)      â”‚
â”‚  - Secure connection (SSL)                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Key Features:**
- âœ… All data stored in PostgreSQL (cloud-backed)
- âœ… JWT authentication with secure HttpOnly cookies
- âœ… Automatic data sync across devices
- âœ… $0 cost (using free tiers)
- âœ… No server maintenance required

---

## Prerequisites

You will need:
- [ ] Render.com account (free) and a Render Managed PostgreSQL database
- [ ] [Render.com](https://render.com) account (free)
- [ ] [GitHub](https://github.com) account
- [ ] Git installed locally
- [ ] Node.js 18+ and npm installed locally (for testing)

---

## Database Setup (Step 1)

### Create a Render Managed PostgreSQL Database

1. Log in to the Render dashboard: https://dashboard.render.com
2. Click **"New +"** and choose **"Database"** â†’ **Managed PostgreSQL**
3. Enter project details:
   - **Name:** `el-jindi-auto-services-db`
   - **Region:** Select the region closest to your location
   - **Plan:** Free (or choose a paid plan for higher capacity)
4. Click **"Create new project"**
5. **Wait 2-3 minutes** for the database to initialize

### Retrieve Database Connection String

1. In your Render database instance, open the **Connection** or **Settings** tab to find the connection string
2. Click **"Database"** in the sidebar
3. Look for **"Connection string"** section
4. Copy the connection string starting with `postgresql://`
5. **Replace `[YOUR-PASSWORD]`** with the password you created above

**Example Connection String:**
```
postgresql://postgres:YourSecurePassword123!@db.abc123xyz.<host>:5432/<database>
```

âš ï¸ **Save this connection string** - you'll need it for Render

---

## GitHub Setup (Step 2)

### Push Repository to GitHub

1. **Initialize git** (if not already done):
   ```bash
   cd /path/to/el-jindi-auto-services
   git init
   git add .
   git commit -m "Initial commit: EL-JINDI Auto Services"
   git branch -M main
   ```

2. **Create a repository on GitHub:**
   - Go to [GitHub.com](https://github.com/new)
   - Create new repository named `el-jindi-auto-services`
   - Do NOT initialize with README (we have one)

3. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/el-jindi-auto-services.git
   git push -u origin main
   ```

âœ… Repository is now on GitHub - Render can access it

---

## Render Setup (Step 3)

### Connect Render to Your GitHub Repository

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** button
3. Select **"Web Service"**
4. Click **"Connect your GitHub account"** (if not already connected)
5. Authorize Render to access GitHub
6. Select your `el-jindi-auto-services` repository
7. Click **"Connect"**

### Configure Render Service

Fill in the service configuration:

| Field | Value |
|-------|-------|
| **Name** | `el-jindi-auto-services` |
| **Environment** | `Node` |
| **Region** | Choose closest to your location |
| **Branch** | `main` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

### Add Environment Variables

Scroll to **"Environment"** section and add:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres:YourPassword@db.abc123xyz.<host>:5432/<database>
JWT_SECRET=your-secret-here
```

**To generate JWT_SECRET**, run locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy and paste the 64-character string as `JWT_SECRET`.

### Deploy

1. Click **"Create Web Service"**
2. **Wait 3-5 minutes** for Render to build and deploy
3. You'll see: `EL-JINDI Auto Services Server running on...`

---

## Verify Deployment (Step 4)

### Check Build Success

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your service name
3. Click **"Logs"**
4. You should see: `EL-JINDI Auto Services Server running on http://0.0.0.0:10000`

### Test Application

1. Click the service URL (something like `https://el-jindi-auto-services.onrender.com`)
2. You should see the EL-JINDI login page
3. **Login with default credentials:**
   - Username: `admin`
   - Password: `password`

### Test Multi-Device Sync

1. Open app on Device A (browser)
2. Login and create a test customer named "Test Company"
3. Open app on Device B (another browser/device)
4. Login - the test customer should appear âœ…

### Test API Endpoints

**Health Check:**
```bash
curl https://el-jindi-auto-services.onrender.com/api/health
```

**Login Request:**
```bash
curl -X POST https://el-jindi-auto-services.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt
```

**Get Customers (with authentication):**
```bash
curl https://el-jindi-auto-services.onrender.com/api/customers \
  -b cookies.txt
```

---

## Security & Post-Deployment

### âš ï¸ CRITICAL: Change Default Passwords

1. Log in as `admin` with password `password`
2. Go to **Settings** â†’ **Users**
3. Change admin password immediately
4. Change all other default user passwords

### Set Up SSL (Automatic)

âœ… Render provides free SSL certificates automatically - your app is accessible over HTTPS

### Enable Database Backups

1. Go to the Render dashboard and open your database instance
2. Click **"Backups"** under **"Tools"**
3. Backups are created automatically daily
4. Can manually trigger backup anytime

### Monitor Application

1. Check Render logs weekly for errors
2. Monitor the Render database instance for health and active connections
3. Check for failed payments (Render will notify if subscription issues)

---

## Troubleshooting

### Issue: "Build failed"
**Solution:** Check Render logs for errors
- Verify all environment variables are set
- Check DATABASE_URL format (must include password)
- Verify `npm install` completes successfully

### Issue: "Cannot connect to database"
**Solution:** 
- [ ] DATABASE_URL must have `[YOUR-PASSWORD]` replaced
- [ ] Render Managed Postgres instance shows as "Available"
- [ ] Connection string copied correctly from Render
- [ ] No special characters need escaping

### Issue: "Server crashes immediately"
**Solution:**
- [ ] JWT_SECRET is set and non-empty
- [ ] NODE_ENV is `production`
- [ ] PORT is `10000`

### Issue: "Login fails"
**Solution:**
- [ ] Clear browser cookies and cache
- [ ] Try incognito/private browser
- [ ] Check /api/auth/login with curl (see Test API Endpoints)

### Issue: "Data disappears after restart"
**Solution:**
- [ ] Data syncs to PostgreSQL on every change
- [ ] Check Render database is running (dashboard shows available)
- [ ] Verify DATABASE_URL can connect (test with psql locally)

### Issue: "Application is slow"
**Solution:**
- [ ] Render free tier has 0.5GB RAM - normal for heavy ops
- [ ] Upgrade to paid plan if needed
- [ ] Check Render database connection/limits
- [ ] Monitor active connections in Render dashboard

---

## Updating Your Application

### Deploy Updates from GitHub

1. Make changes locally:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

2. Render automatically redeploys within 1-2 minutes

### Manual Redeploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your service
3. Click **"Manual Deploy"** â†’ **"Deploy latest commit"**

---

## Scaling Beyond Free Tier

When you outgrow the free tier:

**Render Upgrade ($7+/month):**
- Render dashboard â†’ Select plan

**Managed Postgres Upgrade ($25+/month):**
- Render dashboard â†’ Settings â†’ Billing â†’ Change plan

---

## Support & Resources

- **Render Docs:** https://render.com/docs
- **Render Docs:** https://render.com/docs/databases
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Express.js Docs:** https://expressjs.com
- **GitHub Issues:** Report bugs in repository issues tab

---

**Deployment Checklist:**

- [ ] Render Managed Postgres instance created
- [ ] Database connection string retrieved
- [ ] Repository pushed to GitHub
- [ ] Render service created
- [ ] Environment variables set (NODE_ENV, DATABASE_URL, JWT_SECRET)
- [ ] Build succeeded
- [ ] Application loads and accepts login
- [ ] Multi-device sync works
- [ ] Default passwords changed
- [ ] First backup created

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** âœ… Production Ready

