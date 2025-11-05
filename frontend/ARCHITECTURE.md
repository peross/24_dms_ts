# Frontend Architecture

## Overview

This frontend uses a feature-based architecture with TanStack Query for data fetching, axios for HTTP requests, and httpOnly cookies for secure authentication.

## Directory Structure

```
frontend/src/
├── lib/                          # Shared libraries and utilities
│   ├── api/                      # API client and endpoints
│   │   ├── client.ts            # Axios instance with interceptors
│   │   └── auth.api.ts          # Auth API endpoints
│   └── providers/               # React context providers
│       └── query-provider.tsx   # TanStack Query provider
│
├── features/                     # Feature-based modules
│   └── auth/                     # Authentication feature
│       ├── components/           # Feature-specific components
│       │   ├── LoginForm.tsx
│       │   └── LoginPage.tsx
│       └── hooks/                # Feature-specific hooks
│           └── useAuth.ts       # Auth hook with TanStack Query
│
├── components/                    # Shared components
│   ├── ui/                       # shadcn/ui components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── ProtectedRoute.tsx
│   └── ...
│
└── pages/                        # Page components
    └── Dashboard.tsx
```

## Key Concepts

### 1. API Client (`lib/api/client.ts`)

- Axios instance configured with `withCredentials: true` for cookies
- Automatic token refresh on 401 errors
- Request queuing during token refresh
- Automatic redirect to login on auth failure

### 2. Feature-Based Architecture

Each feature has:
- `components/` - Feature-specific components
- `hooks/` - Custom hooks using TanStack Query
- `styles/` - Feature-specific styles (if needed)

### 3. TanStack Query Integration

- All data fetching uses `useQuery` or `useMutation`
- Centralized query client configuration
- Automatic caching and refetching
- Optimistic updates support

### 4. Authentication Flow

- **Login/Register**: Tokens stored in httpOnly cookies
- **Token Refresh**: Automatic via axios interceptor
- **Logout**: Clears cookies and query cache
- **No localStorage**: All state managed via TanStack Query

## Usage Example

### Creating a New Feature

1. Create feature directory:
```bash
src/features/my-feature/
├── components/
├── hooks/
└── styles/
```

2. Create API endpoint in `lib/api/my-feature.api.ts`:
```typescript
import apiClient from './client';

export const myFeatureApi = {
  getData: () => apiClient.get('/my-feature/data'),
  createData: (data: any) => apiClient.post('/my-feature/data', data),
};
```

3. Create hook in `features/my-feature/hooks/useMyFeature.ts`:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { myFeatureApi } from '@/lib/api/my-feature.api';

export function useMyFeature() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-feature'],
    queryFn: () => myFeatureApi.getData(),
  });

  const createMutation = useMutation({
    mutationFn: myFeatureApi.createData,
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['my-feature'] });
    },
  });

  return { data, isLoading, create: createMutation.mutateAsync };
}
```

4. Use in component:
```typescript
import { useMyFeature } from '@/features/my-feature/hooks/useMyFeature';

export function MyComponent() {
  const { data, isLoading, create } = useMyFeature();
  
  // Use data...
}
```

## Authentication

### Using Auth Hook

```typescript
import { useAuth } from '@/features/auth/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // user: User | null
  // isAuthenticated: boolean
  // login: (data: LoginData) => Promise<void>
  // logout: () => Promise<void>
}
```

### Protected Routes

```typescript
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

## API Client Features

- **Automatic Cookie Handling**: Cookies sent with all requests
- **Token Refresh**: Automatic on 401 errors
- **Request Queuing**: Queues requests during token refresh
- **Error Handling**: Centralized error handling

## Best Practices

1. **Always use hooks** from features for data fetching
2. **Never use localStorage** - all state in TanStack Query
3. **API calls in `lib/api/`** - feature hooks use them
4. **Component separation** - feature components in features/
5. **Shared components** - in `components/` directory

