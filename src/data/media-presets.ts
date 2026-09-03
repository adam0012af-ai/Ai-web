export const videoRatios = [
  '16:9',
  '9:16',
  '1:1',
  '4:5',
  '3:2',
  '21:9',
  'custom',
] as const;

export const videoResolutionPresets = [
  { id: '360', label: '360p', shortSide: 360 },
  { id: '480', label: '480p', shortSide: 480 },
  { id: '720', label: '720p HD', shortSide: 720 },
  { id: '1080', label: '1080p Full HD', shortSide: 1080 },
  { id: '1440', label: '1440p 2K', shortSide: 1440 },
  { id: '2160', label: '2160p 4K', shortSide: 2160 },
] as const;

export const videoFps = [24, 25, 30, 50, 60] as const;
export const videoDurations = [5, 10, 15, 30, 60] as const;
export const sceneCounts = [1, 2, 3, 4, 5, 6, 8] as const;

export const mediaQualities = [
  { id: 'draft', ar: 'مسودة سريعة', en: 'Draft / Fast' },
  { id: 'standard', ar: 'قياسية', en: 'Standard' },
  { id: 'high', ar: 'عالية', en: 'High' },
  { id: 'ultra', ar: 'فائقة', en: 'Ultra' },
] as const;

export const videoStyles = [
  { id: 'cinematic', ar: 'سينمائي', en: 'Cinematic' },
  { id: 'realistic', ar: 'واقعي', en: 'Realistic' },
  { id: 'commercial', ar: 'إعلان تجاري', en: 'Commercial' },
  { id: 'documentary', ar: 'وثائقي', en: 'Documentary' },
  { id: 'product', ar: 'إعلان منتج', en: 'Product ad' },
  { id: 'social', ar: 'ريلز وسوشيال', en: 'Social reel' },
  { id: 'anime', ar: 'أنمي', en: 'Anime' },
  { id: '3d', ar: 'ثلاثي الأبعاد', en: '3D' },
] as const;

export const cameraMoves = [
  { id: 'static', ar: 'ثابتة', en: 'Static' },
  { id: 'dolly_in', ar: 'اقتراب بالكاميرا', en: 'Dolly in' },
  { id: 'dolly_out', ar: 'ابتعاد بالكاميرا', en: 'Dolly out' },
  { id: 'pan_left', ar: 'تحريك الكاميرا لليسار', en: 'Pan left' },
  { id: 'pan_right', ar: 'تحريك الكاميرا لليمين', en: 'Pan right' },
  { id: 'orbit', ar: 'دوران حول الهدف', en: 'Orbit' },
  { id: 'tracking', ar: 'تتبع الهدف', en: 'Tracking' },
  { id: 'handheld', ar: 'كاميرا محمولة', en: 'Handheld' },
  { id: 'drone', ar: 'لقطة درون', en: 'Drone' },
] as const;

export const imageRatios = ['1:1', '4:5', '3:2', '16:9', '9:16'] as const;

export const imageSizes = [
  { id: '1024', label: '1024 px', shortSide: 1024 },
  { id: '1536', label: '1536 px', shortSide: 1536 },
  { id: '2048', label: '2048 px', shortSide: 2048 },
  { id: '4096', label: '4K / 4096 px', shortSide: 4096 },
] as const;

export const imageStyles = [
  { id: 'photorealistic', ar: 'واقعي فوتوغرافي', en: 'Photorealistic' },
  { id: 'cinematic', ar: 'سينمائي', en: 'Cinematic' },
  { id: 'product', ar: 'تصوير منتجات', en: 'Product photography' },
  { id: 'editorial', ar: 'تحريري', en: 'Editorial' },
  { id: 'illustration', ar: 'رسم توضيحي', en: 'Illustration' },
  { id: '3d', ar: 'ثلاثي الأبعاد', en: '3D render' },
  { id: 'anime', ar: 'أنمي', en: 'Anime' },
  { id: 'poster', ar: 'بوستر', en: 'Poster' },
] as const;

function even(value: number) {
  return Math.max(2, Math.round(value / 2) * 2);
}

export function dimensionsFromRatio(
  shortSide: number,
  ratio: string,
  customWidth = 1920,
  customHeight = 1080,
) {
  switch (ratio) {
    case '16:9':
      return { width: even((shortSide * 16) / 9), height: shortSide };
    case '9:16':
      return { width: shortSide, height: even((shortSide * 16) / 9) };
    case '1:1':
      return { width: shortSide, height: shortSide };
    case '4:5':
      return { width: shortSide, height: even((shortSide * 5) / 4) };
    case '3:2':
      return { width: even((shortSide * 3) / 2), height: shortSide };
    case '21:9':
      return { width: even((shortSide * 21) / 9), height: shortSide };
    default:
      return {
        width: even(Math.min(7680, Math.max(128, customWidth))),
        height: even(Math.min(7680, Math.max(128, customHeight))),
      };
  }
}

export function localizedPreset(
  item: { ar: string; en: string },
  locale: 'ar' | 'en',
) {
  return locale === 'ar' ? item.ar : item.en;
}
