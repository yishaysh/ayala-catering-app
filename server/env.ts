// Server-only environment configuration loader.
// Never import this module from client components under src/.

import { CANONICAL_SITE_URL } from '../shared/config.js';

export interface ServerEnv {
  databaseUrl: string;
  adminPasswordHash: string;
  adminPassword: string;
  sessionSecret: string;
  geminiApiKey: string;
  geminiModel: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  notificationEmail: string;
  contactEmail: string;
  resendApiKey: string;
  resendFromEmail: string;
  notificationWebhookUrl: string;
  notificationWebhookSecret: string;
  siteUrl: string;
  isProduction: boolean;
}

export function getServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const isProduction = source.NODE_ENV === 'production' || source.VERCEL === '1';

  // Database URL must come from server-only DATABASE_URL (prefer never falling back to VITE_* in prod).
  const databaseUrl = (
    source.DATABASE_URL ||
    (!isProduction ? source.VITE_NEON_DATABASE_URL : '') ||
    ''
  ).trim();

  const geminiApiKey = (source.GEMINI_API_KEY || '').trim();
  const geminiModel = (source.GEMINI_MODEL || '').trim();

  const siteUrlRaw = (source.SITE_URL || CANONICAL_SITE_URL).trim();
  const siteUrl = siteUrlRaw.endsWith('/') ? siteUrlRaw : `${siteUrlRaw}/`;

  return {
    databaseUrl,
    adminPasswordHash: (source.ADMIN_PASSWORD_HASH || '').trim(),
    adminPassword: (source.ADMIN_PASSWORD || '').trim(),
    sessionSecret: (source.SESSION_SECRET || '').trim(),
    geminiApiKey,
    geminiModel,
    cloudinaryCloudName: (source.CLOUDINARY_CLOUD_NAME || '').trim(),
    cloudinaryApiKey: (source.CLOUDINARY_API_KEY || '').trim(),
    cloudinaryApiSecret: (source.CLOUDINARY_API_SECRET || '').trim(),
    notificationEmail: (source.NOTIFICATION_EMAIL || '').trim(),
    contactEmail: (source.CONTACT_EMAIL || '').trim(),
    resendApiKey: (source.RESEND_API_KEY || '').trim(),
    resendFromEmail: (source.RESEND_FROM_EMAIL || '').trim(),
    notificationWebhookUrl: (source.NOTIFICATION_WEBHOOK_URL || '').trim(),
    notificationWebhookSecret: (source.NOTIFICATION_WEBHOOK_SECRET || '').trim(),
    siteUrl,
    isProduction,
  };
}
