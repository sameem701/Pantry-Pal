import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Clear any stale sessionStorage keys from previous version
    sessionStorage.removeItem('pantrypal_user');
    sessionStorage.removeItem('pantrypal_user_id');
    try {
      const stored = localStorage.getItem('pantrypal_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  function login(userData) {
    localStorage.setItem('pantrypal_user', JSON.stringify(userData));
    localStorage.setItem('pantrypal_user_id', String(userData.user_id));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('pantrypal_user');
    localStorage.removeItem('pantrypal_user_id');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
