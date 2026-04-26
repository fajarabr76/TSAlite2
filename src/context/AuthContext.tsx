import React, { createContext, useContext, useState, ReactNode } from 'react';

type UserRole = 'trainer' | 'agent';
type UserStatus = 'approved' | 'pending';

type User = {
  fullName: string;
  role: UserRole;
  status: UserStatus;
};

type AuthContextType = {
  user: User | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Auto-set user to Trainer as trainer
  const [user] = useState<User | null>({
    fullName: 'Trainer',
    role: 'trainer',
    status: 'approved'
  });

  return (
    <AuthContext.Provider value={{ user }}>
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
