import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, apiUtils } from '../services/apiService';

const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
        loading: false,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch({ type: 'SET_LOADING', payload: true });
      loadUserProfile();
    }
  }, []);

  // Load user profile
  const loadUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.data,
          token: localStorage.getItem('token'),
        },
      });
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorInfo.message });
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  };

  // Login function
  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authAPI.login(credentials);
      const { user, token, refreshToken } = response.data.data;
      
      // Store tokens
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorInfo.message });
      return { success: false, error: errorInfo.message };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.register(userData);
      const { user, token, refreshToken } = response.data.data;
      
      // Store tokens
      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      dispatch({ type: 'SET_ERROR', payload: errorInfo.message });
      return { success: false, error: errorInfo.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens regardless of API call success
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      dispatch({ type: 'UPDATE_PROFILE', payload: response.data.data });
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      return { success: false, error: errorInfo.message };
    }
  };

  // Change password function
  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      return { success: false, error: errorInfo.message };
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return state.user?.roles?.includes(role) || false;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    if (!state.user?.roles) return false;
    return roles.some(role => state.user.roles.includes(role));
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
    hasRole,
    hasAnyRole,
    loadUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected routes
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access this page.</p>
            <a 
              href="/login" 
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </a>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

// HOC for role-based access
export const withRole = (Component, requiredRoles) => {
  return withAuth(function RoleProtectedComponent(props) {
    const { hasAnyRole } = useAuth();
    
    if (!hasAnyRole(requiredRoles)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
            <a 
              href="/" 
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  });
};

export default AuthContext;