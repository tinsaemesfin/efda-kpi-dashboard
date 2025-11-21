# 🚀 Quick Start - ERIS Authentication

## ✅ What Was Done

The ERIS authentication system has been **fully implemented** in your dashboard. Here's what was set up:

### 📦 Package Installed
- `oidc-client-ts` - OpenID Connect client library

### 📁 Files Created (20+ files)

#### Core Services & Configuration
1. `src/lib/config/auth.config.ts` - Auth configuration
2. `src/lib/models/session.model.ts` - TypeScript models
3. `src/lib/services/storage.service.ts` - LocalStorage wrapper
4. `src/lib/services/auth.service.ts` - Authentication logic
5. `src/lib/services/permission.service.ts` - Permissions management
6. `src/lib/services/http.service.ts` - Authenticated HTTP client

#### State Management
7. `src/lib/stores/session.store.ts` - Session state
8. `src/lib/stores/permission.store.ts` - Permissions state

#### React Hooks & Components
9. `src/hooks/useAuth.ts` - Authentication hook
10. `src/hooks/usePermission.ts` - Permission checking hook
11. `src/components/auth/AuthGuard.tsx` - Route protection
12. `src/components/auth/PermissionGuard.tsx` - Permission-based protection
13. `src/components/providers/AuthProvider.tsx` - Auth context provider
14. `src/components/HomeContent.tsx` - Dashboard content

#### Pages & Routes
15. `src/app/auth/page.tsx` - Login redirect page
16. `src/app/auth-callback/page.tsx` - OAuth callback handler
17. `public/assets/silent-callback.html` - Silent token renewal

#### Updated Files
18. `src/app/page.tsx` - Protected home page
19. `src/app/clinical-trials/page.tsx` - Protected with AuthGuard
20. `src/app/gmp-inspections/page.tsx` - Protected with AuthGuard
21. `src/app/market-authorizations/page.tsx` - Protected with AuthGuard
22. `src/lib/providers.tsx` - Integrated AuthProvider
23. `src/components/layout/dashboard-header.tsx` - Shows user info & logout

---

## 🔑 Environment Variables

Make sure your `.env.local` file has these variables:

```env
NEXT_PUBLIC_STS_AUTHORITY=https://dev.id.eris.efda.gov.et
NEXT_PUBLIC_CLIENT_ID=eris-portal-spa
NEXT_PUBLIC_CLIENT_ROOT=http://localhost:3000
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth-callback?to=signin
NEXT_PUBLIC_SILENT_REDIRECT_URI=http://localhost:3000/assets/silent-callback.html
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_CLIENT_SCOPE=openid profile
NEXT_PUBLIC_RESPONSE_TYPE=code
NEXT_PUBLIC_API_ROOT=https://api.feature.eris.efda.gov.et/api
```

---

## 🎯 How It Works

### Authentication Flow

```
1. User visits any protected page (/, /clinical-trials, etc.)
   ↓
2. AuthGuard checks if user is authenticated
   ↓
3. If NOT authenticated → Redirect to /auth
   ↓
4. /auth page redirects to ERIS login (dev.id.eris.efda.gov.et)
   ↓
5. User enters credentials at ERIS
   ↓
6. ERIS redirects back to /auth-callback
   ↓
7. Callback page:
   - Completes authentication
   - Fetches user permissions from API
   - Stores session & permissions
   ↓
8. Redirect to home page
   ↓
9. User sees protected content
```

### What Gets Stored

- **LocalStorage Keys:**
  - `oidc.user:{authority}:{client_id}` - User session & tokens
  - `PERMISSIONS` - User permissions array

---

## 🧪 Testing the Implementation

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Open Your Browser

Navigate to `http://localhost:3000`

### 3. What Should Happen

1. **First Visit (Not Logged In):**
   - You'll see "Loading..." briefly
   - Then redirect to `/auth`
   - Then redirect to ERIS login page

2. **After Login:**
   - Redirected to `/auth-callback`
   - See "Completing authentication..."
   - Redirected to home page
   - Dashboard loads with your data

3. **Header Changes:**
   - Your avatar appears in top-right
   - Click avatar to see:
     - Your name
     - Your email
     - Your role
     - Logout option

