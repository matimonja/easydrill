import { Game } from './core/Game';
import { loadZoneConfig } from './core/ExerciseZoneConfig';

window.addEventListener('DOMContentLoaded', () => {
  const zoneConfig = loadZoneConfig();
  const game = new Game('gameCanvas', zoneConfig ?? undefined);
  game.start();
});

