// Browser API client for communicating exclusively with server-side /api endpoints.
// Contains zero database credentials, zero API keys, and zero secret signing logic.

import type { TelemetryEventName } from '../../shared/config';
import type { QuoteRequestInput } from '../../shared/validation';
import type {
  AboutUsConfig,
  AdvancedCalculationSettings,
  AppSettings,
  CalculationSettings,
  Coupon,
  CustomerSafeQuoteView,
  EventPackage,
  FeatureFlags,
  GalleryItem,
  KosherCertMetadata,
  MenuItem,
  Order,
  PracticalInfoConfig,
  PublicContactSummary,
  Review,
} from '../types';
import type { KosherStatusEvaluation } from '../../shared/media';

export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, { he: string; en: string }>;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code: string,
    fieldErrors?: Record<string, { he: string; en: string }>,
    details?: unknown
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = { error: text };
    }
  }

  if (!res.ok) {
    const code = typeof json.code === 'string' ? json.code : `HTTP_${res.status}`;
    const message =
      (typeof json.errorHe === 'string' && json.errorHe) ||
      (typeof json.error === 'string' && json.error) ||
      `Request failed (${res.status})`;
    throw new ApiError(
      message,
      res.status,
      code,
      json.fieldErrors as Record<string, { he: string; en: string }> | undefined,
      json
    );
  }

  return json as T;
}

export interface BootstrapResponse {
  menuItems: MenuItem[];
  reviews: Review[];
  settings: {
    config: AppSettings;
    theme: Record<string, string> | null;
    features: FeatureFlags;
    about: AboutUsConfig | null;
    calculation_settings: CalculationSettings;
    advanced_settings: AdvancedCalculationSettings;
    kosher: KosherCertMetadata;
    kosherEvaluation: KosherStatusEvaluation;
    gallery: GalleryItem[];
    public_contact: PublicContactSummary;
    packages: EventPackage[];
    blockedDates: string[];
    maxDeliveryDistanceKm: number | null;
  };
}

