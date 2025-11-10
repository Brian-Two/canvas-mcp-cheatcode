# ASTAR Database Schema (Supabase/PostgreSQL)

## Overview
This schema supports user authentication, course organization, mind mapping, document generation, chat sessions, and Canvas integration.

## Tables

### 1. **users** (Managed by Supabase Auth)
Supabase automatically creates this table. We extend it with a custom `user_profiles` table.

```sql
-- Supabase auth.users table (automatically managed)
-- id (uuid, primary key)
-- email (text)
-- encrypted_password (text)
-- email_confirmed_at (timestamp)
-- created_at (timestamp)
-- updated_at (timestamp)
```

### 2. **user_profiles**
Extended user information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | References auth.users(id) |
| full_name | text | User's full name |
| university | text | University/institution name |
| canvas_url | text | Canvas instance URL |
| canvas_token_encrypted | text | Encrypted Canvas API token |
| preferences | jsonb | User preferences (theme, notifications, etc.) |
| created_at | timestamp | Profile creation time |
| updated_at | timestamp | Last update time |

**Indexes:**
- `idx_user_profiles_id` on `id`

**RLS Policies:**
- Users can only read/update their own profile

---

### 3. **folders**
Organization structure for courses/topics.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique folder ID |
| user_id | uuid (FK) | References user_profiles(id) |
| name | text | Folder name (e.g., "Calculus I") |
| color | text | Hex color for UI |
| canvas_course_id | text | Canvas course ID (nullable) |
| canvas_course_name | text | Canvas course name (nullable) |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Indexes:**
- `idx_folders_user_id` on `user_id`
- `idx_folders_canvas_course_id` on `canvas_course_id`

**RLS Policies:**
- Users can only access their own folders

---

### 4. **mind_maps**
Knowledge graphs/mind maps.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique mind map ID |
| user_id | uuid (FK) | References user_profiles(id) |
| folder_id | uuid (FK) | References folders(id) |
| name | text | Mind map name |
| concepts | jsonb | Array of concept nodes |
| assignment_id | text | Related Canvas assignment ID (nullable) |
| assignment_title | text | Assignment title (nullable) |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Indexes:**
- `idx_mind_maps_user_id` on `user_id`
- `idx_mind_maps_folder_id` on `folder_id`
- `idx_mind_maps_assignment_id` on `assignment_id`

**RLS Policies:**
- Users can only access their own mind maps

---

### 5. **documents**
Generated study guides, assignment drafts, step solver sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique document ID |
| user_id | uuid (FK) | References user_profiles(id) |
| folder_id | uuid (FK) | References folders(id) |
| name | text | Document name |
| type | text | 'study_guide', 'assignment_draft', 'step_solver' |
| content | text | Document content (markdown/text) |
| assignment_id | text | Related Canvas assignment ID (nullable) |
| assignment_title | text | Assignment title (nullable) |
| step_solver_data | jsonb | Step-by-step data (for step solver type) |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Indexes:**
- `idx_documents_user_id` on `user_id`
- `idx_documents_folder_id` on `folder_id`
- `idx_documents_type` on `type`

**RLS Policies:**
- Users can only access their own documents

---

### 6. **course_materials**
Canvas course materials (syllabus, files, pages, modules).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique material ID |
| user_id | uuid (FK) | References user_profiles(id) |
| folder_id | uuid (FK) | References folders(id) |
| canvas_id | text | Canvas material ID |
| name | text | Material name |
| type | text | 'syllabus', 'file', 'page', 'module', 'textbook' |
| content | text | Material content (if applicable) |
| url | text | Canvas URL (if applicable) |
| file_type | text | File extension (pdf, doc, etc.) |
| metadata | jsonb | Additional metadata |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Indexes:**
- `idx_course_materials_user_id` on `user_id`
- `idx_course_materials_folder_id` on `folder_id`
- `idx_course_materials_canvas_id` on `canvas_id`
- `idx_course_materials_type` on `type`

**RLS Policies:**
- Users can only access their own course materials

---

### 7. **chat_sessions**
Conversation sessions with the AI.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique session ID |
| user_id | uuid (FK) | References user_profiles(id) |
| folder_id | uuid (FK) | References folders(id) (nullable) |
| assignment_id | text | Related Canvas assignment ID (nullable) |
| title | text | Session title (auto-generated or user-set) |
| created_at | timestamp | Session start time |
| updated_at | timestamp | Last message time |

