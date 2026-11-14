// Media URL transformation helpers (Cloudinary compatibility + optimization) and catalog health auditor.

import type { CatalogHealthIssue, KosherCertMetadata, MenuItem } from './types.js';
import { getJerusalemParts, isValidIsoCalendarDate } from './time.js';

export function isCloudinaryUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'res.cloudinary.com' || parsed.hostname.endsWith('.cloudinary.com');
  } catch {
    return false;
  }
}

export function isPlaceholderImageUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return true;
  return url.includes('images.unsplash.com/photo-1555244162-803834f70033') || url.includes('unsplash.com');
}

/**
 * Normalizes Cloudinary video delivery to H.264/AAC inside MP4 so desktop Chrome, Safari,
 * and Android/iOS play uploaded phone (.mov / HEVC / hvc1) clips reliably.
 */
export function toPlayableCloudinaryVideoUrl(url: string): string {
  if (!url || !isCloudinaryUrl(url) || !url.includes('/video/upload/')) {
    return url;
  }
  const [prefix, rest] = url.split('/video/upload/');
  if (!rest) return url;

  // Strip existing codec/format transformation segment if present so we apply a clean canonical one.
  const normalizedRest = rest.replace(/^([^/]+(?:,[^/]+)+)\/(?=v\d+\/|[^/]+\/)/, '');
  const mp4Path = normalizedRest.replace(/\.(mov|m4v|hevc|qt|avi|webm)(\?.*)?$/i, '.mp4$2');
  return `${prefix}/video/upload/f_mp4,vc_h264,ac_aac,q_auto/${mp4Path}`;
}

/**
 * Generates a lightweight JPEG poster frame from Cloudinary video URL so mobile/desktop grids
 * do not download multi-megabyte video payloads before user interaction.
 */
export function toCloudinaryVideoPosterUrl(url: string, width: number = 720): string {
  if (!url || !isCloudinaryUrl(url) || !url.includes('/video/upload/')) {
    return '';
  }
  const [prefix, rest] = url.split('/video/upload/');
  if (!rest) return '';
  const normalizedRest = rest.replace(/^([^/]+(?:,[^/]+)+)\/(?=v\d+\/|[^/]+\/)/, '');
  const jpgPath = normalizedRest.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg$1');
  return `${prefix}/video/upload/so_0,f_jpg,q_auto,w_${width},c_limit/${jpgPath}`;
}

export function toCloudinaryOptimizedImageUrl(url: string, width: number = 640): string {
  if (!url || !isCloudinaryUrl(url) || !url.includes('/image/upload/')) {
    return url;
  }
  const [prefix, rest] = url.split('/image/upload/');
  if (!rest) return url;
  // Preserve non-destructive optimization if no width/format transform is already injected.
  if (/^v\d+\//.test(rest)) {
    return `${prefix}/image/upload/f_auto,q_auto,w_${width},c_limit/${rest}`;
  }
  return url;
}

export function buildCloudinaryImageSrcSet(url: string, widths: number[] = [360, 640, 960]): string | undefined {
  if (!url || !isCloudinaryUrl(url) || !url.includes('/image/upload/')) {
    return undefined;
  }
  const [, rest] = url.split('/image/upload/');
  if (!rest || !/^v\d+\//.test(rest)) return undefined;
  return widths.map((w) => `${toCloudinaryOptimizedImageUrl(url, w)} ${w}w`).join(', ');
}

export interface KosherStatusEvaluation {
  status: 'valid' | 'expiring_soon' | 'expired' | 'unverified';
  daysRemaining: number | null;
  metadata: KosherCertMetadata;
}

export function normalizeKosherSetting(raw: unknown): KosherCertMetadata {
  if (typeof raw === 'string') {
    return {
      documentUrl: raw.trim(),
      issuer: '',
      validUntil: null,
      verifiedAt: null,
    };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      documentUrl: typeof obj.documentUrl === 'string' ? obj.documentUrl.trim() : '',
      issuer: typeof obj.issuer === 'string' ? obj.issuer.trim() : '',
      validUntil: typeof obj.validUntil === 'string' && isValidIsoCalendarDate(obj.validUntil.trim())
        ? obj.validUntil.trim()
        : null,
      verifiedAt: typeof obj.verifiedAt === 'string' ? obj.verifiedAt : null,
      notesHe: typeof obj.notesHe === 'string' ? obj.notesHe : undefined,
      notesEn: typeof obj.notesEn === 'string' ? obj.notesEn : undefined,
    };
  }
  return {
    documentUrl: '',
    issuer: '',
    validUntil: null,
    verifiedAt: null,
  };
}

