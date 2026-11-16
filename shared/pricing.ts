// Shared deterministic quote pricing helper (used on server authoritatively and on client preview).

import type { AppSettings, CalculationSettings, Coupon, MenuItem } from './types.js';
import type { NormalizedQuoteRequest } from './validation.js';

export const SETUP_SERVICE_FEE = 1000;

export function calculateDeliveryFeeAmount(
  distanceKm: number | null,
  _subtotal?: number,
  appConfig?: Partial<Pick<AppSettings, 'delivery_base_fee' | 'delivery_price_per_km' | 'delivery_fee'>>,
  _calculationSettings?: Partial<CalculationSettings>
): number {
  if (distanceKm === null || distanceKm === undefined || distanceKm <= 0) return 0;
  const baseFee = Number(appConfig?.delivery_base_fee ?? appConfig?.delivery_fee ?? 150);
  const perKm = Number(appConfig?.delivery_price_per_km ?? 4.5);
  const fee = baseFee + (distanceKm * perKm);
  return Math.round(fee);
}

export interface ServerCalculatedTotals {
  subtotal: number;
  setupFee: number;
  discountAmount: number;
  deliveryFee: number;
  totalPrice: number;
  appliedCouponCode: string | null;
}

export function calculateServerQuoteTotals(options: {
  items: NormalizedQuoteRequest['items'];
  menuById: Map<string, MenuItem>;
  deliveryMethod: 'pickup' | 'delivery';
  distanceKm: number | null;
  wantsSetup: boolean;
  coupon?: Coupon | null;
  appConfig: AppSettings;
  calculationSettings: CalculationSettings;
}): ServerCalculatedTotals {
  let subtotal = 0;
  for (const line of options.items) {
    const dbItem = options.menuById.get(line.menuItemId);
    if (!dbItem) continue;
    subtotal += Number(dbItem.price || 0) * line.quantity;
  }

  const setupFee = options.wantsSetup ? SETUP_SERVICE_FEE : 0;

  let discountAmount = 0;
  let appliedCouponCode: string | null = null;
  if (options.coupon && options.coupon.is_active) {
    const withinLimit =
      options.coupon.usage_limit === null ||
      options.coupon.usage_limit === undefined ||
      Number(options.coupon.usage_count || 0) < Number(options.coupon.usage_limit);
    if (withinLimit) {
      appliedCouponCode = options.coupon.code;
      const val = Number(options.coupon.discount_value || 0);
      if (options.coupon.discount_type === 'percentage') {
        discountAmount = Math.round((subtotal + setupFee) * (Math.min(Math.max(val, 0), 100) / 100));
      } else {
        discountAmount = Math.min(Math.max(val, 0), subtotal + setupFee);
      }
    }
  }

  const deliveryFee =
    options.deliveryMethod === 'delivery'
      ? calculateDeliveryFeeAmount(
          options.distanceKm,
          subtotal,
          options.appConfig,
          options.calculationSettings
        )
      : 0;

  const totalPrice = Math.max(0, subtotal + setupFee - discountAmount + deliveryFee);
  return { subtotal, setupFee, discountAmount, deliveryFee, totalPrice, appliedCouponCode };
}