**Indexes:**
- `idx_chat_sessions_user_id` on `user_id`
- `idx_chat_sessions_folder_id` on `folder_id`

**RLS Policies:**
- Users can only access their own chat sessions

---

### 8. **chat_messages**
Individual messages in chat sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique message ID |
| session_id | uuid (FK) | References chat_sessions(id) |
| user_id | uuid (FK) | References user_profiles(id) |
| role | text | 'user' or 'assistant' |
| content | text | Message content |
| metadata | jsonb | Tool calls, context, etc. |
| created_at | timestamp | Message time |

**Indexes:**
- `idx_chat_messages_session_id` on `session_id`
- `idx_chat_messages_user_id` on `user_id`
- `idx_chat_messages_created_at` on `created_at`

**RLS Policies:**
- Users can only access messages from their own sessions

---

### 9. **assignments_cache**
Cached Canvas assignments for performance.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique cache ID |
| user_id | uuid (FK) | References user_profiles(id) |
| canvas_assignment_id | text | Canvas assignment ID |
| canvas_course_id | text | Canvas course ID |
| data | jsonb | Assignment data from Canvas |
| fetched_at | timestamp | When data was cached |
| expires_at | timestamp | Cache expiration time |

**Indexes:**
- `idx_assignments_cache_user_id` on `user_id`
- `idx_assignments_cache_canvas_assignment_id` on `canvas_assignment_id`
- `idx_assignments_cache_expires_at` on `expires_at`

**RLS Policies:**
- Users can only access their own cached assignments

---

## Relationships

```
users (auth.users)
  └─ user_profiles (1:1)
       ├─ folders (1:many)
       │    ├─ mind_maps (1:many)
       │    ├─ documents (1:many)
       │    └─ course_materials (1:many)
       ├─ chat_sessions (1:many)
       │    └─ chat_messages (1:many)
       └─ assignments_cache (1:many)
```

---

## Supabase Storage Buckets

### **user-files**
Store user-uploaded files (PDFs, images, context documents).

**Structure:**
```
user-files/
  {user_id}/
    context/
      {file_id}.pdf
    exports/
      {document_id}.pdf
```

**RLS Policies:**
- Users can only upload/access their own files

---

## Supabase Edge Functions (Optional)

1. **sync-canvas-materials** - Periodic sync of Canvas data
2. **generate-study-guide** - Generate study guides (call LLM backend)
3. **export-document-pdf** - Export documents as PDFs

---

## Migration Strategy

### Phase 1: Schema Creation
1. Run SQL migrations to create all tables
2. Set up RLS policies
3. Create storage buckets

### Phase 2: Backend Integration
1. Install Supabase client in backend
2. Add authentication middleware
3. Replace in-memory data with database queries

### Phase 3: Frontend Integration
1. Install Supabase client in frontend
2. Add auth UI (login, signup, logout)
3. Replace localStorage with Supabase queries

### Phase 4: Data Migration
1. Create migration script for existing localStorage data
2. Test with sample users
3. Deploy to production

---

## Security Considerations

1. **Row Level Security (RLS)**
   - Enabled on all tables
   - Users can only access their own data

2. **Canvas Token Encryption**
   - Tokens encrypted at rest
   - Decrypted only when needed for API calls

3. **API Rate Limiting**
   - Implement rate limits on Supabase functions
   - Cache Canvas data to reduce API calls

4. **Authentication**
   - Email verification required
   - OAuth for Google, GitHub (optional)
   - Password requirements enforced

---

## Performance Optimizations

1. **Indexes** - All foreign keys and frequently queried columns indexed
2. **Caching** - Canvas assignments cached with TTL
3. **Pagination** - Large queries paginated (chat history, assignments)
4. **Real-time** - Use Supabase subscriptions only where needed
5. **CDN** - Static assets served via Supabase CDN

---

## Cost Estimation (Supabase Free Tier)

**Limits:**
- 500 MB database storage (plenty for text data)
- 1 GB file storage (for PDFs/exports)
- 50,000 monthly active users
- 2 GB bandwidth

**Should scale to:**
- ~1,000 active students
- ~10,000 mind maps
- ~50,000 chat messages
- Upgrade to Pro ($25/mo) when needed

---

## Next Steps

1. ✅ Create Supabase project
2. ✅ Run SQL migrations
3. ✅ Set up RLS policies
4. ✅ Configure authentication
5. ✅ Update backend with Supabase client
6. ✅ Update frontend with Supabase client
7. ✅ Test authentication flow
8. ✅ Deploy and test


