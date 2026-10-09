export const languages = ['tr', 'en'] as const;
export type Lang = typeof languages[number];
export function isLang(value: unknown): value is Lang { return value === 'tr' || value === 'en'; }
export function otherLang(lang: Lang): Lang { return lang === 'tr' ? 'en' : 'tr'; }

export function chooseLanguage(saved: unknown, browserLanguages: readonly string[]): Lang {
  if (isLang(saved)) return saved;
  for (const language of browserLanguages) {
    const primary = language.toLowerCase().split('-')[0];
    if (isLang(primary)) return primary;
  }
  return 'en';
}

const en = {
  home: 'Home', categories: 'Categories', tags: 'Tags', search: 'Search', theme: 'Theme',
  menu: 'Menu', close: 'Close', latest: 'Latest posts', allPosts: 'All posts',
  empty: 'No published posts yet.', toc: 'On this page', copy: 'Copy code', copied: 'Copied',
  copyFailed: 'Could not copy. Please select and copy the code manually.', rss: 'RSS feed',
  skip: 'Skip to content', missingTranslation: 'This post is not available in this language yet.',
  searchPlaceholder: 'Search posts…', searchEmpty: 'No posts match your search.',
  searchError: 'Search could not load. Please try again.', searchLoading: 'Loading search…',
  postCount: 'posts', readMore: 'Read post', backHome: 'Back to home', notFound: 'Page not found',
  notFoundDescription: 'This page does not exist or has moved.',
  siteDescription: 'Notes on software, tools, and things worth exploring.',
};
export type Dictionary = { [Key in keyof typeof en]: string };
const tr: Dictionary = {
  home: 'Ana sayfa', categories: 'Kategoriler', tags: 'Etiketler', search: 'Ara', theme: 'Tema',
  menu: 'Menü', close: 'Kapat', latest: 'Son yazılar', allPosts: 'Tüm yazılar',
  empty: 'Henüz yayımlanmış yazı yok.', toc: 'Bu yazıda', copy: 'Kodu kopyala', copied: 'Kopyalandı',
  copyFailed: 'Kopyalanamadı. Kodu seçip elle kopyalayabilirsiniz.', rss: 'RSS akışı',
  skip: 'İçeriğe geç', missingTranslation: 'Bu yazının seçtiğiniz dilde çevirisi henüz yok.',
  searchPlaceholder: 'Yazılarda ara…', searchEmpty: 'Aramanızla eşleşen yazı yok.',
  searchError: 'Arama yüklenemedi. Lütfen tekrar deneyin.', searchLoading: 'Arama yükleniyor…',
  postCount: 'yazı', readMore: 'Yazıyı oku', backHome: 'Ana sayfaya dön', notFound: 'Sayfa bulunamadı',
  notFoundDescription: 'Bu sayfa mevcut değil veya başka bir adrese taşındı.',
  siteDescription: 'Yazılım, araçlar ve keşfetmeye değer şeyler üzerine notlar.',
};
export const dictionaries: Record<Lang, Dictionary> = { tr, en };
export function t(lang: Lang): Dictionary { return dictionaries[lang]; }
