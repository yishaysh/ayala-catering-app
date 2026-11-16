import { describe, expect, it } from 'vitest';
import { calculateDeliveryFeeAmount } from '../shared/pricing.js';
import {
  getJerusalemParts,
  jerusalemWallClockToUtcMs,
  validateEventDateLeadTime,
} from '../shared/time.js';
import {
  serializeNormalizedQuoteForIdempotency,
  validatePhoneInput,
  validateQuoteRequest,
  validateReviewInput,
  validateStrictNonNegativeInt,
  type QuoteRequestInput,
} from '../shared/validation.js';

describe('validatePhoneInput', () => {
  it('accepts valid Israeli mobile, landline, VoIP, and international formats', () => {
    expect(validatePhoneInput('054-747-4764')).toMatchObject({
      valid: true,
      normalized: '+972547474764',
    });
    expect(validatePhoneInput('0501234567')).toMatchObject({
      valid: true,
      normalized: '+972501234567',
    });
    expect(validatePhoneInput('09-8841234')).toMatchObject({
      valid: true,
      normalized: '+97298841234',
    });
    expect(validatePhoneInput('+972 54 747 4764')).toMatchObject({
      valid: true,
      normalized: '+972547474764',
    });
    expect(validatePhoneInput('0044 20 7946 0958')).toMatchObject({
      valid: true,
      normalized: '+442079460958',
    });
  });

  it('rejects alphabetic, empty, malformed, and out-of-length inputs', () => {
    expect(validatePhoneInput('abc').valid).toBe(false);
    expect(validatePhoneInput('').valid).toBe(false);
    expect(validatePhoneInput('054123').valid).toBe(false);
    expect(validatePhoneInput('054-123-45678').valid).toBe(false);
    expect(validatePhoneInput('+972-123').valid).toBe(false);
    expect(validatePhoneInput('054+1234567').valid).toBe(false);
  });
});

describe('validateStrictNonNegativeInt', () => {
  it('accepts non-negative whole integers and optional empty values', () => {
    expect(
      validateStrictNonNegativeInt(0, { labelHe: 'ילדים', labelEn: 'Children' })
    ).toEqual({ valid: true, value: 0 });
    expect(
      validateStrictNonNegativeInt('20', { labelHe: 'מבוגרים', labelEn: 'Adults' })
    ).toEqual({ valid: true, value: 20 });
    expect(
      validateStrictNonNegativeInt('', { required: false, labelHe: 'ילדים', labelEn: 'Children' })
    ).toEqual({ valid: true, value: null });
  });

  it('rejects negative numbers, decimals, NaN, and missing required values', () => {
    expect(
      validateStrictNonNegativeInt(-5, { labelHe: 'מבוגרים', labelEn: 'Adults' }).valid
    ).toBe(false);
    expect(
      validateStrictNonNegativeInt('-5', { labelHe: 'מבוגרים', labelEn: 'Adults' }).valid
    ).toBe(false);
    expect(
      validateStrictNonNegativeInt(12.5, { labelHe: 'מבוגרים', labelEn: 'Adults' }).valid
    ).toBe(false);
    expect(
      validateStrictNonNegativeInt('12.5', { labelHe: 'מבוגרים', labelEn: 'Adults' }).valid
    ).toBe(false);
    expect(
      validateStrictNonNegativeInt('', { required: true, labelHe: 'מבוגרים', labelEn: 'Adults' }).valid
    ).toBe(false);
  });
});

describe('Asia/Jerusalem time and lead-time validation', () => {
  const fixedNow = new Date('2026-11-13T10:00:00.000Z'); // 12:00 Asia/Jerusalem (UTC+2)

  it('resolves Israel winter and summer DST offsets accurately', () => {
    const winterMs = jerusalemWallClockToUtcMs('2026-11-15', '12:00');
    expect(getJerusalemParts(new Date(winterMs)).timeStr).toBe('12:00');
    expect(new Date(winterMs).toISOString()).toBe('2026-11-15T10:00:00.000Z');

    const summerMs = jerusalemWallClockToUtcMs('2026-07-15', '12:00');
    expect(getJerusalemParts(new Date(summerMs)).timeStr).toBe('12:00');
    expect(new Date(summerMs).toISOString()).toBe('2026-07-15T09:00:00.000Z');
  });

  it('blocks past dates and date-only truncation inside 48-hour lead window', () => {
    const past = validateEventDateLeadTime({
      eventDate: '2026-11-01',
      leadTimeHours: 48,
      now: fixedNow,
    });
    expect(past.valid).toBe(false);
    expect(past.reason).toBe('insufficient_lead_time');

    // Cutoff is 2026-11-15 12:00 Jerusalem time; date-only resolves to 00:00 so it must be rejected
    const truncatedSameCutoffDay = validateEventDateLeadTime({
      eventDate: '2026-11-15',
      leadTimeHours: 48,
      now: fixedNow,
    });
    expect(truncatedSameCutoffDay.valid).toBe(false);
    expect(truncatedSameCutoffDay.reason).toBe('insufficient_lead_time');

    // Explicit time on cutoff day at 11:30 is still under 48h -> rejected; 12:30 -> accepted
    expect(
      validateEventDateLeadTime({
        eventDate: '2026-11-15',
        eventTime: '11:30',
        leadTimeHours: 48,
        now: fixedNow,
      }).valid
    ).toBe(false);

    expect(
      validateEventDateLeadTime({
        eventDate: '2026-11-15',
        eventTime: '12:30',
        leadTimeHours: 48,
        now: fixedNow,
      }).valid
    ).toBe(true);
  });

  it('rejects owner-configured blocked dates', () => {
    const blocked = validateEventDateLeadTime({
      eventDate: '2026-11-20',
      leadTimeHours: 48,
      blockedDates: ['2026-11-20'],
      now: fixedNow,
    });
    expect(blocked.valid).toBe(false);
    expect(blocked.reason).toBe('blocked_date');
  });
});

