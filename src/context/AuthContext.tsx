import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (username: string, pin: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  addUser: (user: Omit<User, 'id'> & { pin?: string }) => void;
  updateUser: (id: string, updates: Partial<User> & { pin?: string }) => Promise<void>;
  deleteUser: (id: string) => void;
  canAccessModule: (moduleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<(User & { pin?: string })[]>(() => {
    try {
      const saved = localStorage.getItem('eljindi_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load users from storage');
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('eljindi_current_user');
      const savedToken = localStorage.getItem('eljindi_auth_token');
      if (savedUser && savedToken) return JSON.parse(savedUser);
    } catch (e) {
      console.warn('Failed to load active session');
    }
    return null;
  });

  useEffect(() => {
    const token = localStorage.getItem('eljindi_auth_token');
    if (!token) return;

    let mounted = true;
    api.getMe()
      .then((user) => {
        if (mounted) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (mounted) {
          api.logout();
          setCurrentUser(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('eljindi_users', JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save users');
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('eljindi_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('eljindi_current_user');
      }
    } catch (e) {
      console.warn('Failed to sync session');
    }
  }, [currentUser]);

  const login = async (username: string, pin: string): Promise<boolean> => {
    try {
      const user = await api.login(username.trim(), pin.trim());
      setCurrentUser(user);
      api.addAuditLog({
        user: user.name,
        role: user.role,
        action: 'USER_LOGIN',
        module: 'Authentication',
        details: `User ${user.name} (@${user.username}) logged into terminal.`,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.warn('Login failed', error);
      return false;
    }
  };

  const logout = () => {
    if (currentUser) {
      api.addAuditLog({
        user: currentUser.name,
        role: currentUser.role,
        action: 'USER_LOGOUT',
        module: 'Authentication',
        details: `User ${currentUser.name} signed out.`,
        timestamp: new Date().toISOString()
      });
    }
    api.logout();
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole) => {
    const found = users.find((u) => u.role === role && u.active);
    if (found) {
      setCurrentUser(found);
      api.addAuditLog({
        user: found.name,
        role: found.role,
        action: 'SWITCH_ROLE',
        module: 'Users',
        details: `Switched active profile role to ${role}`,
        timestamp: new Date().toISOString()
      });
    }
  };

  const addUser = (userData: Omit<User, 'id'> & { pin?: string }) => {
    const newId = `u_${Date.now()}`;
    const newUser = {
      ...userData,
      id: newId,
      pin: userData.pin || '1234'
    };
    setUsers((prev) => [...prev, newUser]);

    api.addAuditLog({
      user: currentUser ? currentUser.name : 'Admin',
      role: currentUser ? currentUser.role : 'ADMIN',
      action: 'CREATE_USER',
      module: 'Users',
      details: `Created new staff user "${userData.name}" (@${userData.username}) with role ${userData.role}.`,
      timestamp: new Date().toISOString()
    });
  };

  const updateUser = async (id: string, updates: Partial<User> & { pin?: string }) => {
    const targetUser = users.find((u) => u.id === id);
    const isCurrentUser = Boolean(
      currentUser &&
      (String(currentUser.id) === String(id) || currentUser.username === targetUser?.username)
    );
    if (
      isCurrentUser &&
      updates.pin &&
      targetUser?.username
    ) {
      await api.adminResetPassword(targetUser.username, updates.pin);
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
    if (isCurrentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    }

    const isRoleChange = targetUser && updates.role && targetUser.role !== updates.role;
    api.addAuditLog({
      user: currentUser ? currentUser.name : 'Admin',
      role: currentUser ? currentUser.role : 'ADMIN',
      action: isRoleChange ? 'CHANGE_USER_ROLE' : 'UPDATE_USER',
      module: 'Users',
      details: isRoleChange
        ? `Changed user role for "${targetUser?.name}" from ${targetUser?.role} to ${updates.role}.`
        : `Updated profile details for staff user "${targetUser?.name || id}".`,
      timestamp: new Date().toISOString()
    });
  };

  const deleteUser = (id: string) => {
    const targetUser = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(null);
    }

    api.addAuditLog({
      user: currentUser ? currentUser.name : 'Admin',
      role: currentUser ? currentUser.role : 'ADMIN',
      action: 'DELETE_USER',
      module: 'Users',
      details: `Deleted user account "${targetUser?.name || id}" (@${targetUser?.username || 'unknown'}).`,
      timestamp: new Date().toISOString()
    });
  };

  const canAccessModule = (moduleName: string): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;
    if (role === 'ADMIN') return true;

    switch (moduleName) {
      case 'dashboard':
      case 'inventory':
      case 'filters':
      case 'brakes':
      case 'accessories':
      case 'oil':
        return role === 'INVENTORY_MANAGER' || role === 'POS_CASHIER' || role === 'SALES_REP' || role === 'ACCOUNTANT';
      case 'pos':
      case 'sale':
        return role === 'POS_CASHIER' || role === 'SALES_REP' || role === 'INVENTORY_MANAGER';
      case 'debtors':
      case 'customers':
        return role === 'POS_CASHIER' || role === 'SALES_REP' || role === 'ACCOUNTANT';
      case 'purchasing':
      case 'suppliers':
        return role === 'INVENTORY_MANAGER' || role === 'ACCOUNTANT';
      case 'accounting':
      case 'expenses':
        return role === 'ACCOUNTANT';
      case 'reports':
        return role === 'INVENTORY_MANAGER' || role === 'ACCOUNTANT';
      case 'users':
        return role === 'ADMIN';
      case 'settings':
      case 'audit':
        return role === 'ADMIN';
      default:
        return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        switchRole,
        addUser,
        updateUser,
        deleteUser,
        canAccessModule
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

