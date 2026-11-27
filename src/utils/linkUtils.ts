/**
 * @file src/utils/linkUtils.ts
 * @description 提供编辑器超链接/锚点信息提取、章节标题平滑跳转定位及外部链接安全打开能力
 * @module 链接与导航工具模块
 */
export interface ExtractedLinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
}

/**
 * Extracts link href/text from standard `<a>` tags, Vditor IR `[data-type="a"]` nodes,
 * or fallback `[data-href]` elements.
 */
export function extractLinkInfo(target: HTMLElement | null): ExtractedLinkInfo | null {
  if (!target) return null;

  const aTag = target.closest('a');
  if (aTag) {
    const rawHref = aTag.getAttribute('href') || aTag.getAttribute('data-href') || '';
    const text = aTag.textContent?.trim() || '';
    return { href: rawHref, text, isInternal: rawHref.startsWith('#') };
  }

  const irLinkNode = target.closest('[data-type="a"]');
  if (irLinkNode) {
    const marker = irLinkNode.querySelector('.vditor-ir__marker--link');
    let href = marker?.textContent?.trim() || '';
    if (href.startsWith('(') && href.endsWith(')')) {
      href = href.slice(1, -1).trim();
    }
    const textClone = irLinkNode.cloneNode(true) as HTMLElement;
    textClone.querySelectorAll('.vditor-ir__marker').forEach(m => m.remove());
    const text = textClone.textContent?.trim() || '';
    return { href, text: text || href, isInternal: href.startsWith('#') };
  }

  const dataHrefEl = target.closest('[data-href]');
  if (dataHrefEl) {
    const href = dataHrefEl.getAttribute('data-href') || '';
    const text = dataHrefEl.textContent?.trim() || '';
    return { href, text, isInternal: href.startsWith('#') };
  }

  return null;
}

/**
 * Smoothly scrolls an editor reset container to the matching heading anchor or title text
 * and highlights the target heading briefly.
 */
export function scrollToHeadingByAnchor(
  targetHref: string,
  linkText: string | undefined,
  targetContainer: HTMLElement | null
): boolean {
  if (!targetContainer) return false;

  let rawAnchor = (targetHref || '').trim();
  if (rawAnchor.startsWith('#')) {
    rawAnchor = rawAnchor.slice(1).trim();
  }
  try {
    rawAnchor = decodeURIComponent(rawAnchor);
  } catch {}

  const normalize = (str: string) =>
    str.replace(/[\s\-_.*+?^${}()|[\]\\/#:：,，.。!！?？"“”'‘’`~]/g, '').trim().toLowerCase();

  const cleanAnchor = normalize(rawAnchor);
  const cleanLinkText = normalize(linkText || '');

  const domHeadings = Array.from(
    targetContainer.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [data-type="heading"]')
  );
  if (domHeadings.length === 0) return false;

  let targetH: HTMLElement | null = null;

  if (rawAnchor) {
    targetH = domHeadings.find(h => {
      const id = h.getAttribute('id') || h.getAttribute('data-id') || h.getAttribute('name') || '';
      if (!id) return false;
      return id.toLowerCase() === rawAnchor.toLowerCase() || normalize(id) === cleanAnchor;
    }) || null;
  }

  if (!targetH && (cleanAnchor || cleanLinkText)) {
    targetH = domHeadings.find(h => {
      const hText = normalize(h.textContent || '');
      if (!hText) return false;
      return Boolean((cleanAnchor && hText === cleanAnchor) || (cleanLinkText && hText === cleanLinkText));
    }) || null;
  }

  if (!targetH && (cleanAnchor || cleanLinkText)) {
    targetH = domHeadings.find(h => {
      const hText = normalize(h.textContent || '');
      if (!hText) return false;
      return Boolean(
        (cleanAnchor && (hText.includes(cleanAnchor) || cleanAnchor.includes(hText))) ||
        (cleanLinkText && (hText.includes(cleanLinkText) || cleanLinkText.includes(hText)))
      );
    }) || null;
  }

  if (!targetH) return false;

  const containerRect = targetContainer.getBoundingClientRect();
  const targetRect = targetH.getBoundingClientRect();
  const relativeTop = targetRect.top - containerRect.top + targetContainer.scrollTop;

  targetContainer.scrollTo({
    top: Math.max(0, relativeTop - 24),
    behavior: 'smooth',
  });

  targetH.style.transition =
    'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s ease';
  targetH.style.backgroundColor = 'rgba(56, 189, 248, 0.25)';
  targetH.style.boxShadow = '0 0 0 4px rgba(56, 189, 248, 0.15)';
  targetH.style.borderRadius = '6px';
  setTimeout(() => {
    if (targetH) {
      targetH.style.backgroundColor = '';
      targetH.style.boxShadow = '';
    }
  }, 2000);

  return true;
}

/** Opens an external URL via Electron's shell handler or browser fallback. */
export function openExternalLink(href: string) {
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(href);
  } else if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
    window.open(href, '_blank');
  }
}
