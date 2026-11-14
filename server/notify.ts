// Server-side quote notification dispatcher.
// Never uses hardcoded unverified destination addresses and never leaks secrets.

import crypto from 'node:crypto';
import type { Order, PracticalInfoConfig } from '../shared/types.js';
import type { ServerEnv } from './env.js';

export interface NotificationResult {
  status: 'sent' | 'failed' | 'unconfigured';
  error?: string;
}

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function dispatchQuoteNotification(options: {
  order: Order;
  env: ServerEnv;
  practicalInfo?: Partial<PracticalInfoConfig>;
  fetchImpl?: typeof fetch;
}): Promise<NotificationResult> {
  const fetchFn = options.fetchImpl ?? fetch;
  const destinationEmail = (
    options.practicalInfo?.notificationEmail ||
    options.env.notificationEmail ||
    ''
  ).trim();

  const { order } = options;

  // Prefer Resend API if configured with a verified destination email
  if (options.env.resendApiKey) {
    if (!destinationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinationEmail)) {
      return {
        status: 'unconfigured',
        error: 'Notification destination email is not configured in Admin or server env.',
      };
    }

    const from = options.env.resendFromEmail || 'Ayala Catering <onboarding@resend.dev>';
    const deliveryLabel =
      order.delivery_method === 'delivery'
        ? `Delivery: ${order.delivery_address || 'N/A'} (${order.distance_km ?? '?'} km)`
        : 'Self-Pickup (Kedumim area)';
    const itemsHtml = order.items
      .map((it) => {
        const legacyNested = it as unknown as { menuItem?: { name?: string }; selectedModifications?: string[] };
        const name = it.name || legacyNested.menuItem?.name || '';
        const mods = it.selected_modifications || legacyNested.selectedModifications || [];
        return `<li>${escapeHtml(name)} × ${Number(it.quantity)}${
          mods.length ? ` (${escapeHtml(mods.join(', '))})` : ''
        }${it.notes ? ` — ${escapeHtml(it.notes)}` : ''}</li>`;
      })
      .join('');

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; color: #2d3a1a;">
        <h2>בקשת הצעת מחיר חדשה (${escapeHtml(order.reference_code || order.id || '')})</h2>
        <p><strong>שם לקוח:</strong> ${escapeHtml(order.customer_name)}</p>
        <p><strong>טלפון:</strong> ${escapeHtml(order.customer_phone)}</p>
        <p><strong>מועד אירוע:</strong> ${escapeHtml(order.event_date)} ${escapeHtml(order.event_time || '')}</p>
        <p><strong>סוג אירוע:</strong> ${escapeHtml(order.event_type || '')}</p>
        <p><strong>סועדים:</strong> ${order.adult_count ?? 'לא צוין'} מבוגרים, ${order.child_count ?? 'לא צוין'} ילדים</p>
        <p><strong>אספקה:</strong> ${escapeHtml(deliveryLabel)}</p>
        <p><strong>שירות עריכה:</strong> ${order.wants_setup ? 'כן' : 'לא'}</p>
        ${order.allergy_notes ? `<p><strong>הערות אלרגיה / רגישות:</strong> ${escapeHtml(order.allergy_notes)}</p>` : ''}
        ${order.notes ? `<p><strong>הערות נוספות:</strong> ${escapeHtml(order.notes)}</p>` : ''}
        <h3>פריטים מבוקשים:</h3>
        <ul>${itemsHtml}</ul>
      </div>
    `;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.env.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [destinationEmail],
          subject: `בקשת הצעת מחיר חדשה: ${order.customer_name} (${order.event_date})`,
          html,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        return {
          status: 'failed',
          error: `Email provider returned HTTP ${resp.status}`,
        };
      }
      return { status: 'sent' };
    } catch (err) {
      return {
        status: 'failed',
        error: err instanceof Error && err.name === 'AbortError' ? 'Email request timed out' : 'Email delivery error',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // Alternative: signed webhook URL if configured
  if (options.env.notificationWebhookUrl) {
    const bodyStr = JSON.stringify({
      event: 'quote.created',
      reference_code: order.reference_code || order.id,
      destination_email: destinationEmail || undefined,
      event_date: order.event_date,
      delivery_method: order.delivery_method,
      item_count: order.items.length,
    });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.env.notificationWebhookSecret) {
      headers['X-Ayala-Signature'] = crypto
        .createHmac('sha256', options.env.notificationWebhookSecret)
        .update(bodyStr)
        .digest('hex');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetchFn(options.env.notificationWebhookUrl, {
        method: 'POST',
        headers,
        body: bodyStr,
        signal: controller.signal,
      });
      return resp.ok
        ? { status: 'sent' }
        : { status: 'failed', error: `Notification webhook returned HTTP ${resp.status}` };
    } catch {
      return { status: 'failed', error: 'Notification webhook request failed' };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    status: 'unconfigured',
    error: destinationEmail
      ? 'No server email provider (RESEND_API_KEY or NOTIFICATION_WEBHOOK_URL) configured.'
      : 'Notification email destination and provider are not configured on the server.',
  };
}
