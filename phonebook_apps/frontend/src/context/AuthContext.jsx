import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('phonebook_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('phonebook_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('phonebook_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.data) {
            setUser(res.data.data);
            localStorage.setItem('phonebook_user', JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: jwtToken, user: userData } = res.data.data;
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem('phonebook_token', jwtToken);
    localStorage.setItem('phonebook_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (name, email, password, confirmPassword) => {
    const res = await api.post('/auth/register', { name, email, password, confirmPassword });
    const { token: jwtToken, user: userData } = res.data.data;
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem('phonebook_token', jwtToken);
    localStorage.setItem('phonebook_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('phonebook_token');
    localStorage.removeItem('phonebook_user');
  };

  const deleteAccount = async () => {
    await api.delete('/users/me');
    logout();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