export const api = {
  // Public
  fetchPublicBootstrap: () => apiRequest<BootstrapResponse>('/api/public/bootstrap'),

  validateCoupon: (code: string) =>
    apiRequest<{
      valid: boolean;
      coupon?: Pick<Coupon, 'code' | 'discount_type' | 'discount_value'>;
    }>('/api/public/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  submitQuote: (payload: QuoteRequestInput) =>
    apiRequest<{
      ok: boolean;
      deduplicated: boolean;
      reference_code: string;
      quote_token: string;
      quote_url: string;
      notification_status: 'sent' | 'failed' | 'unconfigured' | 'pending';
      delivery_method: 'pickup' | 'delivery';
      contact: PublicContactSummary;
      totals?: {
        subtotal: number;
        setupFee: number;
        discountAmount: number;
        deliveryFee: number;
        totalPrice: number;
      };
    }>('/api/public/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  fetchScopedQuote: (token: string) =>
    apiRequest<{ ok: boolean; quote: CustomerSafeQuoteView }>(
      `/api/public/quote?token=${encodeURIComponent(token)}`
    ),

  fetchLegacyQuoteError: (quoteId: string) =>
    apiRequest<{ ok: false }>(`/api/public/quote?quote=${encodeURIComponent(quoteId)}`),

  submitReview: (payload: { customer_name: string; rating: number; comment: string }) =>
    apiRequest<{ ok: boolean; id: string; status: string; messageHe: string; messageEn: string }>(
      '/api/public/reviews',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  requestAiMenu: (payload: {
    prompt: string;
    adults: number;
    children: number;
    eventType: string;
    language: 'he' | 'en';
  }) =>
    apiRequest<{
      ok: boolean;
      proposal: {
        items: Array<{ menuItem: MenuItem; quantity: number; note?: string }>;
        explanation: string;
        requiresDietaryConfirmation: boolean;
      };
    }>('/api/public/ai-menu', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  trackEvent: (event_name: TelemetryEventName, meta?: Record<string, string | number | boolean>) => {
    try {
      void fetch('/api/public/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name, meta: meta || {} }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore best-effort telemetry errors
    }
  },

  // Admin auth
  checkAdminSession: () =>
    apiRequest<{ authenticated: boolean; expiresAt: string | null }>('/api/admin/auth'),

  loginAdmin: (password: string) =>
    apiRequest<{ ok: boolean; authenticated: boolean }>('/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logoutAdmin: () =>
    apiRequest<{ ok: boolean; authenticated: boolean }>('/api/admin/auth', {
      method: 'DELETE',
    }),

  // Admin orders & telemetry
  fetchAdminOrders: () =>
    apiRequest<{
      orders: Order[];
      telemetrySummary: Array<{ event_name: string; count: number }>;
    }>('/api/admin/orders'),

  updateAdminOrder: (payload: {
    id: string;
    status?: Order['status'];
    handoff_status?: Order['handoff_status'];
    mint_share_token?: boolean;
    items?: unknown[];
    subtotal?: number;
    discount_amount?: number;
    delivery_fee?: number;
    total_price?: number;
    wants_setup?: boolean;
    show_item_prices?: boolean;
    notes?: string;
  }) =>
    apiRequest<{ ok: boolean; order: Order; quote_url?: string }>('/api/admin/orders', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  resendOrderNotification: (id: string) =>
    apiRequest<{ ok: boolean; notification: { status: string; error?: string } }>(
      '/api/admin/orders',
      {
        method: 'POST',
        body: JSON.stringify({ id, action: 'resend_notification' }),
      }
    ),

  deleteAdminOrder: (id: string) =>
    apiRequest<{ ok: boolean }>('/api/admin/orders', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),

  // Admin catalog (menu, coupons, reviews)
  fetchAdminMenu: () => apiRequest<{ menuItems: MenuItem[] }>('/api/admin/catalog?resource=menu'),
  createMenuItem: (item: Partial<MenuItem>) =>
    apiRequest<{ ok: boolean; item: MenuItem }>('/api/admin/catalog?resource=menu', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  updateMenuItem: (item: Partial<MenuItem> & { id: string }) =>
    apiRequest<{ ok: boolean; item: MenuItem }>('/api/admin/catalog?resource=menu', {
      method: 'PUT',
      body: JSON.stringify(item),
    }),
  deleteMenuItem: (id: string) =>
    apiRequest<{ ok: boolean }>(
      `/api/admin/catalog?resource=menu&id=${encodeURIComponent(id)}`,
      { method: 'DELETE', body: JSON.stringify({ id }) }
    ),

  fetchAdminCoupons: () => apiRequest<{ coupons: Coupon[] }>('/api/admin/catalog?resource=coupons'),
  saveAdminCoupon: (coupon: Partial<Coupon> & { code: string }) =>
    apiRequest<{ ok: boolean; coupon: Coupon }>('/api/admin/catalog?resource=coupons', {
      method: 'POST',
      body: JSON.stringify(coupon),
    }),
  toggleAdminCoupon: (code: string, is_active: boolean) =>
    apiRequest<{ ok: boolean }>('/api/admin/catalog?resource=coupons', {
      method: 'PATCH',
      body: JSON.stringify({ code, is_active }),
    }),
  deleteAdminCoupon: (code: string) =>
    apiRequest<{ ok: boolean }>(
      `/api/admin/catalog?resource=coupons&code=${encodeURIComponent(code)}`,
      { method: 'DELETE', body: JSON.stringify({ code }) }
    ),

  fetchAdminReviews: () => apiRequest<{ reviews: Review[] }>('/api/admin/catalog?resource=reviews'),
  moderateAdminReview: (id: string, status: 'approved' | 'rejected' | 'pending') =>
    apiRequest<{ ok: boolean }>('/api/admin/catalog?resource=reviews', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    }),
  deleteAdminReview: (id: string) =>
    apiRequest<{ ok: boolean }>(
      `/api/admin/catalog?resource=reviews&id=${encodeURIComponent(id)}`,
      { method: 'DELETE', body: JSON.stringify({ id }) }
    ),

  // Admin settings & authenticated Cloudinary upload
  fetchAdminSettings: () =>
    apiRequest<{
      settings: BootstrapResponse['settings'] & {
        practical_info: PracticalInfoConfig;
        packages: EventPackage[];
      };
    }>('/api/admin/settings'),

  saveAdminSetting: (key: string, value: unknown) =>
    apiRequest<{
      ok: boolean;
      settings: BootstrapResponse['settings'] & {
        practical_info: PracticalInfoConfig;
        packages: EventPackage[];
      };
    }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    }),

  uploadMediaSigned: async (
    file: File,
    resourceType: 'image' | 'video' | 'raw' = 'image',
    publicId?: string
  ): Promise<string> => {
    const sig = await apiRequest<{
      cloudName: string;
      apiKey: string;
      timestamp: number;
      folder: string;
      publicId: string;
      resourceType: 'image' | 'video' | 'raw';
      signature: string;
    }>('/api/admin/upload-signature', {
      method: 'POST',
      body: JSON.stringify({ resourceType, publicId }),
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sig.apiKey);
    formData.append('timestamp', String(sig.timestamp));
    formData.append('signature', sig.signature);
    formData.append('folder', sig.folder);
    formData.append('public_id', sig.publicId);

    const uploadResp = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`,
      { method: 'POST', body: formData }
    );
    if (!uploadResp.ok) {
      const txt = await uploadResp.text();
      throw new ApiError(`Upload failed: ${txt}`, uploadResp.status, 'UPLOAD_FAILED');
    }
    const uploaded = (await uploadResp.json()) as { secure_url?: string };
    if (!uploaded.secure_url) {
      throw new ApiError('Missing uploaded URL', 500, 'UPLOAD_FAILED');
    }
    return uploaded.secure_url;
  },
};
