import { t, isLang } from '../lib/i18n';

type SearchPost = { title: string; description: string; body: string; path: string; date?: string };
let searchController: AbortController | undefined;
let menuTrigger: HTMLElement | undefined;
const copyResetTimers = new WeakMap<HTMLButtonElement, number>();
function setCopyState(button: HTMLButtonElement, copied: boolean): void {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('width', '16'); icon.setAttribute('height', '16');
  icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.5');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', copied ? 'm5 12 4 4L19 6' : 'M8 8h12v12H8zM16 8V4H4v12h4');
  icon.append(path);
  const label = document.createElement('span');
  label.textContent = copied ? document.body.dataset.copied ?? 'Copied' : document.body.dataset.copy ?? 'Copy code';
  button.dataset.copied = String(copied);
  const idleLabel = document.createElement('span');
  idleLabel.className = 'copy-measure'; idleLabel.setAttribute('aria-hidden', 'true');
  idleLabel.textContent = document.body.dataset.copy ?? 'Copy code';
  const successLabel = document.createElement('span');
  successLabel.className = 'copy-measure'; successLabel.setAttribute('aria-hidden', 'true');
  successLabel.textContent = document.body.dataset.copied ?? 'Copied';
  label.className = 'copy-label';
  button.replaceChildren(icon, idleLabel, successLabel, label);
}
const systemTheme = matchMedia('(prefers-color-scheme: light)');
let sessionTheme = savedTheme();
function savedTheme(): string | null {
  try { return localStorage.getItem('blog-theme'); }
  catch { return null; /* Private browsing or blocked storage: honor system preference. */ }
}
function storePreference(key: string, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* Preferences are optional; the selected navigation/theme still applies. */ }
}
function applyTheme(preference = sessionTheme): void {
  document.documentElement.dataset.theme = preference === 'light' || preference === 'dark' ? preference : systemTheme.matches ? 'light' : 'dark';
}
function syncThemeControl(): void {
  const preference = ['dark', 'light'].includes(sessionTheme ?? '') ? sessionTheme! : 'system';
  const select = document.querySelector<HTMLSelectElement>('[data-theme-select]');
  if (select) select.value = preference;
  const label = document.querySelector<HTMLElement>('[data-theme-label]');
  if (label && select) label.textContent = select.selectedOptions[0]?.textContent ?? '';
  for (const option of document.querySelectorAll<HTMLButtonElement>('[data-theme-option]')) {
    option.setAttribute('aria-pressed', String(option.dataset.themeOption === preference));
  }
}
function chooseTheme(value: string): void {
  if (!['system', 'dark', 'light'].includes(value)) return;
  sessionTheme = value;
  storePreference('blog-theme', value);
  applyTheme(value);
  syncThemeControl();
}
function openThemeOptions(): void {
  const trigger = document.querySelector<HTMLButtonElement>('[data-theme-trigger]');
  const panel = document.querySelector<HTMLElement>('#theme-options');
  if (!trigger || !panel || typeof panel.showPopover !== 'function') return;
  if (panel.matches(':popover-open')) { panel.hidePopover(); trigger.focus(); return; }
  const rect = trigger.getBoundingClientRect();
  panel.style.top = `${rect.bottom + 8}px`;
  panel.style.right = `${Math.max(12, innerWidth - rect.right)}px`;
  panel.showPopover();
  panel.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
}
systemTheme.addEventListener('change', () => { if (!['dark', 'light'].includes(sessionTheme ?? '')) applyTheme(); });
window.addEventListener('resize', () => document.querySelector<HTMLElement>('#theme-options')?.hidePopover?.());
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey) {
    const input = document.querySelector<HTMLInputElement>('[data-search-input]');
    if (input) {
      event.preventDefault();
      document.querySelector<HTMLElement>('#theme-options')?.hidePopover?.();
      input.focus(); input.select();
    }
  }
  if (!(event.target instanceof Element) || !event.target.closest('#theme-options')) return;
  const options = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-option]')];
  const index = options.indexOf(event.target as HTMLButtonElement);
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  }
  if (event.key === 'Escape') document.querySelector<HTMLButtonElement>('[data-theme-trigger]')?.focus();
});
document.addEventListener('astro:before-swap', (event) => {
  event.newDocument.documentElement.dataset.theme = document.documentElement.dataset.theme;
  const previousLanguage = document.documentElement.lang;
  const nextLanguage = event.newDocument.documentElement.lang;
  const languageControl = event.newDocument.querySelector<HTMLElement>('.language-control');
  if (languageControl && isLang(previousLanguage) && previousLanguage !== nextLanguage) {
    languageControl.dataset.languageFrom = previousLanguage;
  }
  searchController?.abort();
});
document.addEventListener('change', (event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement && target.matches('[data-theme-select]')) {
    chooseTheme(target.value);
  }
});
document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('[data-focus-search]')) document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
  if (event.target.closest('[data-theme-trigger]')) openThemeOptions();
  const themeOption = event.target.closest<HTMLButtonElement>('[data-theme-option]');
  if (themeOption?.dataset.themeOption) {
    chooseTheme(themeOption.dataset.themeOption);
    document.querySelector<HTMLElement>('#theme-options')?.hidePopover();
    document.querySelector<HTMLButtonElement>('[data-theme-trigger]')?.focus();
  }
  const language = event.target.closest<HTMLAnchorElement>('[data-language]');
  if (language && isLang(language.dataset.language)) storePreference('blog-language', language.dataset.language);
  const opener = event.target.closest<HTMLElement>('[data-open-menu]');
  const dialog = document.querySelector<HTMLDialogElement>('#mobile-navigation');
  if (opener && dialog) { menuTrigger = opener; dialog.showModal(); }
  if (dialog?.open && (event.target.closest('[data-close-menu]') || event.target === dialog)) dialog.close();
  const copy = event.target.closest<HTMLButtonElement>('[data-copy-code]');
  if (!copy) return;
  const code = copy.closest('pre')?.querySelector('code');
  const status = copy.closest('pre')?.nextElementSibling;
  if (!code || !(status instanceof HTMLElement) || copy.disabled) return;
  const previousTimer = copyResetTimers.get(copy);
  if (previousTimer !== undefined) window.clearTimeout(previousTimer);
  copyResetTimers.delete(copy);
  status.textContent = '';
  delete status.dataset.error;
  copy.disabled = true;
  copy.setAttribute('aria-busy', 'true');
  try {
    await navigator.clipboard.writeText(code.textContent ?? '');
  } catch {
    // Clipboard is an optional browser capability; report permission/API failure visibly.
    setCopyState(copy, false);
    status.dataset.error = 'true';
    status.textContent = document.body.dataset.copyFailed ?? 'Please select and copy the code manually.';
    return;
  } finally {
    copy.disabled = false;
    copy.removeAttribute('aria-busy');
  }
  status.textContent = document.body.dataset.copied ?? 'Copied';
  setCopyState(copy, true);
  copyResetTimers.set(copy, window.setTimeout(() => {
    copyResetTimers.delete(copy);
    if (copy.isConnected) { setCopyState(copy, false); status.textContent = ''; }
  }, 1500));
});
function enhanceMarkdown(): void {
  for (const pre of document.querySelectorAll<HTMLPreElement>('.prose pre:not([data-enhanced])')) {
    pre.dataset.enhanced = 'true';
    pre.tabIndex = 0;
    const label = document.createElement('span');
    label.className = 'code-language';
    label.textContent = pre.dataset.language ?? 'code';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn code-copy'; button.dataset.copyCode = '';
    setCopyState(button, false);
    button.setAttribute('aria-label', document.body.dataset.copy ?? 'Copy code');
    const status = document.createElement('p'); status.className = 'copy-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    pre.append(label, button); pre.after(status);
  }
  for (const table of document.querySelectorAll<HTMLTableElement>('.prose table')) {
    for (const heading of table.querySelectorAll('th')) if (!heading.hasAttribute('scope')) heading.scope = 'col';
    if (table.parentElement?.classList.contains('table-scroll')) continue;
    const wrapper = document.createElement('div'); wrapper.className = 'table-scroll'; wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', document.documentElement.lang === 'tr' ? 'Tablo, yatay kaydırılabilir' : 'Table, scroll horizontally');
    table.before(wrapper); wrapper.append(table);
  }
}
async function setupSearch(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('[data-search-input]');
  const results = document.querySelector<HTMLOListElement>('[data-search-results]');
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  if (!input || !results || !status || !input.dataset.index) return;
  const lang = document.documentElement.lang;
  if (!isLang(lang)) return;
  const text = t(lang);
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  const form = input.closest<HTMLFormElement>('form');
  searchController?.abort();
  const controller = new AbortController(); searchController = controller;
  status.textContent = text.searchLoading;
  try {
    const response = await fetch(input.dataset.index, { signal: controller.signal });
    if (!response.ok) throw new Error(`Search index returned ${response.status}`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || !payload.every((post) => post && typeof post.title === 'string' && typeof post.description === 'string' && typeof post.body === 'string' && typeof post.path === 'string' && post.path.startsWith('/') && !post.path.startsWith('//'))) throw new Error('Invalid search index');
    const posts: SearchPost[] = payload;
    const normalize = (value: string) => value.toLocaleLowerCase(lang).normalize('NFKD').replace(/\p{M}/gu, '');
    const indexed = posts.map((post) => ({ post, text: normalize(`${post.title} ${post.description} ${post.body}`) }));
    const showResults = () => {
      const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
      results.replaceChildren();
      if (!terms.length) { status.textContent = `${posts.length} ${text.postCount}`; return; }
      const matching = indexed.filter((entry) => terms.every((term) => entry.text.includes(term)));
      status.textContent = matching.length ? `${matching.length} ${text.postCount}` : text.searchEmpty;
      for (const { post } of matching) {
        const li = document.createElement('li'); const heading = document.createElement('h2'); const anchor = document.createElement('a'); const description = document.createElement('p');
        anchor.href = post.path; anchor.textContent = post.title; description.textContent = post.description;
        heading.append(anchor); li.append(heading, description); results.append(li);
      }
    };
    input.addEventListener('input', showResults);
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const url = new URL(location.href);
      if (input.value.trim()) url.searchParams.set('q', input.value.trim());
      else url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
      showResults();
    });
    showResults();
  } catch (error) {
    if (controller.signal.aborted) return;
    status.dataset.error = 'true'; status.textContent = text.searchError;
    console.error('Search index could not load:', error);
  }
}
function initialize(): void {
  applyTheme();
  const select = document.querySelector<HTMLSelectElement>('[data-theme-select]');
  if (select) {
    syncThemeControl();
    const control = select.closest<HTMLElement>('.theme-control');
    if (control) control.hidden = false;
    const trigger = document.querySelector<HTMLButtonElement>('[data-theme-trigger]');
    const panel = document.querySelector<HTMLElement>('#theme-options');
    if (trigger && panel && typeof panel.showPopover === 'function') {
      select.hidden = true;
      trigger.hidden = false;
      panel.addEventListener('toggle', () => trigger.setAttribute('aria-expanded', String(panel.matches(':popover-open'))));
    }
  }
  const shortcut = document.querySelector<HTMLButtonElement>('[data-focus-search]');
  if (shortcut) {
    shortcut.hidden = false;
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    const label = shortcut.querySelector('kbd');
    if (label) label.textContent = mac ? '⌘ K' : 'Ctrl K';
    shortcut.setAttribute('aria-keyshortcuts', mac ? 'Meta+K' : 'Control+K');
  }
  const dialog = document.querySelector<HTMLDialogElement>('#mobile-navigation');
  const opener = document.querySelector<HTMLElement>('[data-open-menu]');
  const fallback = document.querySelector<HTMLElement>('.mobile-fallback');
  if (dialog && typeof dialog.showModal === 'function' && opener) {
    opener.hidden = false; if (fallback) fallback.hidden = true;
    dialog.addEventListener('close', () => { menuTrigger?.focus(); });
  }
  const notice = document.querySelector<HTMLElement>('[data-translation-notice]');
  if (notice && new URLSearchParams(location.search).get('translation') === 'missing') notice.classList.add('is-visible');
  enhanceMarkdown();
  void setupSearch();
}
document.addEventListener('astro:page-load', initialize);
