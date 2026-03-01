import { Game } from './core/Game';
import { ExerciseZoneConfig } from './core/ExerciseZoneConfig';
import { initSyncIndicator } from './persistence/SyncIndicator';
import { ZoneSetupScreen } from './setup';

let scrollGuardEnabled = true;

function enableScrollGuard(): void {
  scrollGuardEnabled = true;
  window.scrollTo(0, 0);
}

function disableScrollGuard(): void {
  scrollGuardEnabled = false;
}

function installScrollGuard(): void {
  const setupScreen = document.getElementById('setup-screen')!;
  window.addEventListener('scroll', () => {
    if (!scrollGuardEnabled) return;
    const maxScroll = setupScreen.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) {
      window.scrollTo(0, 0);
    } else if (window.scrollY > maxScroll) {
      window.scrollTo(0, maxScroll);
    }
  });
}

function lockEditor(): void {
  document.body.classList.add('editor-locked');
  window.dispatchEvent(new Event('resize'));
}

function scrollToEditor(): void {
  disableScrollGuard();

  const app = document.getElementById('app')!;
  app.scrollIntoView({ behavior: 'smooth' });

  const onDone = () => lockEditor();

  if ('onscrollend' in window) {
    window.addEventListener('scrollend', onDone, { once: true });
  } else {
    setTimeout(onDone, 600);
  }
}

function initGame(zoneConfig?: ExerciseZoneConfig, exerciseId?: string): void {
  const game = new Game('gameCanvas', zoneConfig, exerciseId);
  game.start();
  initSyncIndicator();
}

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const exerciseId = params.get('id') || undefined;
  const drillId = params.get('drill') || undefined;
  const skipSetup = !!exerciseId || !!drillId;

  installScrollGuard();

  if (skipSetup) {
    disableScrollGuard();
    initGame(undefined, exerciseId);
    requestAnimationFrame(() => {
      const app = document.getElementById('app')!;
      app.scrollIntoView({ behavior: 'instant' });
      requestAnimationFrame(() => lockEditor());
    });
  } else {
    enableScrollGuard();
    new ZoneSetupScreen({
      onConfirm: (config) => {
        initGame(config);
        scrollToEditor();
      },
    });
  }
});
