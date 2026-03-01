import { Game } from './core/Game';
import { ExerciseZoneConfig } from './core/ExerciseZoneConfig';
import { initSyncIndicator } from './persistence/SyncIndicator';
import { ZoneSetupScreen } from './setup';

function initGame(zoneConfig?: ExerciseZoneConfig, exerciseId?: string): void {
  const game = new Game('gameCanvas', zoneConfig, exerciseId);
  game.start();
  initSyncIndicator();
}

function transitionToEditor(zoneConfig?: ExerciseZoneConfig, exerciseId?: string): void {
  const setupScreen = document.getElementById('setup-screen')!;
  const app = document.getElementById('app')!;

  setupScreen.style.transition = 'transform 0.35s ease-in-out, opacity 0.35s ease-in-out';
  setupScreen.style.transform = 'translateY(-100%)';
  setupScreen.style.opacity = '0';

  setTimeout(() => {
    setupScreen.style.display = 'none';
    app.style.display = 'flex';
    initGame(zoneConfig, exerciseId);
  }, 350);
}

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const exerciseId = params.get('id') || undefined;
  const drillId = params.get('drill') || undefined;
  const skipSetup = !!exerciseId || !!drillId;

  const setupScreen = document.getElementById('setup-screen')!;
  const app = document.getElementById('app')!;

  if (skipSetup) {
    setupScreen.style.display = 'none';
    app.style.display = 'flex';
    initGame(undefined, exerciseId);
  } else {
    app.style.display = 'none';
    new ZoneSetupScreen({
      onConfirm: (config) => {
        transitionToEditor(config);
      },
    });
  }
});