describe('validateQuoteRequest and idempotency serialization', () => {
  const fixedNow = new Date('2026-11-13T10:00:00.000Z');

  const validPickupQuote: QuoteRequestInput = {
    customerName: 'ישראל ישראלי',
    customerPhone: '054-747-4764',
    eventDate: '2026-11-20',
    eventTime: '18:00',
    eventType: 'plus',
    deliveryMethod: 'pickup',
    adultCount: 25,
    childCount: 0,
    wantsSetup: false,
    items: [{ menuItemId: 'dish-1', quantity: 2, selectedModifications: ['ללא גלוטן'], notes: 'טרי' }],
  };

  it('allows pickup without address and with 0 children', () => {
    const res = validateQuoteRequest(validPickupQuote, { leadTimeHours: 48, now: fixedNow });
    expect(res.valid).toBe(true);
    expect(res.fieldErrors).toEqual({});
    expect(res.normalized?.customerPhoneNormalized).toBe('+972547474764');
    expect(res.normalized?.childCount).toBe(0);
  });

  it('rejects invalid phone abc, past date, negative distance, and negative guest counts', () => {
    const badRes = validateQuoteRequest(
      {
        ...validPickupQuote,
        customerPhone: 'abc',
        eventDate: '2026-11-01',
        deliveryMethod: 'delivery',
        deliveryAddress: 'ק',
        distanceKm: -10,
        adultCount: -5,
        childCount: 1.5,
      },
      { leadTimeHours: 48, now: fixedNow }
    );
    expect(badRes.valid).toBe(false);
    expect(badRes.fieldErrors.customerPhone).toBeDefined();
    expect(badRes.fieldErrors.eventDate).toBeDefined();
    expect(badRes.fieldErrors.deliveryAddress).toBeDefined();
    expect(badRes.fieldErrors.distanceKm).toBeDefined();
    expect(badRes.fieldErrors.adultCount).toBeDefined();
    expect(badRes.fieldErrors.childCount).toBeDefined();
  });

  it('rejects delivery exceeding configured owner maxDeliveryDistanceKm', () => {
    const overRange = validateQuoteRequest(
      {
        ...validPickupQuote,
        deliveryMethod: 'delivery',
        deliveryAddress: 'תל אביב, הרצל 10',
        distanceKm: 65,
      },
      { leadTimeHours: 48, maxDeliveryDistanceKm: 40, now: fixedNow }
    );
    expect(overRange.valid).toBe(false);
    expect(overRange.fieldErrors.distanceKm).toBeDefined();
  });

  it('changes idempotency serialization whenever address or event type changes', () => {
    const baseDelivery: QuoteRequestInput = {
      ...validPickupQuote,
      deliveryMethod: 'delivery',
      deliveryAddress: 'רעננה, אחוזה 100',
      distanceKm: 28,
    };
    const r1 = validateQuoteRequest(baseDelivery, { leadTimeHours: 48, now: fixedNow });
    const r2 = validateQuoteRequest(
      { ...baseDelivery, deliveryAddress: 'כפר סבא, ויצמן 50' },
      { leadTimeHours: 48, now: fixedNow }
    );
    const r3 = validateQuoteRequest(
      { ...baseDelivery, eventType: 'premium' },
      { leadTimeHours: 48, now: fixedNow }
    );

    expect(r1.normalized && r2.normalized && r3.normalized).toBeTruthy();
    const s1 = serializeNormalizedQuoteForIdempotency(r1.normalized!, fixedNow);
    const s2 = serializeNormalizedQuoteForIdempotency(r2.normalized!, fixedNow);
    const s3 = serializeNormalizedQuoteForIdempotency(r3.normalized!, fixedNow);

    expect(s1).not.toBe(s2);
    expect(s1).not.toBe(s3);
    expect(s2).not.toBe(s3);
  });

  it('validates review inputs strictly', () => {
    expect(validateReviewInput({ customer_name: 'דנה', rating: 5, comment: 'היה מושלם!' }).valid).toBe(true);
    expect(validateReviewInput({ customer_name: 'דנה', rating: 6, comment: 'היה מושלם!' }).valid).toBe(false);
    expect(validateReviewInput({ customer_name: 'א', rating: 5, comment: 'א' }).valid).toBe(false);
  });
});

describe('calculateDeliveryFeeAmount', () => {
  it('calculates 150 base + 4.5 per km (e.g. 50 km: 150 + 225 = 375)', () => {
    expect(calculateDeliveryFeeAmount(50)).toBe(375);
  });

  it('calculates 13 km accurately to nearest integer (150 + 58.5 = 209)', () => {
    expect(calculateDeliveryFeeAmount(13)).toBe(209);
  });

  it('returns 0 for 0, negative, or null distance', () => {
    expect(calculateDeliveryFeeAmount(0)).toBe(0);
    expect(calculateDeliveryFeeAmount(-5)).toBe(0);
    expect(calculateDeliveryFeeAmount(null)).toBe(0);
  });

  it('never grants free delivery regardless of subtotal amount', () => {
    expect(calculateDeliveryFeeAmount(50, 100000)).toBe(375);
    expect(calculateDeliveryFeeAmount(20, 500000)).toBe(240);
  });

  it('supports custom base fee and price per km if configured', () => {
    expect(
      calculateDeliveryFeeAmount(10, 1000, {
        delivery_base_fee: 200,
        delivery_price_per_km: 6,
      })
    ).toBe(260);
  });
});
