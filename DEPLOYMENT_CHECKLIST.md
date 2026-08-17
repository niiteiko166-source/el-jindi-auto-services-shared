# Production Deployment Checklist

## Pre-Deployment Requirements

### Security Hardening
- [ ] Change all default passwords (Admin account)
- [ ] Generate strong JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Configure HTTPS/TLS via reverse proxy (nginx or Apache)
- [ ] Set up firewall rules to restrict access to internal network only
- [ ] Disable public internet exposure of port 3000
- [ ] Configure CORS_ALLOWED_ORIGINS for trusted domains only
- [ ] Review and enable audit logging

### Database & Backups
- [ ] Enable automated database backups (DB_BACKUP_ENABLED=true)
- [ ] Set backup retention policy (DB_BACKUP_RETENTION_DAYS)
- [ ] Test backup creation and verify integrity
- [ ] Test restore procedure from backup
- [ ] Document backup location and access procedures
- [ ] Set up off-site backup replication (recommended)
- [ ] Verify backup automation runs daily

### Environment Configuration
- [ ] Create .env file with production values (do NOT commit to git)
- [ ] Set NODE_ENV=production
- [ ] Set APP_VERSION to current release version
- [ ] Configure LOG_LEVEL (info or warn for production)
- [ ] Set SESSION_TIMEOUT_MINUTES appropriate for use case
- [ ] Review all environment variables for correctness

### Data Integrity
- [ ] Run data integrity check: `curl http://localhost:3000/api/_integrity`
- [ ] All checks should PASS (no orphaned records)
- [ ] Fix any FAIL or WARNING status before deployment
- [ ] Run health check: `curl http://localhost:3000/api/_health`

### Access Control & Users
- [ ] Verify Admin user exists and is configured correctly
- [ ] Create accounts for all required staff
- [ ] Assign appropriate roles (Admin, Manager, Technician, Receptionist)
- [ ] Test role-based access control for critical operations
- [ ] Ensure only Admin can access: /api/_backup, /api/_restore, /api/_integrity
- [ ] Verify non-admin users cannot delete invoices/payments

### Testing & Validation
- [ ] Run full system build: `npm run build`
- [ ] Verify no TypeScript errors: `npm run lint`
- [ ] Test login flow with each user role
- [ ] Create test invoice, verify calculations
- [ ] Record test payment, verify balance updates
- [ ] Test invoice deletion as Admin (and verify non-admin cannot delete)
- [ ] Test payment deletion as Admin
- [ ] Verify debtor list calculates correctly
- [ ] Verify dashboard totals are accurate
- [ ] Test customer search with large dataset
- [ ] Verify all reports generate correctly
- [ ] Test PDF invoice/quotation printing

### Network & Connectivity
- [ ] Configure static IP address for server machine
- [ ] Document network URL for client access
- [ ] Test access from other machines on LAN: `http://192.168.100.36:3000`
- [ ] Verify network latency is acceptable
- [ ] Set up port forwarding if remote access needed (via VPN recommended)

### Monitoring & Maintenance
- [ ] Set up health check monitoring
- [ ] Configure log rotation for audit.log
- [ ] Plan weekly integrity checks
- [ ] Plan monthly backup verification
- [ ] Document disaster recovery procedures
- [ ] Create runbook for common issues

### Documentation
- [ ] Document system architecture and deployment
- [ ] Create user manual for staff
- [ ] Document RBAC roles and permissions
- [ ] Create admin maintenance procedures
- [ ] Document backup and recovery procedures

## Deployment Process

### 1. Pre-deployment Backup
```bash
npm run build
curl -X POST http://localhost:3000/api/_backup
```

### 2. Verify Build
```bash
npm run lint
node dist/server.cjs
```

### 3. Test in Staging
- Deploy to staging environment first
- Run full testing checklist
- Verify all flows work correctly
- Get client approval

### 4. Production Deployment
```bash
# Stop current service
# Back up current database
cp data/app.db backups/pre-deploy-$(date +%Y%m%d).db

# Deploy new version
npm run build
# Use process manager (pm2, systemd, etc.) to start service
node dist/server.cjs
```

### 5. Post-deployment Verification
- [ ] Verify app is running: `curl http://localhost:3000/api/_health`
- [ ] Check data integrity: `curl http://localhost:3000/api/_integrity`
- [ ] Verify backup was created
- [ ] Test critical flows (login, invoice, payment)
- [ ] Verify users can access from client machines
- [ ] Monitor logs for errors

## Post-Deployment Maintenance

### Daily
- [ ] Check health status: `curl http://localhost:3000/api/_health`
- [ ] Review audit logs for suspicious activity
- [ ] Verify automatic backup completed

### Weekly
- [ ] Run data integrity check
- [ ] Review and archive audit logs
- [ ] Test backup restoration

### Monthly
- [ ] Verify all backups are readable
- [ ] Review access logs and user activity
- [ ] Update documentation if needed
- [ ] Plan for version updates

## Disaster Recovery

### Database Corruption
1. Stop the service
2. List available backups: `ls -la backups/`
3. Restore from latest backup: `curl -X POST http://localhost:3000/api/_restore -d '{"filename":"app-2026-08-14.db"}' -H "Content-Type: application/json"`
4. Verify integrity: `curl http://localhost:3000/api/_integrity`
5. Restart service

### Data Loss
1. Use most recent valid backup
2. Check backup timestamps and integrity
3. Restore using procedure above
4. Verify with data integrity check

### Service Won't Start
1. Check logs for errors
2. Verify .env configuration
3. Verify database file exists
4. Try restoring from backup
5. Check database file permissions

## Security Monitoring

### Red Flags (Review Immediately)
- Multiple failed login attempts
- Unauthorized role access attempts
- Deletion of invoices/payments from non-Admin users
- Database corruption detected
- Backup failures
- Unusual data access patterns

### Regular Security Review
- Review audit logs weekly
- Check RBAC permissions are working
- Verify backup integrity
- Test access controls
- Review user activity

## Contact & Support
- Admin Contact: [Configure in .env]
- Backup Location: ./backups/
- Logs Location: ./logs/
- Database Location: ./data/app.db
