/**
 * DDoS Defense API Client
 * DDoS savunma ve izleme API fonksiyonları
 */

import { api, ApiResponse } from '../api';

// Type definitions
export interface DDoSStatus {
  attacks: {
    totalAttacks: number;
    criticalAttacks: number;
    highAttacks: number;
    blockedAttacks: number;
    recentAttacks: number;
  };
  blocked: {
    activeBlocks: number;
  };
  requests: {
    totalRequests: number;
    errorRequests: number;
    avgResponseTime: number;
  };
  detection: {
    trackedIPs: number;
    activeAttacks: number;
    scoredIPs: number;
    thresholds: {
      rpm: number;
      tpm: number;
      attackCount: number;
    };
  };
  settings: {
    autoDefenseEnabled: boolean;
    thresholds: {
      rpm: number;
      tpm: number;
      attackCount: number;
    };
  };
  timestamp: string;
}

export interface DDoSAttack {
  id: number;
  ip: string;
  attackType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requestCount: number;
  startTime: string;
  endTime: string | null;
  blocked: boolean;
  autoBlocked: boolean;
  details: any;
  createdAt: string;
}

export interface DDoSAttackListResponse {
  attacks: DDoSAttack[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DDoSAttackDetail extends DDoSAttack {
  logs: Array<{
    id: number;
    endpoint: string;
    method: string;
    userAgent: string;
    responseCode: number;
    responseTime: number;
    timestamp: string;
    requestHeaders: any;
  }>;
}

export interface BlockedIP {
  id: number;
  ip: string;
  reason: string;
  blockedBy: number | null;
  blockedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  isPermanent: boolean;
  attackCount: number;
  lastAttackAt: string | null;
  totalAttacks: number;
  isExpired: boolean;
}

export interface BlockedIPListResponse {
  blockedIPs: BlockedIP[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DDoSMetric {
  timeSlot: string;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  uniqueIPs: number;
  attackCount: number;
  criticalAttacks: number;
  blockedAttacks: number;
  blockedCount: number;
}

export interface DDoSMetricsResponse {
  metrics: DDoSMetric[];
  interval: string;
  startDate: string;
  endDate: string;
}

export interface TopAttacker {
  ip: string;
  attackCount: number;
  totalRequests: number;
  maxSeverity: string;
  lastAttack: string;
  blockedCount: number;
  isBlocked: boolean;
  isPermanent: boolean;
  expiresAt: string | null;
}

export interface TopAttackersResponse {
  attackers: TopAttacker[];
  period: string;
}

export interface DDoSDefenseSettings {
  id?: number;
  tenantId: number;
  autoDefenseEnabled: boolean;
  rpmThreshold: number;
  tpmThreshold: number;
  attackCountThreshold: number;
  blockDuration: number;
  permanentBlockAfter: number;
  alertThresholds: {
    high: number;
    critical: number;
  };
  notificationSettings: {
    email: boolean;
    webhook: boolean;
    webhookUrl?: string;
  };
  whitelist: string[];
  blacklist: string[];
}

export interface SSEEvent {
  event: string;
  data: any;
  timestamp: string;
}

/**
 * DDoS API Client
 */
export class DDoSAPI {
  /**
   * Genel durum ve metrikler
   */
  static async getStatus(): Promise<ApiResponse<DDoSStatus>> {
    return api.get<ApiResponse<DDoSStatus>>('/admin/ddos/status');
  }

  /**
   * Saldırı listesi
   */
  static async getAttacks(params?: {
    page?: number;
    limit?: number;
    severity?: string;
    attackType?: string;
    blocked?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<DDoSAttackListResponse>> {
    return api.get<ApiResponse<DDoSAttackListResponse>>('/admin/ddos/attacks', params);
  }

  /**
   * Saldırı detayı
   */
  static async getAttack(id: number): Promise<ApiResponse<{ attack: DDoSAttackDetail }>> {
    return api.get<ApiResponse<{ attack: DDoSAttackDetail }>>(`/admin/ddos/attacks/${id}`);
  }

  /**
   * Engellenen IP listesi
   */
  static async getBlockedIPs(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    isPermanent?: boolean;
  }): Promise<ApiResponse<BlockedIPListResponse>> {
    return api.get<ApiResponse<BlockedIPListResponse>>('/admin/ddos/blocked-ips', params);
  }

  /**
   * IP engelleme
   */
  static async blockIP(data: {
    ip: string;
    reason?: string;
    isPermanent?: boolean;
    blockDuration?: number;
  }): Promise<ApiResponse<any>> {
    return api.post<ApiResponse<any>>('/admin/ddos/block-ip', data);
  }

  /**
   * IP engelleme kaldırma
   */
  static async unblockIP(data: { ip: string }): Promise<ApiResponse<any>> {
    return api.post<ApiResponse<any>>('/admin/ddos/unblock-ip', data);
  }

  /**
   * Toplu IP engelleme
   */
  static async bulkBlockIPs(data: {
    ips: string[];
    reason?: string;
    isPermanent?: boolean;
    blockDuration?: number;
  }): Promise<ApiResponse<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ ip: string; success: boolean; error?: string }>;
  }>> {
    return api.post<ApiResponse<any>>('/admin/ddos/bulk-block', data);
  }

  /**
   * Zaman bazlı metrikler (grafik için)
   */
  static async getMetrics(params?: {
    startDate?: string;
    endDate?: string;
    interval?: 'hour' | 'day';
  }): Promise<ApiResponse<DDoSMetricsResponse>> {
    return api.get<ApiResponse<DDoSMetricsResponse>>('/admin/ddos/metrics', params);
  }

  /**
   * En aktif saldırganlar
   */
  static async getTopAttackers(params?: {
    limit?: number;
    days?: number;
  }): Promise<ApiResponse<TopAttackersResponse>> {
    return api.get<ApiResponse<TopAttackersResponse>>('/admin/ddos/top-attackers', params);
  }

  /**
   * Savunma ayarları
   */
  static async getSettings(): Promise<ApiResponse<DDoSDefenseSettings>> {
    return api.get<ApiResponse<DDoSDefenseSettings>>('/admin/ddos/settings');
  }

  /**
   * Savunma ayarları güncelle
   */
  static async updateSettings(settings: Partial<DDoSDefenseSettings>): Promise<ApiResponse<any>> {
    return api.post<ApiResponse<any>>('/admin/ddos/settings', settings);
  }

  /**
   * IP'yi whitelist'e ekle
   */
  static async addToWhitelist(ip: string): Promise<ApiResponse<any>> {
    return api.post<ApiResponse<any>>('/admin/ddos/whitelist/add', { ip });
  }

  /**
   * IP'yi whitelist'ten çıkar
   */
  static async removeFromWhitelist(ip: string): Promise<ApiResponse<any>> {
    return api.post<ApiResponse<any>>('/admin/ddos/whitelist/remove', { ip });
  }

  /**
   * SSE (Server-Sent Events) aboneliği
   * Gerçek zamanlı DDoS event'leri için
   */
  static subscribeRealtime(
    onEvent: (event: SSEEvent) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.huglutekstil.com/api';
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || '';
    
    // Auth token'ı al
    let authToken = '';
    if (typeof window !== 'undefined') {
      authToken = sessionStorage.getItem('authToken') || '';
    }
    
    // SSE URL oluştur
    const url = `${baseUrl}/admin/ddos/stream`;
    
    // EventSource oluştur (headers desteklenmediği için token'ı query param olarak gönderemeyiz)
    // Bu durumda backend'de session/cookie kullanılmalı veya token'ı başka şekilde göndermeliyiz
    // Şimdilik basit EventSource kullanıyoruz, backend'de authenticateAdmin zaten kontrol ediyor
    const eventSource = new EventSource(url, {
      withCredentials: true
    });
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (error) {
        console.error('SSE event parse hatası:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE bağlantı hatası:', error);
      if (onError) {
        onError(error);
      }
    };
    
    return eventSource;
  }

  /**
   * SSE aboneliğini kapat
   */
  static unsubscribeRealtime(eventSource: EventSource): void {
    if (eventSource) {
      eventSource.close();
    }
  }
}

export default DDoSAPI;

