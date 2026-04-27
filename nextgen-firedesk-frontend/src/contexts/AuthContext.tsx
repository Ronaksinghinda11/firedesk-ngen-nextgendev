import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Role } from '../types/permissions';
import { resolveDashboardRoute } from '@/utils/dashboardResolver';

interface User {
  id: string;
  name: string;
  email: string;
  userType: 'admin' | 'manager' | 'technician' | 'observer';
  user_type?: string; // Backend uses snake_case
  displayName?: string;
  phone?: string;
  profile?: string; // Legacy
  profile_pic?: string; // Correct field from backend
  role?: Role;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginTechnician: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isTechnician: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (!accessToken) {
        setLoading(false);
        return;
      }

      // If we have a stored user, use that immediately (optimistic)
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Normalize user_type to userType
          if (parsedUser.user_type && !parsedUser.userType) {
            parsedUser.userType = parsedUser.user_type;
          }
          setUser(parsedUser);
        } catch (e) {
          console.error('Error parsing stored user:', e);
          localStorage.removeItem('user');
        }
      }

      // ALWAYS fetch fresh user profile from backend to ensure permissions are up to date
      // This implements a "stale-while-revalidate" strategy
      try {
        const userData = await api.get<{ success: boolean; user: User }>('/auth/me');
        const normalizedUser = {
          ...userData.user,
          userType: (userData.user.user_type || userData.user.userType || userData.user.role?.name?.toLowerCase() || 'admin') as User['userType']
        };

        // Deep equality check could be done here to avoid unnecessary renders, 
        // but for now simply updating ensures consistency
        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      } catch (apiError) {
        console.warn('Failed to refresh user profile:', apiError);
        // If we have a stored user, we can stay logged in but warn
        // If no stored user and API failed, we must log out
        if (!storedUser) {
          throw apiError;
        }
      }


    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Backend: POST /auth/login returns { success, user, access_token }
    const response = await api.post<{ success: boolean; user: User; access_token: string }>('/auth/login', {
      email,
      password,
    });

    // DEBUG: Log the full response to see what backend returns
    console.log('[AUTH] Login response:', response);
    console.log('[AUTH] User role:', response.user?.role);
    console.log('[AUTH] User permissions:', response.user?.role?.permissions);

    // Normalize user_type to userType
    const normalizedUser = {
      ...response.user,
      userType: (response.user.user_type || response.user.userType || response.user.role?.name?.toLowerCase() || 'admin') as User['userType']
    };

    console.log('[AUTH] Normalized user:', normalizedUser);
    console.log('[AUTH] Normalized user.role.permissions:', normalizedUser.role?.permissions);

    // Prevent technician login from main portal
    if (normalizedUser.userType === 'technician') {
      throw new Error('Technicians must use the dedicated Technician Login page');
    }

    localStorage.setItem('accessToken', response.access_token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);

    // Navigate based on user role and permissions using smart routing
    const dashboardRoute = resolveDashboardRoute(normalizedUser);
    navigate(dashboardRoute);
  };

  const loginTechnician = async (phoneNumber: string, otp: string) => {
    const response = await api.post<{
      technician: User;
      accessToken: string;
      refreshToken: string;
      auth: boolean;
      success: boolean;
    }>('/technician/login', {
      contactNo: phoneNumber,
      otp: otp,
      deviceToken: '',
    });

    if ((response.auth || response.success) && response.technician) {
      // Normalize technician user with proper userType and role
      const normalizedUser: User = {
        ...response.technician,
        userType: 'technician',
        role: {
          name: 'technician',
          permissions: { entities: {} } // Technicians have limited permissions
        } as Role
      };

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      navigate('/technician/dashboard');
    } else {
      throw new Error('Authentication failed');
    }
  };

  const logout = async () => {
    try {
      const userType = user?.userType || (user as any)?.user_type;
      if (userType === 'technician') {
        await api.post('/technician/logout');
      } else {
        // Backend: POST /auth/logout
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      const userType = user?.userType || (user as any)?.user_type;
      setUser(null);
      navigate(userType === 'technician' ? '/technician/login' : '/login');
    }
  };

  const userType = (user?.userType || (user as any)?.user_type) as string | undefined;
  const isAdmin = userType === 'admin' || user?.role?.name?.toLowerCase() === 'admin';
  const isManager = userType === 'manager' || user?.role?.name?.toLowerCase() === 'manager';
  const isTechnician = userType === 'technician' || user?.role?.name?.toLowerCase() === 'technician';

  return (
    <AuthContext.Provider value={{ user, loading, login, loginTechnician, logout, isAdmin, isManager, isTechnician }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Export AuthContext for use in usePermissions hook
export { AuthContext };
