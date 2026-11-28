export function startNotify(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-notify]').forEach((button) => {
    if (button.dataset.ready === 'true') return;
    button.dataset.ready = 'true';
    button.addEventListener('click', () => {
      const note = button.parentElement?.querySelector<HTMLElement>('[data-notify-note]');
      button.hidden = true;
      if (note) note.hidden = false;
    });
  });
}
