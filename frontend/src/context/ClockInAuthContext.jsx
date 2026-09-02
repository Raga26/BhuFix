import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ClockInAuthContext = createContext(null);

const getBase = () => {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  if (process.env.NODE_ENV === 'production') return window.location.origin;
  return 'http://localhost:8000';
};

export function clockInApi() {
  const instance = axios.create({ baseURL: `${getBase()}/api` });
  instance.interceptors.request.use((config) => {
    const t = localStorage.getItem('clockin_token');
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });
  return instance;
}

export function ClockInAuthProvider({ children }) {
  const [owner, setOwner] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('clockin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const stored = localStorage.getItem('clockin_token');
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${getBase()}/api/clockin/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        });
        setOwner(res.data);
        setToken(stored);
      } catch {
        localStorage.removeItem('clockin_token');
        setToken(null);
        setOwner(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${getBase()}/api/clockin/auth/login`, { email, password });
    localStorage.setItem('clockin_token', res.data.token);
    setToken(res.data.token);
    setOwner(res.data.owner);
    return res.data.owner;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await axios.post(`${getBase()}/api/clockin/auth/register`, payload);
    localStorage.setItem('clockin_token', res.data.token);
    setToken(res.data.token);
    setOwner(res.data.owner);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('clockin_token');
    setToken(null);
    setOwner(null);
  }, []);

  return (
    <ClockInAuthContext.Provider value={{ owner, token, loading, login, register, logout }}>
      {children}
    </ClockInAuthContext.Provider>
  );
}

export function useClockInAuth() {
  const ctx = useContext(ClockInAuthContext);
  if (!ctx) throw new Error('useClockInAuth must be used inside ClockInAuthProvider');
  return ctx;
}
