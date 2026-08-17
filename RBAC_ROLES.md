# Role-Based Access Control (RBAC) Documentation

## Overview

The system implements a role-based access control (RBAC) model to ensure that users can only perform actions appropriate to their role. There are four predefined roles with specific permissions.

## Roles & Permissions

### Admin
**Full system access with ability to manage system configuration, users, and data.**

| Permission | Endpoint | Description |
|-----------|----------|-------------|
| User Management | POST/PUT/DELETE /api/users | Create, edit, delete user accounts |
| Database Backup | POST /api/_backup | Trigger manual backup |
| Database Restore | POST /api/_restore | Restore from backup (dangerous operation) |
| View Backups | GET /api/_backups | List all available backups |
| Verify Backup | POST /api/_backups/:id/verify | Check backup file integrity |
| Data Integrity | GET /api/_integrity | Run and view data integrity checks |
| System Health | GET /api/_health | View system health status |
| System Status | GET /api/_status | View complete system status |
| Audit Logs | GET /api/audit-logs | View all system audit logs |
| Delete Invoices | DELETE /api/invoices/:id | Remove incorrect invoices |
| Delete Payments | DELETE /api/payments/:id | Remove incorrect payments |
| Delete Expenses | DELETE /api/expenses/:id | Remove incorrect expenses |
| All Data Operations | All CRUD endpoints | Full read/write access to all data |

**Typical Users:**
- Business owner
- System administrator
- Finance manager (may also have Manager role)

---

### Manager
**Access to financial management, decision-making data, and business reporting.**

| Permission | Endpoint | Description |
|-----------|----------|-------------|
| View Customers | GET /api/customers | Search and view customer information |
| View Vehicles | GET /api/vehicles | View vehicle records |
| View Invoices | GET /api/invoices | Create and manage invoices |
| Create Invoices | POST /api/invoices | Generate new invoices |
| View Payments | GET /api/payments | Access payment records |
| Delete Payments | DELETE /api/payments/:id | Remove incorrect payments |
| Delete Invoices | DELETE /api/invoices/:id | Remove incorrect invoices |
| Delete Expenses | DELETE /api/expenses/:id | Remove incorrect expenses |
| View Expenses | GET /api/expenses | Manage business expenses |
| View Reports | All reporting endpoints | Access analytics and reports |
| View Audit Logs | GET /api/audit-logs | View activity history |

**Typical Users:**
- Finance officer
- Operations manager
- Business controller

---

### Technician
**Access to job management, vehicle information, and work-related data.**

| Permission | Endpoint | Description |
|-----------|----------|-------------|
| View Customers | GET /api/customers | Access customer contact information |
| View Vehicles | GET /api/vehicles | View vehicle specifications and history |
| Create Job Cards | POST /api/jobcards | Create new job cards |
| View Job Cards | GET /api/jobcards | View assigned and past jobs |
| Update Job Cards | PUT /api/jobcards/:id | Update job status and notes |
| View Invoices | GET /api/invoices | See invoices for their jobs |
| Record Payments | POST /api/payments | Submit payment information |

**Typical Users:**
- Workshop technician
- Mechanic
- Service advisor

---

### Receptionist
**Access to customer interaction, basic data entry, and payment recording.**

| Permission | Endpoint | Description |
|-----------|----------|-------------|
| View Customers | GET /api/customers | Search customer directory |
| Create Customers | POST /api/customers | Add new customer records |
| Update Customers | PUT /api/customers/:id | Modify customer information |
| View Vehicles | GET /api/vehicles | Access vehicle information |
| Create Vehicles | POST /api/vehicles | Register new vehicles |
| Create Invoices | POST /api/invoices | Generate invoices for customers |
| View Invoices | GET /api/invoices | Access billing information |
| Record Payments | POST /api/payments | Create payment receipts |
| View Payments | GET /api/payments | Check payment history |

**Typical Users:**
- Front desk staff
- Customer service representative
- Appointment scheduler

---

## RBAC Implementation

### How RBAC Works

1. **User Login**: User logs in with username/password
2. **Role Assignment**: System loads user's assigned role
3. **Request Processing**: For each API request:
   - System checks user's role
   - Compares against endpoint's required roles
   - Allows or denies access
   - Logs the attempt in audit log

### Protected Endpoints

#### Admin-Only Endpoints
```
POST   /api/_backup              (Create database backup)
GET    /api/_backups             (List backups)
POST   /api/_backups/:id/verify  (Verify backup integrity)
POST   /api/_restore             (Restore from backup)
GET    /api/_integrity           (Check data integrity)
GET    /api/_health              (View system health)
GET    /api/_status              (Complete system status)
GET    /api/audit-logs           (View all audit logs)
POST/PUT/DELETE /api/users       (User management)
```

#### Manager+ Endpoints (Admin, Manager)
```
DELETE /api/invoices/:id         (Delete incorrect invoices)
DELETE /api/payments/:id         (Delete incorrect payments)
DELETE /api/expenses/:id         (Delete incorrect expenses)
```

