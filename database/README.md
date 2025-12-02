# ASTAR Database

This directory contains database schema, migrations, and setup instructions for the ASTAR application using Supabase (PostgreSQL).

## Quick Start

1. **Read the Schema**: See `SCHEMA.md` for complete database design
2. **Follow Setup**: See `SETUP.md` for step-by-step Supabase setup
3. **Run Migration**: Execute `migrations/001_initial_schema.sql` in Supabase SQL Editor

## Why Supabase?

✅ **PostgreSQL** - Robust, relational database  
✅ **Built-in Auth** - Email, OAuth, JWT handling  
✅ **Row Level Security** - Data privacy by default  
✅ **Real-time** - Live updates for chat  
✅ **Storage** - File uploads for PDFs, images  
✅ **Free Tier** - Generous limits for students  
✅ **TypeScript Support** - Type-safe queries  

## Structure

```
database/
├── README.md                    # This file
├── SCHEMA.md                    # Complete database schema documentation
├── SETUP.md                     # Step-by-step setup guide
├── migrations/
│   ├── 001_initial_schema.sql   # Initial database setup
│   └── ...                      # Future migrations
└── seeds/
    └── ...                      # Sample data (optional)
```

## Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | Extended user information |
| `folders` | Course/topic organization |
| `mind_maps` | Knowledge graphs with concepts |
| `documents` | Study guides, drafts, step solver |
| `course_materials` | Canvas materials (syllabus, files, pages) |
| `chat_sessions` | Conversation sessions with AI |
| `chat_messages` | Individual messages |
| `assignments_cache` | Cached Canvas assignment data |

## Security

**Row Level Security (RLS)** is enabled on all tables:
- Users can only access their own data
- Enforced at database level
- Cannot be bypassed by frontend

**Canvas Tokens**:
- Encrypted at rest in `user_profiles.canvas_token_encrypted`
- Decrypted only when needed for API calls
- Never exposed to frontend

## Migration Strategy

### Option 1: Fresh Start (Recommended for New Users)
1. Set up Supabase
2. Run migration
3. Start using the app
4. No data to migrate

### Option 2: Migrate from localStorage
1. Set up Supabase
2. Run migration
3. Create migration script (TODO)
4. Export localStorage data
5. Import into Supabase

## Cost

**Free Tier Limits:**
- 500 MB database storage
- 1 GB file storage  
- 50,000 monthly active users
- 2 GB bandwidth

**Estimated Usage (1000 students):**
- Database: ~200 MB
- Storage: ~500 MB (PDFs, exports)
- Bandwidth: ~1 GB/month
- **Cost: $0** (within free tier)

**Upgrade to Pro ($25/mo) when:**
- Database exceeds 500 MB
- Need daily backups
- Want point-in-time recovery
- Over 50,000 MAU

## Development Workflow

1. **Local Development**
   - Use Supabase project for dev
   - Test migrations on dev project first

2. **Schema Changes**
   - Create new migration file
   - Test thoroughly
   - Document changes

3. **Production Deployment**
   - Review migration
   - Run during low-traffic period
   - Monitor for errors

## Best Practices

1. **Never commit `.env` files** - Contains sensitive keys
2. **Use transactions** - For complex multi-table operations
3. **Index frequently queried columns** - Already done in migration
4. **Cache when possible** - `assignments_cache` table for Canvas data
5. **Paginate large queries** - Chat history, assignments list
6. **Use prepared statements** - Supabase client handles this
7. **Monitor usage** - Check Supabase dashboard regularly

## Troubleshooting

**Can't connect to Supabase**
- Check SUPABASE_URL and keys in `.env`
- Verify project is running in Supabase dashboard

**RLS policy violations**
- Ensure user is authenticated
- Check policy conditions match your use case
- Test with `auth.uid()` in SQL Editor

**Migration fails**
- Check for syntax errors
- Verify extensions are enabled
- Look for conflicting table names

**Storage upload fails**
- Check bucket exists
- Verify storage RLS policies
- Ensure file path follows pattern

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Discord**: https://discord.supabase.com
- **GitHub Issues**: [Your repo]/issues

## License

Same as main ASTAR project



