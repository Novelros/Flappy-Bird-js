import { GameManager } from './gameManager.js';

const elements = {
    currentScore: document.getElementById('currentScore'),
    bestScore: document.getElementById('bestScore'),
    pauseMenu: document.getElementById('pauseMenu'),
    gameOverMenu: document.getElementById('gameOverMenu'),
    finalScore: document.getElementById('finalScore')
};

const game = new GameManager('flappyCanvas', elements);
game.start();