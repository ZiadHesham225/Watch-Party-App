import { jwtDecode } from 'jwt-decode';
import { apiService } from './api';
import {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  ApiResponse,
  User,
  JwtClaims,
} from '../types/index';

export const authService = {
  decodeToken(token: string): User | null {
    try {
      const decoded: JwtClaims = jwtDecode(token);
      console.log('Decoded JWT claims:', decoded); // For debugging
      
      // Map JWT claims to User object - handle both full URIs and short names
      const user: User = {
        id: decoded['nameid'] || 
             decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 
             decoded['sub'] || '',
        username: decoded['unique_name'] || 
                 decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
                 decoded['name'] || '',
        displayName: decoded['unique_name'] || 
                    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
                    decoded['name'] || '', // Use username as display name
        email: decoded['email'] || '', // Add email if available
        avatarUrl: decoded['Image'] || `https://api.dicebear.com/7.x/initials/svg?seed=${decoded['unique_name'] || decoded['name'] || 'User'}`
      };
      
      console.log('Mapped user object:', user); // For debugging
      return user;
    } catch (error) {
      return null;
    }
  },

  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const response = await apiService.post<TokenResponse>('/api/auth/login', credentials);
    if (response.accessToken) {
      // Store token
      localStorage.setItem('token', response.accessToken);
      
      // Decode token to get user info
      const user = this.decodeToken(response.accessToken);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
    return response;
  },

  async register(userData: RegisterRequest): Promise<ApiResponse> {
    return apiService.post<ApiResponse>('/api/auth/register', userData);
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiService.post<ApiResponse>('/api/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return apiService.post<ApiResponse>('/api/auth/reset-password', {
      token,
      newPassword,
    });
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch (error) {
        return null;
      }
    }
    
    // If no stored user but we have a token, try to decode it
    const token = this.getStoredToken();
    if (token) {
      const user = this.decodeToken(token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
    }
    
    return null;
  },

  getStoredToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    if (!token) return false;
    
    try {
      const decoded: JwtClaims = jwtDecode(token);
      const now = Date.now() / 1000;
      
      // Check if token is expired
      if (decoded.exp && decoded.exp < now) {
        this.logout(); // Clear expired token
        return false;
      }
      
      return true;
    } catch (error) {
      this.logout(); // Clear invalid token
      return false;
    }
  },

  refreshUserFromToken(): User | null {
    const token = this.getStoredToken();
    if (token) {
      const user = this.decodeToken(token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
    }
    return null;
  },
};
