import { api } from '../api';

/**
 * Analytics Service - Admin panel için analitik API çağrıları
 */
export const analyticsService = {
  /**
   * Gerçek zamanlı genel bakış
   */
  async getRealtimeOverview(minutes: number = 60) {
    const response = await api.get(`/admin/analytics/realtime/overview?minutes=${minutes}`);
    return response.data;
  },

  /**
   * Canlı kullanıcılar
   */
  async getRealtimeUsers(limit: number = 100) {
    const response = await api.get(`/admin/analytics/realtime/users?limit=${limit}`);
    return response.data;
  },

  /**
   * Canlı eventler
   */
  async getRealtimeEvents(limit: number = 50) {
    const response = await api.get(`/admin/analytics/realtime/events?limit=${limit}`);
    return response.data;
  },

  /**
   * E-ticaret genel bakış
   */
  async getEcommerceOverview(startDate?: string, endDate?: string, days?: number) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (days) params.append('days', days.toString());
    
    const response = await api.get(`/admin/analytics/ecommerce/overview?${params.toString()}`);
    return response.data;
  },

  /**
   * Gelir analizi
   */
  async getRevenue(startDate?: string, endDate?: string, days?: number) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (days) params.append('days', days.toString());
    
    const response = await api.get(`/admin/analytics/ecommerce/revenue?${params.toString()}`);
    return response.data;
  },

  /**
   * Ürün performansı
   */
  async getProducts(startDate?: string, endDate?: string, days?: number, limit: number = 20) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (days) params.append('days', days.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get(`/admin/analytics/ecommerce/products?${params.toString()}`);
    return response.data;
  },

  /**
   * Funnel listesi
   */
  async getFunnels() {
    const response = await api.get('/admin/analytics/ecommerce/funnels');
    return response.data;
  },

  /**
   * Funnel oluştur
   */
  async createFunnel(funnelData: {
    funnelName: string;
    funnelSteps: Array<{ name: string; eventType: string }>;
    dateRangeStart?: string;
    dateRangeEnd?: string;
  }) {
    const response = await api.post('/admin/analytics/ecommerce/funnels', funnelData);
    return response.data;
  },

  /**
   * Kullanıcı genel bakış
   */
  async getUserOverview(startDate?: string, endDate?: string, days?: number) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (days) params.append('days', days.toString());
    
    const response = await api.get(`/admin/analytics/users/overview?${params.toString()}`);
    return response.data;
  },

  /**
   * Kohort listesi
   */
  async getCohorts(limit: number = 50) {
    const response = await api.get(`/admin/analytics/users/cohorts?limit=${limit}`);
    return response.data;
  },

  /**
   * Kohort oluştur
   */
  async createCohort(cohortData: {
    cohortName: string;
    cohortType?: 'registration' | 'first_purchase' | 'custom';
    cohortDate: string;
  }) {
    const response = await api.post('/admin/analytics/users/cohorts', cohortData);
    return response.data;
  },

  /**
   * Retention analizi
   */
  async getRetention(cohortDate: string, cohortType?: string) {
    const params = new URLSearchParams();
    params.append('cohortDate', cohortDate);
    if (cohortType) params.append('cohortType', cohortType);
    
    const response = await api.get(`/admin/analytics/users/retention?${params.toString()}`);
    return response.data;
  },

  /**
   * Session analizi
   */
  async getSessions(startDate?: string, endDate?: string, days?: number) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (days) params.append('days', days.toString());
    
    const response = await api.get(`/admin/analytics/behavior/sessions?${params.toString()}`);
    return response.data;
  },

  /**
   * Ekran analizi
   */
  async getScreens(startDate?: string, endDate?: string, days?: number, limit: number = 20) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (days) params.append('days', days.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get(`/admin/analytics/behavior/screens?${params.toString()}`);
    return response.data;
  },

  /**
   * Navigasyon analizi
   */
  async getNavigation(startDate?: string, endDate?: string, days?: number) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (days) params.append('days', days.toString());
    
    const response = await api.get(`/admin/analytics/behavior/navigation?${params.toString()}`);
    return response.data;
  },

  /**
   * Rapor listesi
   */
  async getReports(limit: number = 50, offset: number = 0) {
    const response = await api.get(`/admin/analytics/reports?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  /**
   * Rapor oluştur
   */
  async generateReport(reportData: {
    reportName: string;
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
    reportTemplate?: string;
    parameters?: any;
    dateRange?: {
      start: string;
      end: string;
    };
  }) {
    const response = await api.post('/admin/analytics/reports/generate', reportData);
    return response.data;
  },

  /**
   * Rapor detayı
   */
  async getReport(reportId: number) {
    const response = await api.get(`/admin/analytics/reports/${reportId}`);
    return response.data;
  },

  /**
   * Rapor export
   */
  async exportReport(reportId: number, format: 'pdf' | 'excel' = 'pdf') {
    const response = await api.get(`/admin/analytics/reports/${reportId}/export?format=${format}`);
    return response.data;
  }
};

