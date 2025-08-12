# Smart Migration Guide: Copying a Project Properly

## Overview
This guide will help you migrate code from your source project without the issues you encountered. We'll use a systematic, testable approach.

## Pre-Migration Checklist

### 1. Analyze Source Project
```bash
# In source project directory:

# Check Node/npm versions
node --version
npm --version

# List all dependencies and versions
npm list --depth=0 > ../dependencies.txt

# Check TypeScript version
npx tsc --version

# Document environment variables
grep -h "process.env\|import.meta.env" -r src/ | sort | uniq > ../env-vars.txt
```

### 2. Analyze Database Schema
```sql
-- Connect to source project's Supabase
-- Run this SQL to document schema:
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, ordinal_position;
```

### 3. Document Feature Dependencies
Create a map of what depends on what:
```
Authentication → None
Subscription → Authentication, Stripe
Dashboard → Authentication, Subscription, GraphQL
Asset Selection → Dashboard, Available Assets
```

## Migration Steps

### Phase 1: Foundation (Day 1)

#### Step 1.1: Create Fresh Project
```bash
# Create new project with EXACT same versions
npm create vite@latest fresh-start-suite -- --template react-ts
cd fresh-start-suite

# Copy source package.json
cp ../source-project/package.json ./package.json.source

# Install exact versions from source
npm install
```

#### Step 1.2: Configuration Files
```bash
# Copy these files EXACTLY
cp ../source/tsconfig*.json ./
cp ../source/tailwind.config.ts ./
cp ../source/postcss.config.js ./
cp ../source/vite.config.ts ./
cp ../source/.env.example ./.env.example

# Create your .env.local (never commit real keys!)
cp .env.example .env.local
```

#### Step 1.3: Test Foundation
```bash
npm run dev  # Should start without errors
npm run build  # Should build without errors
npm run type-check  # Should pass
```

### Phase 2: Type System (Day 1)

#### Step 2.1: Copy Type Definitions
```bash
# Create directory structure
mkdir -p src/types src/integrations/supabase

# Copy in this EXACT order:
cp -r ../source/src/types/* ./src/types/
cp ../source/src/integrations/supabase/types.ts ./src/integrations/supabase/

# Run type check after EACH copy
npm run type-check
```

#### Step 2.2: Validate Types Match Database
```typescript
// Create src/scripts/validate-types.ts
import { Database } from '@/integrations/supabase/types'

// This will fail if types don't match your actual database
type ProfilesTable = Database['public']['Tables']['profiles']
console.log('Types validated!')
```

### Phase 3: Core Infrastructure (Day 2)

#### Step 3.1: Copy Utilities and Libraries
```bash
# Copy utilities first
cp -r ../source/src/lib ./src/
cp -r ../source/src/utils ./src/

# Test each utility
npm run test  # If tests exist
```

#### Step 3.2: Copy Base Components
```bash
# Copy UI components (they have fewer dependencies)
cp -r ../source/src/components/ui ./src/components/

# Build and check
npm run build
```

#### Step 3.3: Copy Contexts and Providers
```bash
# Copy one at a time, test each
cp ../source/src/context/AuthContext.tsx ./src/context/
# Test auth context works

cp ../source/src/context/ThemeContext.tsx ./src/context/
# Test theme context works
```

### Phase 4: Feature Migration (Day 3+)

#### Step 4.1: Create Feature Branches
```bash
# For each major feature:
git checkout -b feature/authentication

# Copy feature files
cp -r ../source/src/components/auth ./src/components/
cp -r ../source/src/pages/Login.tsx ./src/pages/
cp -r ../source/src/pages/Signup.tsx ./src/pages/

# Test feature
npm run dev
# Manual testing
npm run build

# If it works, commit
git add .
git commit -m "Add authentication feature"
git checkout main
git merge feature/authentication
```

#### Step 4.2: Feature Order (IMPORTANT!)
Migrate features in this order:
1. **Authentication** (no dependencies)
2. **User Profile** (depends on auth)
3. **Subscription/Payment** (depends on auth + profile)
4. **Dashboard** (depends on all above)
5. **Complex Features** (last)

### Phase 5: Data Layer

#### Step 5.1: GraphQL/API Setup
```bash
# Copy GraphQL setup if used
cp -r ../source/src/integrations/graphql ./src/integrations/

# Copy API hooks
cp -r ../source/src/hooks/useApi* ./src/hooks/

# Test API connections
```

#### Step 5.2: Migrate Supabase Functions
```bash
# Copy functions one at a time
mkdir -p supabase/functions

# For each function:
cp -r ../source/supabase/functions/function-name ./supabase/functions/
# Deploy and test individually
```

## Testing Strategy

### After Each Feature Migration:

1. **Type Check**
   ```bash
   npm run type-check
   ```

2. **Build Test**
   ```bash
   npm run build
   ```

3. **Manual Test**
   - Start dev server
   - Test the feature
   - Check browser console for errors

4. **Integration Test**
   - Test with other features
   - Check data flow

## Common Pitfalls to Avoid

### 1. Version Mismatches
❌ Don't use different package versions
✅ Copy package.json first, use exact versions

### 2. Missing Types
❌ Don't copy components before types
✅ Copy types → utils → components

### 3. Environment Variables
❌ Don't hardcode values
✅ Document all env vars needed

### 4. Feature Dependencies
❌ Don't copy Dashboard before Auth
✅ Follow dependency order

### 5. Database Mismatches
❌ Don't assume schema matches
✅ Generate types from YOUR database

## Migration Tracking

Create `MIGRATION_STATUS.md`:
```markdown
## Migration Status

- [x] Project setup
- [x] Type definitions
- [x] UI components
- [x] Authentication
- [ ] User profiles  
- [ ] Subscriptions
- [ ] Dashboard
- [ ] Asset selection
- [ ] Reports

## Issues Found
- Issue: Missing 'institutional' tier
  Solution: Removed references

## Environment Variables Needed
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_STRIPE_PUBLISHABLE_KEY
```

## Rollback Strategy

If something goes wrong:
```bash
# Each feature is in its own branch
git checkout main
git branch -D feature/broken-feature

# Start that feature again
```

## Success Criteria

You know the migration is successful when:
1. ✅ All type checks pass
2. ✅ Build completes without errors
3. ✅ All features work as expected
4. ✅ No console errors in browser
5. ✅ Can deploy successfully

## Time Estimate

- Phase 1-2: 1 day (Foundation + Types)
- Phase 3: 1 day (Infrastructure)
- Phase 4: 2-3 days (Features, depending on count)
- Phase 5: 1 day (Data layer)

Total: 5-6 days for clean migration

## Final Tips

1. **Don't rush** - Each phase builds on the previous
2. **Test constantly** - Catch issues early
3. **Commit often** - Easy rollback
4. **Document issues** - Future reference
5. **Ask why** - Understand dependencies

Remember: It's better to spend 5 days doing it right than 10 days debugging a messy copy!