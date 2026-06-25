import { PhysicsEngine, CONFIG } from './engine.js';
import { Renderer } from './renderer.js';
import { BotPilot } from './botPilot.js';

export class GameManager {
    constructor(canvasId, elements) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.elements = elements;
        
        this.engine = new PhysicsEngine();
        this.renderer = new Renderer(this.ctx);
        this.bot = new BotPilot(this.engine);
        
        this.isPaused = false;
        this.bestScore = 0;
        this.animationId = null;
        this.frameCount = 0;
        
        this.features = {
            movingPipes: true,
            obstacles: true,
            dayNight: true
        };
        
        this.loadBestScore();
        this.setupEventListeners();
        this.updateFeatureIndicators();
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
        
        if (this.engine.isNightTime()) {
            this.elements.currentScore.style.color = '#aaccff';
        } else {
            this.elements.currentScore.style.color = '#f9f3d9';
        }
    }
    
    updateFeatureIndicators() {
        const pipeIndicator = document.getElementById('pipeIndicator');
        const obstacleIndicator = document.getElementById('obstacleIndicator');
        const dayNightIndicator = document.getElementById('dayNightIndicator');
        const botIndicator = document.getElementById('botIndicator');
        
        if (pipeIndicator) {
            pipeIndicator.style.color = this.features.movingPipes ? '#00ff00' : '#ff4444';
            pipeIndicator.innerText = this.features.movingPipes ? '[1] Pipes: ON' : '[1] Pipes: OFF';
        }
        if (obstacleIndicator) {
            obstacleIndicator.style.color = this.features.obstacles ? '#00ff00' : '#ff4444';
            obstacleIndicator.innerText = this.features.obstacles ? '[2] Balls: ON' : '[2] Balls: OFF';
        }
        if (dayNightIndicator) {
            dayNightIndicator.style.color = this.features.dayNight ? '#00ff00' : '#ff4444';
            dayNightIndicator.innerText = this.features.dayNight ? '[3] Day/Night: ON' : '[3] Day/Night: OFF';
        }
        if (botIndicator) {
            botIndicator.style.color = this.bot.enabled ? '#00ff00' : '#ff4444';
            botIndicator.innerText = this.bot.enabled ? '[B] Bot: ON' : '[B] Bot: OFF';
        }
    }
    
    showGameOver() { this.elements.gameOverMenu.classList.remove('hidden'); }
    hideGameOver() { this.elements.gameOverMenu.classList.add('hidden'); }
    showPause() { this.elements.pauseMenu.classList.remove('hidden'); }
    hidePause() { this.elements.pauseMenu.classList.add('hidden'); }
    
    restart() {
        this.engine.reset();
        this.isPaused = false;
        this.frameCount = 0;
        this.hidePause();
        this.hideGameOver();
        this.updateUI();
        if (window.resetWingFlap) window.resetWingFlap();
    }
    
    togglePause() {
        if (!this.engine.gameRunning) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) this.showPause();
        else this.hidePause();
    }
    
    jump() {
        if (!this.engine.gameRunning || this.isPaused) return;
        this.engine.jump();
        if (window.triggerWingFlap) window.triggerWingFlap();
    }
    
    toggleFeature(feature) {
        this.features[feature] = !this.features[feature];
        
        switch(feature) {
            case 'movingPipes':
                CONFIG.MOVING_PIPES_START_SCORE = this.features.movingPipes ? 20 : 99999;
                break;
            case 'obstacles':
                CONFIG.OBSTACLES_START_SCORE = this.features.obstacles ? 50 : 99999;
                break;
            case 'dayNight':
                CONFIG.DAY_NIGHT_START_SCORE = this.features.dayNight ? 70 : 99999;
                break;
        }
        
        this.updateFeatureIndicators();
    }
    
    enableAllFeatures() {
        this.features.movingPipes = true;
        this.features.obstacles = true;
        this.features.dayNight = true;
        CONFIG.MOVING_PIPES_START_SCORE = 20;
        CONFIG.OBSTACLES_START_SCORE = 50;
        CONFIG.DAY_NIGHT_START_SCORE = 70;
        this.updateFeatureIndicators();
    }
    
    disableAllFeatures() {
        this.features.movingPipes = false;
        this.features.obstacles = false;
        this.features.dayNight = false;
        CONFIG.MOVING_PIPES_START_SCORE = 99999;
        CONFIG.OBSTACLES_START_SCORE = 99999;
        CONFIG.DAY_NIGHT_START_SCORE = 99999;
        this.updateFeatureIndicators();
    }
    
    gameUpdate() {
        if (this.engine.gameRunning && !this.isPaused) {
            this.frameCount++;
            this.bot.update();
            
            const gameOver = this.engine.update();
            this.updateUI();
            
            if (gameOver) {
                this.saveBestScore();
                this.showGameOver();
            }
        }
    }
    
    drawDayNightBackground() {
        const isNight = this.engine.isNightTime();
        const transition = this.engine.dayNightTransition || 0;
        const W = 400, H = 600;
        
        this.renderer.drawBackground();
        
        if (isNight) {
            const nightAlpha = Math.min(1, transition);
            
            const overlayGrad = this.ctx.createLinearGradient(0, 0, 0, H);
            overlayGrad.addColorStop(0, `rgba(5, 10, 30, ${nightAlpha * 0.7})`);
            overlayGrad.addColorStop(0.5, `rgba(10, 15, 40, ${nightAlpha * 0.6})`);
            overlayGrad.addColorStop(1, `rgba(15, 20, 45, ${nightAlpha * 0.5})`);
            this.ctx.fillStyle = overlayGrad;
            this.ctx.fillRect(0, 0, W, H);
            
            if (transition > 0.4) {
                const starAlpha = (transition - 0.4) * 1.6;
                
                for (let i = 0; i < 30; i++) {
                    const sx = ((i * 137 + 53) % W);
                    const sy = ((i * 97 + 31) % (H * 0.65));
                    const size = (i % 4 === 0) ? 2 : 1;
                    const twinkle = Math.sin(this.frameCount * 0.03 + i * 1.7) * 0.5 + 0.5;
                    const alpha = starAlpha * twinkle * 0.8;
                    
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.fillRect(sx, sy, size, size);
                }
            }
            
            if (transition > 0.2) {
                const moonAlpha = Math.min(1, (transition - 0.2) * 1.2);
                const moonX = 320, moonY = 75, moonR = 32;
                
                this.ctx.fillStyle = `rgba(255, 255, 220, ${moonAlpha * 0.95})`;
                this.ctx.beginPath();
                this.ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = `rgba(10, 15, 40, ${nightAlpha * 0.7})`;
                this.ctx.beginPath();
                this.ctx.arc(moonX + 8, moonY - 5, moonR - 5, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = `rgba(255, 255, 200, ${moonAlpha * 0.15})`;
                this.ctx.beginPath();
                this.ctx.arc(moonX, moonY, moonR + 15, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (this.engine.score >= 70 && transition < 1) {
            const dayAlpha = 1 - transition;
            this.ctx.fillStyle = `rgba(5, 10, 30, ${dayAlpha * 0.3})`;
            this.ctx.fillRect(0, 0, W, H);
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, 400, 600);
        
        this.drawDayNightBackground();
        this.renderer.drawPipes(this.engine.pipes);
        
        const isNight = this.engine.isNightTime();
        
        for (let obs of this.engine.obstacles) {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(obs.x, obs.y, obs.size/2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#cc0000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 100, 100, 0.25)';
            this.ctx.beginPath();
            this.ctx.arc(obs.x, obs.y, obs.size/2 + 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(obs.x - 3, obs.y - 3, obs.size/6, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.renderer.drawBird(this.engine.bird, this.engine.gameRunning, this.isPaused);
        this.bot.drawDebug(this.ctx, { W: 400, H: 600 });
        
        if (this.isPaused && this.engine.gameRunning) {
            this.renderer.drawPauseOverlay();
        }
        
        if (this.engine.score >= 70) {
            const icon = isNight ? '~' : 'O';
            const text = isNight ? 'NIGHT' : 'DAY';
            const color = isNight ? '#aaccff' : '#ffdd88';
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(140, 8, 120, 30);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(140, 8, 120, 30);
            
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 11px monospace';
            this.ctx.fillText(`${icon} ${text}`, 150, 24);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '9px monospace';
            this.ctx.fillText(`${isNight ? 'Relax' : 'Focus'}`, 150, 36);
        }
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.fillText(`Best: ${this.bestScore}`, 310, 38);
    }
    
    animationLoop() {
        this.gameUpdate();
        this.render();
        this.animationId = requestAnimationFrame(() => this.animationLoop());
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyB') {
                e.preventDefault();
                this.bot.toggle();
                this.updateFeatureIndicators();
                return;
            }
            
            if (e.code === 'Digit1') {
                e.preventDefault();
                this.toggleFeature('movingPipes');
                return;
            }
            if (e.code === 'Digit2') {
                e.preventDefault();
                this.toggleFeature('obstacles');
                return;
            }
            if (e.code === 'Digit3') {
                e.preventDefault();
                this.toggleFeature('dayNight');
                return;
            }
            if (e.code === 'Digit4') {
                e.preventDefault();
                this.enableAllFeatures();
                return;
            }
            if (e.code === 'Digit5') {
                e.preventDefault();
                this.disableAllFeatures();
                return;
            }
            
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (!this.bot.enabled) this.jump();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                this.restart();
            }
            if (e.code === 'Escape') {
                e.preventDefault();
                if (this.engine.gameRunning && !this.isPaused) this.togglePause();
            }
        });
        
        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.bot.enabled) this.jump();
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.bot.enabled) this.jump();
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