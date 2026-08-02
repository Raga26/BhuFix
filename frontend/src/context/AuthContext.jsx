import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/axiosConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('bhufix_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      const stored = localStorage.getItem('bhufix_token');
      if (!stored) { setLoading(false); return; }
      try {
        const res = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${stored}` },
        });
        setUser(res.data);
        setToken(stored);
      } catch {
        localStorage.removeItem('bhufix_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('bhufix_token', t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bhufix_token');
    setToken(null);
    setUser(null);
  }, []);

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
