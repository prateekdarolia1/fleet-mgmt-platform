import { useContext } from 'react';
import { AuthContext } from '@/components/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Public mode fallback: no auth provider needed
    return {
      user: null,
      session: null,
      userRole: 'public',
      loading: false,
      signIn: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    } as any;
  }
  return context;
};