4. **All Pages Protected:**
   - Try navigating to `/clinical-trials`
   - Try navigating to `/gmp-inspections`
   - Try navigating to `/market-authorizations`
   - All require authentication

### 4. Test Logout

1. Click your avatar in the header
2. Click "Log out"
3. You'll be redirected to `/auth`
4. Session cleared from localStorage

---

## 💻 Using Auth in Your Code

### Get Current User Info

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MyComponent() {
  const { profile, isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {profile?.given_name}!</h1>
      <p>Email: {profile?.email}</p>
      <p>Role: {profile?.role}</p>
    </div>
  );
}
```

### Protect a New Page

```tsx
import AuthGuard from '@/components/auth/AuthGuard';
import { DashboardLayout } from '@/components/layout';

export default function NewProtectedPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        {/* Your content here */}
      </DashboardLayout>
    </AuthGuard>
  );
}
```

### Check Permissions

```tsx
'use client';

import { usePermission } from '@/hooks/usePermission';

export default function AdminButton() {
  const hasAdminPermission = usePermission('AdminAccess');

  if (!hasAdminPermission) return null;

  return <button>Admin Panel</button>;
}
```

### Make Authenticated API Calls

```tsx
import { httpService } from '@/lib/services/http.service';

// GET
const data = await httpService.get<MyDataType>('/endpoint');

// POST
const result = await httpService.post('/endpoint', { key: 'value' });

// PUT
const updated = await httpService.put('/endpoint/1', { key: 'value' });

// DELETE
const deleted = await httpService.delete('/endpoint/1');
```

---

## 🛠️ Troubleshooting

### Issue: Redirect Loop
**Solution:** Make sure `/auth` and `/auth-callback` pages are NOT wrapped with `AuthGuard` ✅ (Already done correctly)

### Issue: Can't Log In
**Checklist:**
- ✅ Check `.env.local` exists and has all variables
- ✅ Verify `NEXT_PUBLIC_STS_AUTHORITY` is correct
- ✅ Verify `NEXT_PUBLIC_CLIENT_ID` matches ERIS config
- ✅ Check browser console for errors
- ✅ Restart dev server after adding env vars

### Issue: "Failed to fetch permissions"
**Possible Causes:**
- API endpoint is down or incorrect
- Access token is invalid
- CORS issues

**Check:**
- Browser console for network errors
- API endpoint: `{API_ROOT}/Account/User/Permissions`
- Network tab to see the request/response

### Issue: User Info Not Showing
**Solution:**
- Check browser console for errors
- Verify `authService.getUser()` returns a user
- Check `localStorage` for the OIDC user object

---

## 📝 Next Steps

### Optional Enhancements

1. **Add More Permission Guards:**
   ```tsx
   <PermissionGuard permission="ViewReports">
     <ReportsSection />
   </PermissionGuard>
   ```

2. **Customize Loading States:**
   - Edit `AuthGuard.tsx` loading message
   - Add your own loading spinner

3. **Add Error Handling:**
   - Handle API errors gracefully
   - Show user-friendly error messages

4. **Add User Profile Page:**
   - Create `/profile` route
   - Show full user details
   - Allow profile updates

5. **Add Role-Based Features:**
   ```tsx
   const { profile } = useAuth();
   
   if (profile?.role === 'Admin') {
     return <AdminDashboard />;
   }
   return <UserDashboard />;
   ```

---

## ✨ Summary

Your dashboard now has:
- ✅ Complete OIDC authentication with ERIS
- ✅ Token management with auto-renewal
- ✅ User session & profile management
- ✅ Permission system
- ✅ All pages protected
- ✅ User menu with logout
- ✅ Authenticated HTTP client

**All pages are now secure and require authentication!**

---

## 📚 Documentation

- Full Implementation Guide: `AUTH-IMPLEMENTATION-SUMMARY.md`
- Original Guide: `Authguide.md`
- [OIDC Client TS Docs](https://github.com/authts/oidc-client-ts)
- [Zustand Docs](https://github.com/pmndrs/zustand)

---

**Ready to test!** 🎉

Run `npm run dev` and visit `http://localhost:3000`

