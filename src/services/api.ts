/**
 * Central API Service for Craft Media Hub CRM Enterprise
 * Handles authentication headers, URL parameter serialization, JSON parsing, and error formatting.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('craftmedia_crm_token') || localStorage.getItem('360crm_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('craftmedia_crm_token', token);
      localStorage.setItem('360crm_token', token);
    } else {
      localStorage.removeItem('craftmedia_crm_token');
      localStorage.removeItem('360crm_token');
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('craftmedia_crm_token') || localStorage.getItem('360crm_token');
    }
    return this.token;
  }

  private normalizeUrl(endpoint: string, params?: Record<string, any>): string {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.replace('/api', '');
    } else if (cleanEndpoint === '/api') {
      cleanEndpoint = '';
    }

    let url = `${API_BASE_URL}${cleanEndpoint}`;

    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    return url;
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async parseResponse(res: Response): Promise<ApiResponse> {
    const text = await res.text();
    if (!text || !text.trim()) {
      if (!res.ok) {
        return { success: false, message: `Server status ${res.status} (${res.statusText || 'Error'}). Please retry in a moment.` };
      }
      return { success: true };
    }
    try {
      const data = JSON.parse(text);
      if (!res.ok && data.success === undefined) {
        data.success = false;
      }
      return data;
    } catch {
      return {
        success: false,
        message: res.ok ? text : `Server returned error (${res.status}). Server might be redeploying, please retry.`
      };
    }
  }

  public async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const url = this.normalizeUrl(endpoint, params);
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return await this.parseResponse(res);
    } catch (err: any) {
      console.error(`API GET ${endpoint} Error:`, err);
      return { success: false, message: err.message || 'Network request failed' };
    }
  }

  public async post<T = any>(endpoint: string, payload?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.normalizeUrl(endpoint);
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: payload ? JSON.stringify(payload) : undefined,
      });
      return await this.parseResponse(res);
    } catch (err: any) {
      console.error(`API POST ${endpoint} Error:`, err);
      return { success: false, message: err.message || 'Network request failed' };
    }
  }

  public async postFormData<T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const url = this.normalizeUrl(endpoint);
      const headers: Record<string, string> = {};
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
      return await this.parseResponse(res);
    } catch (err: any) {
      console.error(`API POST FormData ${endpoint} Error:`, err);
      return { success: false, message: err.message || 'Network request failed' };
    }
  }

  public async put<T = any>(endpoint: string, payload?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.normalizeUrl(endpoint);
      const res = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: payload ? JSON.stringify(payload) : undefined,
      });
      return await this.parseResponse(res);
    } catch (err: any) {
      console.error(`API PUT ${endpoint} Error:`, err);
      return { success: false, message: err.message || 'Network request failed' };
    }
  }

  public async patch<T = any>(endpoint: string, payload?: any): Promise<ApiResponse<T>> {
    try {
      const url = this.normalizeUrl(endpoint);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: payload ? JSON.stringify(payload) : undefined,
      });
      return await this.parseResponse(res);
    } catch (err: any) {
      console.error(`API PATCH ${endpoint} Error:`, err);
      return { success: false, message: err.message || 'Network request failed' };
    }
  }

  public async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = this.normalizeUrl(endpoint);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return await this.parseResponse(res);
    } catch (err: any) {
      console.error(`API DELETE ${endpoint} Error:`, err);
      return { success: false, message: err.message || 'Network request failed' };
    }
  }
}

export const api = new ApiService();
