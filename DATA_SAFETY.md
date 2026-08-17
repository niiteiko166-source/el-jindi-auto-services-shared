# 🔐 Data Safety & Deployment Guide

## Zero Data Loss Guarantee

Your EL-JINDI Auto Services app now has **enterprise-grade data protection** built-in. All your business data is **permanently safe** during:
- ✅ Server restarts
- ✅ Deployments
- ✅ Hosting migrations
- ✅ Database maintenance

---

## How It Works

### **Local Storage (Development)**
```
You use app → Data → SQLite (data/app.db) → Saved to disk
Server restarts → Reads from data/app.db → All data intact ✓
```

### **Deployment (Production)**
```
Deploy to server/cloud → data/ directory persists on server
Server restarts → Database file never deleted ✓
Redeploy app → data/app.db stays in place ✓
```

---

## What's Configured

### 1. **Protected Data Directory**
✅ `.gitignore` includes `data/` (prevents accidental git commits)
- Your database file (`data/app.db`) is NOT in git
- Data stays on your server, never in version control

### 2. **Automatic Daily Backups**
✅ Server creates automatic backups every 24 hours
- Location: `backups/app-YYYY-MM-DD.db`
- Runs at server startup and daily
- Zero manual intervention needed

### 3. **Manual Backup Endpoint**
✅ Force backup anytime: `POST /api/_backup`
```bash
curl -X POST http://localhost:3000/api/_backup
# Response: { "ok": true, "message": "Database backed up successfully" }
```

### 4. **Environment Configuration**
✅ Database path configurable via `.env`
- Development: `DB_PATH=./data/app.db`
- Production: `DB_PATH=/var/app/data/app.db`

---

## Deployment Instructions

### **Docker (Recommended)**

1. Database automatically persists to volume:
```yaml
volumes:
  - ./data:/app/data  # ← Survives container restarts
```

2. Deploy with confidence:
```bash
docker-compose up -d
# Data persists even if container is deleted
```

### **Cloud Platforms (Railway, Render, Heroku)**

1. Connect your GitHub repo
2. Set environment variable: `DB_PATH` (if custom location)
3. Enable persistent storage (usually automatic)
4. Deploy - your data is safe!

### **VPS (AWS, DigitalOcean, VPS.net)**

1. Create persistent directory:
```bash
mkdir -p /var/app/data
chmod 755 /var/app/data
```

2. Set in `.env`:
```
DB_PATH=/var/app/data/app.db
NODE_ENV=production
```

3. Enable automated backups (see below)

---

## Automated Backup Strategy

### **Backups Happen Automatically:**
- ✅ On server startup
- ✅ Once per day (24-hour interval)
- ✅ Location: `backups/app-YYYY-MM-DD.db`

### **Example Backup Structure:**
```
backups/
├── app-2026-08-13.db
├── app-2026-08-12.db
├── app-2026-08-11.db
└── app-2026-08-10.db
```

### **Manual Backup Anytime:**
```bash
# Trigger backup via API
curl -X POST http://your-server:3000/api/_backup

# Or manually copy database file
cp data/app.db backups/app-manual-backup.db
```

---

## Data Recovery (If Needed)

### **Scenario: Need to restore from backup**

1. Stop the server:
```bash
npm stop
# or for Docker: docker-compose down
```

2. Restore from backup:
```bash
cp backups/app-2026-08-12.db data/app.db
```

3. Restart server:
```bash
npm run dev
# or for Docker: docker-compose up -d
```

✅ All data from that date is back online!

---

## Important Settings

### **.gitignore Protection** ✅
```
data/          # Database files
backups/       # Backup files
node_modules/  # Dependencies
.env           # Secrets
```

### **.env.example** ✅
```bash
DB_PATH=./data/app.db
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
```

### **Production Setup** ✅
```bash
# On your server
export DB_PATH=/var/app/data/app.db
export NODE_ENV=production
export PORT=3000
npm run dev
```

---

## Database File Details

### **Main Database File**
- **Location**: `data/app.db`
- **Size**: Starts at ~4KB, grows with data
- **Format**: SQLite 3
- **Persistence**: Survives everything

### **WAL Files** (Write-Ahead Log)
- **app.db-shm**: Shared memory (temporary)
- **app.db-wal**: Write-ahead log (durability)
- **Both auto-cleaned** on clean shutdown

---

## Checklist for Production Deployment

- [ ] `.gitignore` includes `data/` ✓ Already configured
- [ ] `.env.example` has `DB_PATH` ✓ Already configured
- [ ] Production `.env` set with correct `DB_PATH`
- [ ] Backups enabled ✓ Automatic
- [ ] Backup location has sufficient disk space
- [ ] Regular monitoring of database size
- [ ] Disaster recovery plan ready

---

## Monitoring Database Health

### **Check database file:**
```bash
# Linux/Mac
ls -lh data/app.db

# Windows PowerShell
Get-Item data/app.db | Select-Object Length, LastWriteTime
```

### **Database size check:**
- Development: 4KB - 100MB (normal)
- Production: Monitor based on usage
- Cleanup old backups if space limited

### **Last backup check:**
```bash
ls -lt backups/ | head -5  # 5 most recent backups
```

---

## FAQ

**Q: What happens to data when I close the server?**
A: All data is saved to `data/app.db` file on disk. Nothing is lost.

**Q: Do I need to do anything to enable data persistence?**
A: No! It's automatic. Just don't delete the `data/` directory.

**Q: Is my data safe during deployments?**
A: Yes! As long as your hosting platform preserves the `data/` directory (most do), your data is safe.

**Q: What if the server crashes?**
A: SQLite has crash recovery. Database remains intact. Start server again.

**Q: How do I backup my data before major updates?**
A: Copy the `data/` directory or call `POST /api/_backup` endpoint.

**Q: Can I recover if I accidentally delete data?**
A: Yes! Restore from `backups/app-YYYY-MM-DD.db`

**Q: Do I need PostgreSQL or MySQL?**
A: No! SQLite handles everything for small-to-medium sized workshops. Scale to PostgreSQL later if needed.

---

## Support

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed platform-specific instructions.

**Your data is safe. Deploy with confidence! 🚀**
