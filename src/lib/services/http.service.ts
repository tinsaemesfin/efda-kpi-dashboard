import { apiConfig } from '@/lib/config/auth.config';
import { authService } from './auth.service';

class HttpService {
  private baseUrl = apiConfig.baseUrl;

  private async getToken(): Promise<string | null> {
    if (!authService) return null;
    
    // First try the cached token
    let token = authService.getToken();
    
    // If no cached token, try to load user from storage
    if (!token) {
      const user = await authService.getUser();
      token = user?.access_token || null;
    }
    
    return token;
  }

  async get<T>(endpoint: string): Promise<T> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    console.log(`[HTTP] GET ${this.baseUrl}${endpoint}`);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[HTTP] Response status: ${response.status}`);

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.get(endpoint);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HTTP] Error response:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[HTTP] Response data:`, data);
    return data;
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.post(endpoint, data);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.put(endpoint, data);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      const renewed = await authService?.renewToken();
      if (renewed) {
        return this.delete(endpoint);
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const httpService = new HttpService();

