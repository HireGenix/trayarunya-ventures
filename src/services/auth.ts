// Authentication service

// User type definition
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
}

// Auth state type
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Login response type
interface LoginResponse {
  user: User;
  token: string;
}

// Login function
export async function login(email: string, password: string): Promise<AuthState> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data: LoginResponse = await response.json();
    
    // Store token in localStorage
    localStorage.setItem('auth_token', data.token);
    
    // Store user info in localStorage (optional, for convenience)
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return {
      isAuthenticated: true,
      user: data.user,
      token: data.token,
      loading: false,
      error: null,
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

// Logout function
export function logout(): AuthState {
  // Remove token and user from localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  
  return {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
  };
}

// Check if user is authenticated
export function checkAuth(): AuthState {
  try {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      return {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    }
    
    const user = JSON.parse(userStr) as User;
    
    return {
      isAuthenticated: true,
      user,
      token,
      loading: false,
      error: null,
    };
  } catch (error) {
    // If there's an error (e.g., invalid JSON in localStorage), log out
    return logout();
  }
}

// Verify token with the server
export async function verifyToken(): Promise<AuthState> {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    }
    
    const response = await fetch('/api/auth', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      // If token is invalid, log out
      return logout();
    }
    
    const data = await response.json();
    
    // Update user info in localStorage
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return {
      isAuthenticated: true,
      user: data.user,
      token,
      loading: false,
      error: null,
    };
  } catch (error) {
    // If there's an error, log out
    return logout();
  }
}

// Check if user is a super admin
export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'superadmin';
}

// Check if user has admin access (either admin or superadmin)
export function hasAdminAccess(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'superadmin';
}
