# 🔐 Echelon Ascent Admin Setup Guide

## Admin Console Access

The admin console is located at `/admin` and is **not visible** in the public navigation for security reasons.

## Setting Up Admin Access

### Step 1: Add Your Email to Allowlist

Edit `convex/admin.ts` and add your email to the `ALLOWED_ADMIN_EMAILS` array:

```typescript
const ALLOWED_ADMIN_EMAILS = [
  "admin@echelon-ascent.com",
  "gamemaster@echelon-ascent.com",
  "your-email@example.com" // Add your email here
];
```

### Step 2: Seed Initial Data

In the Convex dashboard, run these functions:

```javascript
// Create initial missions
seedData.seedMissions({})

// Create initial admin accounts  
seedData.seedAdmins({})
```

### Step 3: Access Admin Console

1. Navigate to `http://localhost:3000/admin`
2. Use one of these credentials:

   **Super Admin:**
   - Email: `admin@echelon-ascent.com`
   - Name: `Echelon Administrator`

   **Game Master:**
   - Email: `gamemaster@echelon-ascent.com`  
   - Name: `Game Master`

   **Or use your own email** (if added to allowlist)

## Admin Roles & Permissions

### Super Admin
- Full access to all systems
- Can manage other admins
- Can modify system configuration
- Permissions: `manage_missions`, `manage_players`, `manage_economy`, `manage_events`, `manage_admins`, `view_analytics`

### Game Master  
- Can manage game content and players
- Permissions: `manage_missions`, `manage_players`, `manage_events`, `view_analytics`

### Content Manager
- Limited to content creation
- Permissions: `manage_missions`, `manage_events`

## Security Features

✅ **Email Allowlist** - Only pre-approved emails can access admin functions  
✅ **Role-Based Permissions** - Different access levels based on admin role  
✅ **Activity Logging** - All admin actions are logged with timestamps  
✅ **Input Validation** - Admin emails are normalized and validated  

## Creating Additional Admins

You can create new admin accounts via the Convex dashboard:

```javascript
admin.createOrGetAdmin({
  email: "newadmin@example.com",
  name: "New Admin Name",
  role: "game_master" // or "super_admin", "content_manager"
})
```

**Remember:** The email must be in the `ALLOWED_ADMIN_EMAILS` list first!

## Production Security Recommendations

For production deployment, implement:

1. **Environment Variables** - Store admin emails in environment variables
2. **OAuth Integration** - Use proper authentication (Google, GitHub, etc.)
3. **Session Management** - Implement secure session tokens
4. **Two-Factor Authentication** - Add 2FA for sensitive operations
5. **IP Allowlisting** - Restrict admin access to specific IP ranges
6. **Audit Logging** - Enhanced logging with IP addresses and user agents

## Admin Console Features

### Overview Dashboard
- Real-time player statistics
- Recent admin activity log
- Key metrics at a glance

### Mission Management
- Create/edit missions
- Activate/deactivate missions
- Set difficulty and requirements
- Configure rewards

### Player Management  
- View all player accounts
- Monitor player activity
- View player statistics
- Access moderation tools

### Analytics
- Player activity metrics
- Economy overview
- Growth statistics

## Troubleshooting

**"Email not authorized"** - Add your email to the allowlist in `convex/admin.ts`

**"Admin account not found"** - Run the seed functions to create initial admin accounts

**"Insufficient permissions"** - Check your admin role and permissions in the database

**Can't access `/admin`** - The admin console is a hidden route, navigate directly to the URL 