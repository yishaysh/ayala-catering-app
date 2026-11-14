// Timezone-safe Asia/Jerusalem calendar & lead-time helpers shared by client and server.

export const BUSINESS_TIMEZONE = 'Asia/Jerusalem';

export interface JerusalemParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string;
  timeStr: string;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function getJerusalemParts(date: Date = new Date()): JerusalemParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr: `${year}-${pad2(month)}-${pad2(day)}`,
    timeStr: `${pad2(hour)}:${pad2(minute)}`,
  };
}

export function isValidIsoCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() + 1 === m &&
    probe.getUTCDate() === d
  );
}

export function isValidTimeHHMM(timeStr: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [h, m] = timeStr.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Converts an Asia/Jerusalem wall-clock date + time to a UTC epoch timestamp cleanly
 * (handles DST transitions accurately using Intl offset probing).
 */
export function jerusalemWallClockToUtcMs(dateStr: string, timeStr: string = '00:00'): number {
  if (!isValidIsoCalendarDate(dateStr) || !isValidTimeHHMM(timeStr)) {
    return NaN;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const targetAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0, 0);

  // Two-pass iterative offset resolution avoids spring-forward / fall-back 1h drift.
  let guess = targetAsUtc - 2 * 3600_000;
  for (let i = 0; i < 3; i++) {
    const parts = getJerusalemParts(new Date(guess));
    const gotAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
    const diff = targetAsUtc - gotAsUtc;
    if (diff === 0) break;
    guess += diff;
  }
  return guess;
}

export interface LeadTimeResult {
  valid: boolean;
  reason?: 'invalid_format' | 'blocked_date' | 'insufficient_lead_time' | 'too_far';
  earliestAllowedDate: string;
  earliestAllowedTime: string;
  minDateInputValue: string;
  errorHe?: string;
  errorEn?: string;
}

/**
 * Computes minimum allowed date/time in Asia/Jerusalem and enforces leadTimeHours
 * without allowing date-only truncation to slip under the configured hour threshold.
 */
export function validateEventDateLeadTime(options: {
  eventDate: string;
  eventTime?: string | null;
  leadTimeHours: number;
  blockedDates?: string[];
  now?: Date;
}): LeadTimeResult {
  const now = options.now ?? new Date();
  const leadHours = Number.isFinite(options.leadTimeHours) && options.leadTimeHours >= 0
    ? options.leadTimeHours
    : 48;

  const cutoffMs = now.getTime() + leadHours * 3600_000;
  const cutoffParts = getJerusalemParts(new Date(cutoffMs));

  // If cutoff is later than 00:00 on cutoffParts.dateStr and the user gives no time,
  // date-only selection on cutoffParts.dateStr cannot guarantee full leadHours unless
  // an explicit eventTime >= cutoffParts.timeStr is selected.
  const nextDayStartMs = jerusalemWallClockToUtcMs(cutoffParts.dateStr, '00:00') + 24 * 3600_000;
  const nextDayParts = getJerusalemParts(new Date(nextDayStartMs));
  const minDateInputValue = cutoffParts.dateStr;

  const rawDate = (options.eventDate || '').trim();
  const rawTime = (options.eventTime || '').trim();

  if (!isValidIsoCalendarDate(rawDate)) {
    return {
      valid: false,
      reason: 'invalid_format',
      earliestAllowedDate: cutoffParts.dateStr,
      earliestAllowedTime: cutoffParts.timeStr,
      minDateInputValue,
      errorHe: 'נא לבחור תאריך אירוע תקין.',
      errorEn: 'Please select a valid event date.',
    };
  }

  if (rawTime && !isValidTimeHHMM(rawTime)) {
    return {
      valid: false,
      reason: 'invalid_format',
      earliestAllowedDate: cutoffParts.dateStr,
      earliestAllowedTime: cutoffParts.timeStr,
      minDateInputValue,
      errorHe: 'נא להזין שעת אירוע תקינה (לדוגמה 18:00).',
      errorEn: 'Please enter a valid event time (e.g. 18:00).',
    };
  }

  const nowParts = getJerusalemParts(now);
  const maxYear = nowParts.year + 2;
  if (Number(rawDate.slice(0, 4)) > maxYear) {
    return {
      valid: false,
      reason: 'too_far',
      earliestAllowedDate: cutoffParts.dateStr,
      earliestAllowedTime: cutoffParts.timeStr,
      minDateInputValue,
      errorHe: 'תאריך האירוע רחוק מדי בעתיד (עד שנתיים קדימה).',
      errorEn: 'Event date is too far in the future (up to 2 years).',
    };
  }

  if (Array.isArray(options.blockedDates) && options.blockedDates.includes(rawDate)) {
    return {
      valid: false,
      reason: 'blocked_date',
      earliestAllowedDate: cutoffParts.dateStr,
      earliestAllowedTime: cutoffParts.timeStr,
      minDateInputValue,
      errorHe: `התאריך ${rawDate} סגור לבקשות לפי הגדרות העסק. נא לבחור תאריך אחר.`,
      errorEn: `Date ${rawDate} is unavailable per business calendar settings. Please choose another date.`,
    };
  }

  // If no explicit event time is supplied, compare against the start of that Jerusalem day (00:00)
  // so that date-only input NEVER bypasses leadTimeHours.
  const effectiveTime = rawTime || '00:00';
  const eventMs = jerusalemWallClockToUtcMs(rawDate, effectiveTime);

  if (!Number.isFinite(eventMs) || eventMs < cutoffMs) {
    const needsLaterTimeSameCutoffDay = rawDate === cutoffParts.dateStr && !rawTime;
    const errorHe = needsLaterTimeSameCutoffDay
      ? `כדי להבטיח התראה של ${leadHours} שעות בתאריך ${cutoffParts.dateStr}, יש לציין שעת אירוע החל מ-${cutoffParts.timeStr} (שעון ישראל), או לבחור תאריך החל מ-${nextDayParts.dateStr}.`
      : `נדרשת התראה מראש של לפחות ${leadHours} שעות (שעון ישראל). המועד המוקדם ביותר הזמין הוא ${cutoffParts.dateStr} בשעה ${cutoffParts.timeStr}.`;
    const errorEn = needsLaterTimeSameCutoffDay
      ? `To meet the ${leadHours}-hour advance notice on ${cutoffParts.dateStr}, please specify an event time from ${cutoffParts.timeStr} (Israel time) onward, or choose ${nextDayParts.dateStr} or later.`
      : `At least ${leadHours} hours advance notice (Israel time) is required. Earliest available slot is ${cutoffParts.dateStr} at ${cutoffParts.timeStr}.`;

    return {
      valid: false,
      reason: 'insufficient_lead_time',
      earliestAllowedDate: cutoffParts.dateStr,
      earliestAllowedTime: cutoffParts.timeStr,
      minDateInputValue,
      errorHe,
      errorEn,
    };
  }

  return {
    valid: true,
    earliestAllowedDate: cutoffParts.dateStr,
    earliestAllowedTime: cutoffParts.timeStr,
    minDateInputValue,
  };
}
