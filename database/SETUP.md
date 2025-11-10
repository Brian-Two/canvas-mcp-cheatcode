# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `astar-production` (or `astar-dev` for testing)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier (upgrade later if needed)

5. Wait ~2 minutes for project to provision

## Step 2: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "+ New Query"
3. Copy the entire contents of `database/migrations/001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success" message

## Step 3: Configure Authentication

### Enable Email/Password Auth

1. Go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure:
   - ✅ Enable email confirmations (recommended)
   - ✅ Secure email change
   - Set confirmation URL template: `http://localhost:5173/auth/confirm`
   - Set email templates (optional customization)

### Enable Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Get credentials from Google Cloud Console:
   - Go to https://console.cloud.google.com
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI from Supabase
4. Add Client ID and Secret to Supabase

### Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize welcome email, password reset, etc.
3. Use variables like `{{ .ConfirmationURL }}`, `{{ .Email }}`

## Step 4: Get API Keys

1. Go to **Settings** → **API**
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (safe for frontend)
   - **service_role key**: `eyJhbGc...` (NEVER expose to frontend!)

## Step 5: Create Environment Files

### Backend `.env`

Create or update `nvidia-hacks/backend/.env`:

```bash
# Existing variables
CANVAS_API_URL=https://canvas.instructure.com/api/v1
CANVAS_API_TOKEN=your_canvas_token
NV_API_KEY=your_nvidia_api_key
NV_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1.5
PORT=3001

# NEW: Supabase
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your_service_role_key...
```

### Frontend `.env`

Create or update `nvidia-hacks/frontend/.env`:

```bash
# Backend API
VITE_API_URL=http://localhost:3001

# NEW: Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your_anon_public_key...
```

⚠️ **IMPORTANT**: Never commit `.env` files to git!

## Step 6: Install Supabase Client Libraries

### Backend

```bash
cd nvidia-hacks/backend
npm install @supabase/supabase-js
```

### Frontend

```bash
cd nvidia-hacks/frontend
npm install @supabase/supabase-js @supabase/auth-ui-react
```

## Step 7: Test the Setup

### Test Database Connection

1. Go to Supabase **Table Editor**
2. You should see all tables:
   - user_profiles
   - folders
   - mind_maps
   - documents
   - course_materials
   - chat_sessions
   - chat_messages
   - assignments_cache

### Test Auth

1. Go to **Authentication** → **Users**
2. Click **Add User** (create a test user)
3. You should be able to create a user successfully

### Test RLS (Row Level Security)

1. Open **SQL Editor**
2. Run:
```sql
-- Should return 0 rows (no user logged in)
SELECT * FROM folders;

-- Should fail (RLS prevents access)
INSERT INTO folders (user_id, name) VALUES ('some-uuid', 'Test');
```

3. This confirms RLS is working!

## Step 8: Configure Storage

1. Go to **Storage**
2. You should see `user-files` bucket
3. Test upload:
   - Click into `user-files`
   - Try to upload a file (should work when authenticated)

## Step 9: Set Up Real-time (Optional)

If you want real-time chat updates:

1. Go to **Database** → **Replication**
2. Enable replication for `chat_messages` table
3. In your app, subscribe to changes:
```typescript
supabase
  .channel('chat-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages'
  }, payload => {
    console.log('New message!', payload)
  })
  .subscribe()
```

## Step 10: Configure Webhook (Optional)

For advanced features like syncing Canvas data in background:

1. Go to **Database** → **Webhooks**
2. Create webhook for specific tables
3. Point to your backend endpoint

## Monitoring & Maintenance

### View Logs

- **Database**: **Database** → **Logs**
- **Auth**: **Authentication** → **Logs**
- **API**: **Settings** → **API** → **Logs**

### Monitor Usage

- Go to **Settings** → **Usage**
- Track:
  - Database size
  - Bandwidth
  - Monthly Active Users (MAU)
  - Storage

### Backup

Supabase Pro includes:
- Daily backups (7 days retention)
- Point-in-time recovery

Free tier: Manual exports via SQL Editor

## Common Issues

### Issue: "relation does not exist"
**Solution**: Make sure you ran the migration SQL

### Issue: "new row violates row-level security policy"
**Solution**: Check that you're authenticated and RLS policies are correct

### Issue: "JWT expired"
**Solution**: Refresh the auth token (handled by Supabase client automatically)

### Issue: Storage upload fails
**Solution**: Check storage RLS policies and that bucket exists

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ Service role key NEVER exposed to frontend
- ✅ Email confirmation enabled
- ✅ Canvas tokens encrypted
- ✅ HTTPS enforced
- ✅ Environment variables secured
- ✅ Password requirements met

## Next Steps

1. Update backend to use Supabase client
2. Update frontend with auth UI
3. Migrate localStorage data (see `database/migrations/migrate_from_localstorage.ts`)
4. Test authentication flow
5. Test data CRUD operations
6. Deploy!

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Storage Guide](https://supabase.com/docs/guides/storage)


