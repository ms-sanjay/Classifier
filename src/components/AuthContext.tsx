import React, { createContext, useContext, useState } from 'react';
import usersData from '../data/users.json';

interface User {
  id: string;
  username: string;
  password: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userType: 'doctor' | 'patient' | null;
  userId: string | null;
  userName: string | null;
  login: (type: 'doctor' | 'patient', credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'doctor' | 'patient' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const login = async (type: 'doctor' | 'patient', credentials: { username: string; password: string }) => {
    const users = type === 'doctor' ? usersData.doctors : usersData.patients;
    const user = users.find(
      (u: User) => u.username === credentials.username && u.password === credentials.password
    );

    if (user) {
      setIsAuthenticated(true);
      setUserType(type);
      setUserId(user.id);
      setUserName(user.name);
    } else {
      throw new Error(`Invalid ${type} credentials`);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserType(null);
    setUserId(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userType, userId, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
