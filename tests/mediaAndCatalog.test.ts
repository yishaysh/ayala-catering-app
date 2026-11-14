import { describe, expect, it } from 'vitest';
import {
  auditMenuCatalog,
  buildCloudinaryImageSrcSet,
  evaluateKosherStatus,
  isPlaceholderImageUrl,
  toCloudinaryOptimizedImageUrl,
  toCloudinaryVideoPosterUrl,
  toPlayableCloudinaryVideoUrl,
} from '../shared/media.js';
import type { MenuItem } from '../shared/types.js';

describe('Cloudinary media URL transforms', () => {
  it('rewrites HEVC/.mov Cloudinary videos to browser-compatible H.264/AAC MP4', () => {
    const movUrl = 'https://res.cloudinary.com/demo/video/upload/v1731500000/events/clip.MOV';
    expect(toPlayableCloudinaryVideoUrl(movUrl)).toBe(
      'https://res.cloudinary.com/demo/video/upload/f_mp4,vc_h264,ac_aac,q_auto/v1731500000/events/clip.mp4'
    );

    const existingTransform =
      'https://res.cloudinary.com/demo/video/upload/q_auto,vc_auto/v1731500000/events/clip.webm';
    expect(toPlayableCloudinaryVideoUrl(existingTransform)).toBe(
      'https://res.cloudinary.com/demo/video/upload/f_mp4,vc_h264,ac_aac,q_auto/v1731500000/events/clip.mp4'
    );

    const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(toPlayableCloudinaryVideoUrl(youtube)).toBe(youtube);
  });

  it('extracts lightweight JPEG poster frame URLs for gallery video tiles', () => {
    const movUrl = 'https://res.cloudinary.com/demo/video/upload/v1731500000/events/clip.mov';
    expect(toCloudinaryVideoPosterUrl(movUrl, 720)).toBe(
      'https://res.cloudinary.com/demo/video/upload/so_0,f_jpg,q_auto,w_720,c_limit/v1731500000/events/clip.jpg'
    );
    expect(toCloudinaryVideoPosterUrl('https://youtube.com/watch?v=123')).toBe('');
  });

  it('applies responsive Cloudinary width transformations and flags placeholder images', () => {
    const img = 'https://res.cloudinary.com/demo/image/upload/v1700000000/menu/salad.jpg';
    expect(toCloudinaryOptimizedImageUrl(img, 640)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,c_limit/v1700000000/menu/salad.jpg'
    );
    expect(buildCloudinaryImageSrcSet(img, [360, 640])).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_360,c_limit/v1700000000/menu/salad.jpg 360w, ' +
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,c_limit/v1700000000/menu/salad.jpg 640w'
    );
    expect(isPlaceholderImageUrl(img)).toBe(false);
    expect(isPlaceholderImageUrl('https://images.unsplash.com/photo-1555244162-803834f70033?w=800')).toBe(true);
    expect(isPlaceholderImageUrl('')).toBe(true);
  });
});

describe('evaluateKosherStatus', () => {
  const fixedNow = new Date('2026-11-13T10:00:00.000Z');

  it('treats legacy raw URL without validUntil as unverified instead of hardcoding claims', () => {
    const res = evaluateKosherStatus('https://res.cloudinary.com/demo/image/upload/v1/cert.jpg', fixedNow);
    expect(res.status).toBe('unverified');
    expect(res.metadata.documentUrl).toContain('cert.jpg');
  });

  it('distinguishes valid, expiring_soon, and expired certificates honestly', () => {
    expect(
      evaluateKosherStatus(
        { documentUrl: 'https://res.cloudinary.com/demo/image/upload/v1/c.jpg', issuer: 'רבנות שומרון', validUntil: '2026-11-01' },
        fixedNow
      ).status
    ).toBe('expired');

    expect(
      evaluateKosherStatus(
        { documentUrl: 'https://res.cloudinary.com/demo/image/upload/v1/c.jpg', issuer: 'רבנות שומרון', validUntil: '2026-12-01' },
        fixedNow
      )
    ).toMatchObject({ status: 'expiring_soon', daysRemaining: 18 });

    expect(
      evaluateKosherStatus(
        { documentUrl: 'https://res.cloudinary.com/demo/image/upload/v1/c.jpg', issuer: 'רבנות שומרון', validUntil: '2027-06-01' },
        fixedNow
      ).status
    ).toBe('valid');
  });
});

describe('auditMenuCatalog', () => {
  it('flags missing English translations, invalid serving ranges, tray mismatches, and non-food serving counts', () => {
    const items: MenuItem[] = [
      {
        id: '1',
        category: 'Salads',
        name: 'סלט יווני',
        description: 'עגבניות שרי, מלפפון ובולגרית',
        price: 120,
        unit_type: 'tray',
        serves_min: 15,
        serves_max: 10,
        is_premium: false,
        tags: [],
        availability_status: true,
        is_tray: false,
        image_url: 'https://images.unsplash.com/photo-1555244162-803834f70033',
      },
      {
        id: '2',
        category: 'Extras',
        name: 'סט כלים מתכלים',
        name_en: 'Disposable Tableware Set',
        description: 'צלחות, סכו"ם ומפיות',
        description_en: 'Plates, cutlery and napkins',
        price: 30,
        unit_type: 'unit',
        serves_min: 10,
        serves_max: 10,
        is_premium: false,
        tags: [],
        availability_status: true,
        is_tray: false,
        image_url: 'https://res.cloudinary.com/demo/image/upload/v1/tableware.jpg',
      },
    ];

    const issues = auditMenuCatalog(items);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain('missing_or_placeholder_image');
    expect(codes).toContain('missing_en_translation');
    expect(codes).toContain('serves_min_gt_max');
    expect(codes).toContain('unit_tray_mismatch');
    expect(codes).toContain('nonfood_has_serving_count');
  });
});
