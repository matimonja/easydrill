import { Game } from './core/Game';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game('gameCanvas');
  game.start();
});
