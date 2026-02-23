import { Game } from './core/Game';
import { loadZoneConfig } from './core/ExerciseZoneConfig';

window.addEventListener('DOMContentLoaded', () => {
  const zoneConfig = loadZoneConfig();
  const params = new URLSearchParams(window.location.search);
  const exerciseId = params.get('id') || undefined;
  const game = new Game('gameCanvas', zoneConfig ?? undefined, exerciseId);
  game.start();
});

