export function startEventPage(): void {
  const frame = document.querySelector<HTMLElement>('[data-frame]');
  const img = frame?.querySelector<HTMLImageElement>('[data-poster]');
  if (frame && img) {
    img.addEventListener('error', () => {
      const logo = frame.dataset.logo || '';
      if (frame.dataset.mode === 'poster' && logo) {
        frame.dataset.mode = 'logo';
        img.alt = frame.dataset.logoAlt || '';
        img.src = logo;
        return;
      }
      img.remove();
      frame.dataset.mode = 'tile';
    });
  }

  const share = document.querySelector<HTMLButtonElement>('[data-native-share]');
  if (share && typeof navigator.share === 'function') {
    share.hidden = false;
    share.addEventListener('click', () => {
      const title = share.dataset.shareTitle || '';
      const text = share.dataset.shareText || '';
      const url = share.dataset.shareUrl || '';
      navigator.share({ title, text, url }).catch(() => {});
    });
  }
}
