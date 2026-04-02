import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UserRole = 'trainer' | 'agent';
type UserStatus = 'approved' | 'pending';

type User = {
  fullName: string;
  role: UserRole;
  status: UserStatus;
};

type AuthContextType = {
  user: User | null;
  login: (fullName: string, password: string, loginRole: UserRole) => { success: boolean; message?: string };
  register: (fullName: string, password: string, role: UserRole) => { success: boolean; message: string };
  logout: () => void;
  getAllUsers: () => (User & { id: string })[];
  approveTrainer: (userId: string) => void;
  changePassword: (fullName: string, newPassword: string) => { success: boolean; message: string };
  forgotPassword: (fullName: string) => { success: boolean; message: string };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const [users, setUsers] = useState<Record<string, User & { password: string }>>({
    'Fajar': { fullName: 'Fajar', password: '12345', role: 'trainer', status: 'approved' },
    'Ratna': { fullName: 'Ratna', password: '12345', role: 'trainer', status: 'approved' },
  });

  const login = (fullName: string, password: string, loginRole: UserRole) => {
    const foundUser = users[fullName];
    
    if (foundUser && foundUser.password === password) {
      if (foundUser.role !== loginRole) {
        return { success: false, message: `Akun ini terdaftar sebagai ${foundUser.role.toUpperCase()}. Silakan masuk melalui jalur yang benar.` };
      }

      if (foundUser.role === 'trainer' && foundUser.status === 'pending') {
        return { success: false, message: 'Akun Trainer Anda sedang menunggu persetujuan dari Trainer lain.' };
      }

      const loggedUser = { fullName: foundUser.fullName, role: foundUser.role, status: foundUser.status };
      setUser(loggedUser);
      return { success: true };
    }
    return { success: false, message: 'Nama atau Password salah.' };
  };

  const register = (fullName: string, password: string, role: UserRole) => {
    if (users[fullName]) {
      return { success: false, message: 'Nama sudah terdaftar, silakan langsung login.' };
    }

    const newUser: User & { password: string } = {
      fullName,
      password,
      role,
      status: role === 'agent' ? 'approved' : 'pending'
    };

    setUsers(prev => ({ ...prev, [fullName]: newUser }));
    return { success: true, message: role === 'agent' ? 'Pendaftaran berhasil. Silakan login.' : 'Pendaftaran berhasil. Menunggu persetujuan Trainer lain.' };
  };

  const logout = () => {
    setUser(null);
  };

  const getAllUsers = () => {
    return Object.keys(users).map(id => ({ ...users[id], id }));
  };

  const approveTrainer = (userId: string) => {
    setUsers(prev => {
      if (!prev[userId]) return prev;
      return {
        ...prev,
        [userId]: { ...prev[userId], status: 'approved' }
      };
    });
  };

  const changePassword = (fullName: string, newPassword: string) => {
    if (!users[fullName]) return { success: false, message: 'User tidak ditemukan.' };
    setUsers(prev => ({
      ...prev,
      [fullName]: { ...prev[fullName], password: newPassword }
    }));
    return { success: true, message: 'Password berhasil diubah.' };
  };

  const forgotPassword = (fullName: string) => {
    const foundUser = users[fullName];
    if (!foundUser) return { success: false, message: 'Nama tidak terdaftar.' };
    
    const defaultPassword = foundUser.role === 'trainer' ? '12345' : 'test';
    
    setUsers(prev => ({
      ...prev,
      [fullName]: { ...prev[fullName], password: defaultPassword }
    }));
    
    return { 
      success: true, 
      message: `Password telah direset ke default (${defaultPassword}). Silakan login kembali.`
    };
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, getAllUsers, approveTrainer, changePassword, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