#### Technician+ Endpoints (Admin, Manager, Technician, Receptionist)
```
POST/PUT /api/jobcards          (Create/update job cards)
POST/PUT /api/invoices          (Create/modify invoices)
POST/PUT /api/payments          (Record payments)
```

---

## Implementation Details

### RBAC Middleware
Location: `src/services/production.ts`

The middleware intercepts all requests to `/api/*` endpoints and validates:
1. User exists and is authenticated
2. User's role is in the endpoint's allowed roles list
3. Logs all access attempts in audit logs

### Error Responses

**Unauthorized (401)** - User is not logged in
```json
{
  "error": "Unauthorized: No user session"
}
```

**Forbidden (403)** - User's role cannot access this endpoint
```json
{
  "error": "Forbidden: Your role does not have permission for this action",
  "required": ["Admin"],
  "userRole": "Technician"
}
```

### Audit Logging
All RBAC violations are logged with:
- Timestamp
- User name and role
- Attempted endpoint
- HTTP method
- Result (allowed/denied)
- IP address (if available)

---

## Configuration

### Creating New Roles
To add new roles or modify permissions:

1. Edit `src/services/production.ts`
2. Update `ROLE_PERMISSIONS` object
3. Add role to `UserRole` type definition
4. Test with `npm run build && npm run lint`
5. Restart application

Example:
```typescript
const ROLE_PERMISSIONS: PermissionMap = {
  '/api/invoices': ['Admin', 'Manager', 'Receptionist'],
  '/api/invoices/:id/delete': ['Admin', 'Manager'],
  // ... more permissions
};
```

### Testing RBAC

#### Test as Non-Admin
1. Log in with non-admin account
2. Attempt to access admin endpoint
3. Verify 403 Forbidden response
4. Check audit logs for violation

#### Verify Permissions
```bash
# Get current user role
curl http://localhost:3000/api/data | jq '.currentUser.role'

# Try accessing admin endpoint (will fail)
curl http://localhost:3000/api/_integrity

# Check audit logs
curl http://localhost:3000/api/audit-logs | jq '.[] | select(.action == "RBAC")'
```

---

## Best Practices

### For System Administrators

1. **Least Privilege**: Assign the minimum role required for user's job
2. **Regular Review**: Audit user roles and permissions monthly
3. **Separation of Duties**: Don't give all functions to one person
4. **Account Cleanup**: Remove access for terminated employees immediately
5. **Monitor Admin Access**: Review admin audit logs frequently

### For Users

1. **Never Share Credentials**: Each person should have their own account
2. **Log Out**: Always log out when leaving the system
3. **Report Suspicious**: Tell admin if you see unauthorized access
4. **Change Password**: Update password regularly (at least quarterly)

### For Developers

1. **Validate in RBAC**: All dangerous operations should require Admin
2. **Log Access**: Always log who did what and when
3. **Test Permissions**: Unit test RBAC for new endpoints
4. **Document Changes**: Update this file when adding roles/permissions

---

## Troubleshooting

### User Cannot Access Expected Endpoint

1. Check user's role: `GET /api/users/{userId}`
2. Verify endpoint's required roles in `production.ts`
3. Check for typos in role name (case-sensitive: "Admin" not "admin")
4. Review audit logs for access attempts
5. Contact system administrator to update permissions

### RBAC Appears Not Working

1. Verify middleware is enabled in `server.ts`
2. Check that user object is properly set
3. Review browser console for CORS errors
4. Check server logs for RBAC violations
5. Try restarting application

### Excessive Audit Log Entries

If audit logs are filling up quickly:
1. Configure log rotation in `.env`
2. Archive old logs monthly
3. Consider filtering non-critical operations
4. Review high-frequency accesses

---

## Security Considerations

### Potential Vulnerabilities

1. **Role Escalation**: A user cannot escalate to higher role via API
   - Mitigation: Roles are server-side; frontend cannot modify
   
2. **Session Hijacking**: Unauthorized use of valid session token
   - Mitigation: Use HTTPS only, short session timeout
   
3. **Privilege Confusion**: Admin accidentally performs dangerous operation
   - Mitigation: Require confirmation for sensitive operations
   
4. **Audit Log Tampering**: Falsifying access records
   - Mitigation: Protect audit log from modification, back up regularly

### Security Monitoring
- [ ] Review audit logs daily for red flags
- [ ] Alert on failed login attempts (>3 in 10 min)
- [ ] Alert on Admin role usage
- [ ] Alert on backup restore operations
- [ ] Monitor for unusual data access patterns

---

## Support & Escalation

For RBAC issues:
1. **Tier 1 (User)**: Check .env, verify role assignment
2. **Tier 2 (Admin)**: Review audit logs, check RBAC configuration
3. **Tier 3 (Developer)**: Debug middleware, check server logs