export function evaluateKosherStatus(
  raw: unknown,
  now: Date = new Date()
): KosherStatusEvaluation {
  const metadata = normalizeKosherSetting(raw);
  if (!metadata.documentUrl || !metadata.validUntil) {
    return { status: 'unverified', daysRemaining: null, metadata };
  }
  const todayStr = getJerusalemParts(now).dateStr;
  const todayUtc = Date.parse(`${todayStr}T00:00:00Z`);
  const validUtc = Date.parse(`${metadata.validUntil}T00:00:00Z`);
  const daysRemaining = Math.round((validUtc - todayUtc) / 86_400_000);

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining, metadata };
  }
  if (daysRemaining <= 30) {
    return { status: 'expiring_soon', daysRemaining, metadata };
  }
  return { status: 'valid', daysRemaining, metadata };
}

export function auditMenuCatalog(items: MenuItem[]): CatalogHealthIssue[] {
  const issues: CatalogHealthIssue[] = [];
  for (const item of items) {
    if (isPlaceholderImageUrl(item.image_url)) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        code: 'missing_or_placeholder_image',
        severity: 'warning',
        messageHe: 'חסרה תמונה או מוצג צילום ממלא מקום.',
        messageEn: 'Missing photo or placeholder image.',
      });
    }
    if (!item.name_en?.trim() || !item.description_en?.trim()) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        code: 'missing_en_translation',
        severity: 'warning',
        messageHe: 'חסר תרגום לאנגלית (שם או תיאור).',
        messageEn: 'Missing English name or description.',
      });
    }
    if (
      typeof item.serves_min === 'number' &&
      typeof item.serves_max === 'number' &&
      item.serves_min > item.serves_max
    ) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        code: 'serves_min_gt_max',
        severity: 'error',
        messageHe: `מינימום סועדים (${item.serves_min}) גדול ממקסימום (${item.serves_max}).`,
        messageEn: `Minimum servings (${item.serves_min}) exceeds maximum (${item.serves_max}).`,
      });
    }
    if (item.unit_type === 'tray' && !item.is_tray) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        code: 'unit_tray_mismatch',
        severity: 'warning',
        messageHe: 'מוגדר כיחידת מגש אך סימון is_tray כבוי.',
        messageEn: 'Unit type is tray while is_tray flag is false.',
      });
    }
    if (item.is_tray && (!item.units_per_tray || item.units_per_tray <= 0)) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        code: 'tray_missing_units_per_tray',
        severity: 'warning',
        messageHe: 'מוגדר כמגש ללא מספר יחידות למגש.',
        messageEn: 'Marked as tray without units_per_tray.',
      });
    }
    if (item.category === 'Extras' && item.serves_min > 0) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        code: 'nonfood_has_serving_count',
        severity: 'warning',
        messageHe: `פריט ציוד/תוספת מסומן כמספיק ל-${item.serves_min} סועדים.`,
        messageEn: `Non-food / extra item has serving count ${item.serves_min}.`,
      });
    }
    if (!item.description?.trim()) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        code: 'missing_description',
        severity: 'warning',
        messageHe: 'חסר תיאור מנה בעברית.',
        messageEn: 'Missing Hebrew item description.',
      });
    }
  }
  return issues;
}
