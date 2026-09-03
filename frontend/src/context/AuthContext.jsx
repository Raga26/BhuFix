import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/axiosConfig';

const AuthContext = createContext(null);
const TOKEN_KEY = 'bhufix_token';
const USER_KEY = 'bhufix_user';
const EMAIL_KEY = 'bhufix_email';

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (user.email) localStorage.setItem(EMAIL_KEY, user.email);
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readCachedUser());
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const applySession = useCallback((nextToken, nextUser) => {
    persistSession(nextToken, nextUser);
    if (nextToken) setToken(nextToken);
    if (nextUser) setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const verify = async () => {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${stored}` },
        });
        const nextUser = res.data?.user || res.data;
        const nextToken = res.data?.token || stored;
        applySession(nextToken, nextUser);
      } catch (err) {
        if (err.response?.status === 401) {
          clearSession();
          setToken(null);
          setUser(null);
        }
        // Network / 5xx: keep the cached session so a blip does not force a password.
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [applySession]);

  useEffect(() => {
    const onLost = () => logout();
    window.addEventListener('bhufix-auth-lost', onLost);
    return () => window.removeEventListener('bhufix-auth-lost', onLost);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    applySession(t, u);
    return u;
  }, [applySession]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
