import {
  Activity,
  Bell,
  BookMarked,
  Clapperboard,
  Code2,
  CreditCard,
  Files,
  FolderKanban,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';

export const dashboardNav = [
  ['Home', '/dashboard', LayoutDashboard, 'الرئيسية'],
  ['AI Chat', '/dashboard/ai/chat', MessageSquare, 'المحادثة'],
  ['Projects', '/dashboard/projects', FolderKanban, 'المشاريع'],
  ['Studio', '/dashboard/studio', Clapperboard, 'الاستوديو'],
  ['Code Studio', '/dashboard/code', Code2, 'استوديو البرمجة'],
  ['AI Tools', '/dashboard/ai', Sparkles, 'أدوات الذكاء الاصطناعي'],
  ['Files', '/dashboard/files', Files, 'الملفات'],
  ['Prompt Library', '/dashboard/prompts', BookMarked, 'مكتبة الأوامر'],
  ['Favorites', '/dashboard/favorites', Heart, 'المفضلة'],
] as const;

export const accountNav = [
  ['Notifications', '/dashboard/notifications', Bell, 'الإشعارات'],
  ['Billing', '/dashboard/billing', CreditCard, 'الفوترة'],
  ['Activity', '/dashboard/activity', Activity, 'النشاط'],
  ['Support', '/dashboard/support', LifeBuoy, 'الدعم'],
  ['Profile', '/dashboard/profile', User, 'الملف الشخصي'],
  ['Security', '/dashboard/security', Shield, 'الأمان'],
  ['Settings', '/dashboard/settings', Settings, 'الإعدادات'],
] as const;
