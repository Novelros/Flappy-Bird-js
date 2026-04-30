import { PhysicsEngine } from './engine.js';
import { Renderer } from './renderer.js';

export class GameManager {
    constructor(canvasId, elements) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.elements = elements;
        
        this.engine = new PhysicsEngine();
        this.renderer = new Renderer(this.ctx);
        
        this.isPaused = false;
        this.bestScore = 0;
        this.animationId = null;
        
        this.loadBestScore();
        this.setupEventListeners();
    }
    
    loadBestScore() {
        const saved = localStorage.getItem('flappyBestScore');
        if (saved && !isNaN(parseInt(saved))) {
            this.bestScore = parseInt(saved);
            this.elements.bestScore.innerText = this.bestScore;
        }
    }
    
    saveBestScore() {
        if (this.engine.score > this.bestScore) {
            this.bestScore = this.engine.score;
            this.elements.bestScore.innerText = this.bestScore;
            localStorage.setItem('flappyBestScore', this.bestScore);
        }
    }
    
    updateUI() {
        this.elements.currentScore.innerText = this.engine.score;
        if (!this.engine.gameRunning) {
            this.elements.finalScore.innerText = this.engine.score;
        }
    }
    
    showGameOver() {
        this.elements.gameOverMenu.classList.remove('hidden');
    }
    
    hideGameOver() {
        this.elements.gameOverMenu.classList.add('hidden');
    }
    
    showPause() {
        this.elements.pauseMenu.classList.remove('hidden');
    }
    
    hidePause() {
        this.elements.pauseMenu.classList.add('hidden');
    }
    
    restart() {
        this.engine.reset();
        this.isPaused = false;
        this.hidePause();
        this.hideGameOver();
        this.updateUI();
        if (window.resetWingFlap) window.resetWingFlap();
    }
    
    togglePause() {
        if (!this.engine.gameRunning) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showPause();
        } else {
            this.hidePause();
        }
    }
    
    jump() {
        if (!this.engine.gameRunning || this.isPaused) return;
        this.engine.jump();
        if (window.triggerWingFlap) window.triggerWingFlap();
    }
    
    gameUpdate() {
        if (this.engine.gameRunning && !this.isPaused) {
            const gameOver = this.engine.update();
            this.updateUI();
            
            if (gameOver) {
                this.saveBestScore();
                this.showGameOver();
            }
        }
    }
    
    render() {
        this.renderer.drawBackground();
        this.renderer.drawPipes(this.engine.pipes);
        this.renderer.drawBird(this.engine.bird, this.engine.gameRunning, this.isPaused);
        
        if (this.isPaused && this.engine.gameRunning) {
            this.renderer.drawPauseOverlay();
        }
    }
    
    animationLoop() {
        this.gameUpdate();
        this.render();
        this.animationId = requestAnimationFrame(() => this.animationLoop());
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.jump();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                this.restart();
            }
            if (e.code === 'Escape') {
                e.preventDefault();
                if (this.engine.gameRunning && !this.isPaused) {
                    this.togglePause();
                }
            }
        });
        
        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            this.jump();
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
        }, { passive: false });
        
        document.getElementById('continueBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartPauseBtn').addEventListener('click', () => this.restart());
        document.getElementById('gameoverRestartBtn').addEventListener('click', () => this.restart());
    }
    
    start() {
        this.restart();
        this.animationLoop();
    }
}