import { create } from 'zustand';
import type { User } from '../../shared/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'event_auth';

function loadFromStorage(): { user: User | null; token: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { user: parsed.user || null, token: parsed.token || null };
    }
  } catch {
    // ignore
  }
  return { user: null, token: null };
}

export const useAuthStore = create<AuthState>((set) => {
  const { user, token } = loadFromStorage();

  return {
    user,
    token,
    isAuthenticated: !!user && !!token,

    login: async (username: string, password: string) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '登录失败' }));
        throw new Error(error.error || '登录失败');
      }

      const data = await response.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set({ user: data.user, token: data.token, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
