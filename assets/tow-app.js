(() => {
  'use strict';
  const installSection = document.getElementById('install');
  const installButton = document.getElementById('promptInstall');
  const installStatus = document.getElementById('install-status');
  const setInstallLinkVisibility = () => {
    const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    document.querySelectorAll('[data-install]').forEach(link => {
      if (link === installButton) link.hidden = installed || !promptEvent;
      else link.hidden = installed;
    });
  };
  let promptEvent;
  addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event;
    setInstallLinkVisibility();
  });
  addEventListener('appinstalled', () => {
    promptEvent = undefined;
    if (installStatus) installStatus.textContent = 'TowCalculator was added to this device.';
    setInstallLinkVisibility();
  });
  if (installSection) {
    document.querySelectorAll('[data-install]').forEach(link => link.addEventListener('click', async (event) => {
      if (!promptEvent) return;
      event.preventDefault();
      const pending = promptEvent;
      promptEvent = undefined;
      setInstallLinkVisibility();
      try {
        await pending.prompt();
        const { outcome } = await pending.userChoice;
        if (outcome === 'accepted' && installStatus) installStatus.textContent = 'Installation accepted.';
        if (outcome === 'dismissed') installSection.scrollIntoView({ block: 'start' });
      } catch {
        installSection.scrollIntoView({ block: 'start' });
      }
    }));
  }
  setInstallLinkVisibility();
  if ('serviceWorker' in navigator && isSecureContext) {
    navigator.serviceWorker.register('/tow-sw.js', {scope:'/', updateViaCache:'none'}).catch(() => {});
  }
  if (!document.getElementById('calcBtn')) return;
  const formArea = document.querySelector('.setup-card');
  const resultBox = document.getElementById('resultBox');
  const resultCard = document.querySelector('.result-card');
  const exampleNote = document.getElementById('exampleNote');
  const scrollResult = () => {
    if (!matchMedia('(max-width: 740px)').matches) return;
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    resultBox.focus({ preventScroll:true });
    resultCard.scrollIntoView({ block:'start', behavior });
  };
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (event.target instanceof HTMLInputElement &&
        formArea.contains(event.target) && event.target.type !== 'checkbox') {
      queueMicrotask(scrollResult);
    } else {
      // The original engine listens for Enter on document; keep navigation,
      // summaries, buttons, and dropdown interactions separate from calculation.
      event.stopPropagation();
    }
  }, true);
  document.getElementById('calcBtn').addEventListener('click', scrollResult);
  document.getElementById('resetBtn').addEventListener('click', () => { exampleNote.hidden = true; });
  document.getElementById('exampleBtn').addEventListener('click', () => {
    document.getElementById('resetBtn').click();
    const example = {
      payload:'1800', towRating:'8000', passengers:'350', cargo:'150',
      hitchHardware:'70', trailerType:'travel', trailerWeight:'4500',
      trailerBrakes:'yes', receiverTW:'750', receiverTow:'7500'
    };
    for (const [id,value] of Object.entries(example)) document.getElementById(id).value = value;
    document.getElementById('trailerType').dispatchEvent(new Event('change'));
    exampleNote.hidden = false;
    document.getElementById('payload').focus({ preventScroll:true });
  });
})();
