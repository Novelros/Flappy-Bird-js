import { CONFIG } from './engine.js';

export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    
    drawBackground() {
        const { W, H } = CONFIG;
        const ctx = this.ctx;
        
        ctx.fillStyle = '#7ec8e0';
        ctx.fillRect(0, 0, W, H);
        
        ctx.fillStyle = 'rgba(255,255,240,0.85)';
        ctx.beginPath();
        ctx.ellipse(70, 70, 45, 35, 0, 0, Math.PI * 2);
        ctx.ellipse(110, 85, 40, 30, 0, 0, Math.PI * 2);
        ctx.ellipse(40, 90, 35, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(300, 130, 50, 38, 0, 0, Math.PI * 2);
        ctx.ellipse(340, 145, 40, 32, 0, 0, Math.PI * 2);
        ctx.ellipse(260, 148, 35, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#d6ae7a';
        ctx.fillRect(0, H - 50, W, 50);
        ctx.fillStyle = '#b87c4f';
        for (let i = 0; i < 12; i++) {
            ctx.fillRect(i * 45, H - 52, 25, 8);
        }
        ctx.fillStyle = '#7c9a3e';
        ctx.fillRect(0, H - 54, W, 6);
    }
    
    drawPipes(pipes) {
        const { W, H, PIPE_WIDTH } = CONFIG;
        const ctx = this.ctx;
        
        for (let pipe of pipes) {
            ctx.fillStyle = '#2d6a4f';
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
            ctx.fillStyle = '#1f543d';
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 28, PIPE_WIDTH + 10, 30);
            ctx.fillStyle = '#40916c';
            ctx.fillRect(pipe.x - 3, pipe.topHeight - 24, PIPE_WIDTH + 6, 24);
            
            ctx.fillStyle = '#2d6a4f';
            ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, H - pipe.bottomY);
            ctx.fillStyle = '#1f543d';
            ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 30);
            ctx.fillStyle = '#40916c';
            ctx.fillRect(pipe.x - 3, pipe.bottomY + 4, PIPE_WIDTH + 6, 24);
            
            ctx.fillStyle = '#145c33';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(pipe.x + 8, pipe.topHeight - 18 + i * 6, 8, 3);
                ctx.fillRect(pipe.x + 8, pipe.bottomY + 12 + i * 6, 8, 3);
            }
        }
    }
    
    drawBird(bird, gameRunning, isPaused) {
        if (window.drawBird) {
            window.drawBird({
                bird: bird,
                gameRunning: gameRunning,
                isPaused: isPaused,
                ctx: this.ctx,
                config: CONFIG
            });
        }
    }
    
    drawPauseOverlay() {
        const { W, H } = CONFIG;
        const ctx = this.ctx;
        
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.font = 'bold 28 monospace';
        ctx.fillStyle = '#ffd966';
        ctx.shadowBlur = 3;
        ctx.fillText('ПАУЗА', W / 2 - 55, H / 2);
        ctx.shadowBlur = 0;
    }
}