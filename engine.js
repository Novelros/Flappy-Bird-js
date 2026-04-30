export const CONFIG = {
    W: 400,
    H: 600,
    BIRD_RADIUS: 14,
    GRAVITY: 0.2,
    JUMP_POWER: -5.4,
    MAX_VELOCITY: 9,
    PIPE_WIDTH: 58,
    PIPE_GAP: 120,
    PIPE_SPACING: 240,
    PIPE_SPEED: 2.2,
    MIN_TOP_HEIGHT: 50,
    MAX_TOP_HEIGHT: null
};

export class PhysicsEngine {
    constructor() {
        CONFIG.MAX_TOP_HEIGHT = CONFIG.H - CONFIG.PIPE_GAP - 50;
        this.reset();
    }
    
    randomPipeHeight() {
        const max = CONFIG.MAX_TOP_HEIGHT;
        const min = CONFIG.MIN_TOP_HEIGHT;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    reset() {
        this.bird = {
            x: 80,
            y: CONFIG.H / 2,
            vy: 0,
            radius: CONFIG.BIRD_RADIUS
        };
        this.pipes = [];
        this.score = 0;
        this.gameRunning = true;
        this.initPipes();
    }
    
    initPipes() {
        this.pipes = [];
        for (let i = 0; i < 4; i++) {
            let xPos = CONFIG.W + i * CONFIG.PIPE_SPACING;
            let topHeight = this.randomPipeHeight();
            this.pipes.push({
                x: xPos,
                width: CONFIG.PIPE_WIDTH,
                topHeight: topHeight,
                bottomY: topHeight + CONFIG.PIPE_GAP,
                passed: false
            });
        }
    }
    
    addPipe() {
        let lastPipe = this.pipes[this.pipes.length - 1];
        let newX = lastPipe.x + CONFIG.PIPE_SPACING;
        let topH = this.randomPipeHeight();
        this.pipes.push({
            x: newX,
            width: CONFIG.PIPE_WIDTH,
            topHeight: topH,
            bottomY: topH + CONFIG.PIPE_GAP,
            passed: false
        });
    }
    
    updatePipes() {
        for (let pipe of this.pipes) {
            pipe.x -= CONFIG.PIPE_SPEED;
        }
        
        while (this.pipes.length > 0 && this.pipes[0].x + CONFIG.PIPE_WIDTH < 0) {
            this.pipes.shift();
        }
        
        if (this.pipes.length === 0) {
            this.addPipe();
        } else {
            let last = this.pipes[this.pipes.length - 1];
            if (last.x + CONFIG.PIPE_WIDTH < CONFIG.W + CONFIG.PIPE_SPACING - 10) {
                this.addPipe();
            }
        }
        
        for (let pipe of this.pipes) {
            if (!pipe.passed && this.bird.x - CONFIG.BIRD_RADIUS > pipe.x + CONFIG.PIPE_WIDTH) {
                pipe.passed = true;
                this.score++;
            }
        }
    }
    
    checkCircleRectCollision(cx, cy, r, rx, ry, rw, rh) {
        let closestX = Math.max(rx, Math.min(cx, rx + rw));
        let closestY = Math.max(ry, Math.min(cy, ry + rh));
        let dx = cx - closestX;
        let dy = cy - closestY;
        return (dx * dx + dy * dy) < r * r;
    }
    
    checkCollisions() {
        if (this.bird.y - CONFIG.BIRD_RADIUS <= 0) return true;
        if (this.bird.y + CONFIG.BIRD_RADIUS >= CONFIG.H) return true;
        
        for (let pipe of this.pipes) {
            if (this.checkCircleRectCollision(
                this.bird.x, this.bird.y, CONFIG.BIRD_RADIUS,
                pipe.x, 0, CONFIG.PIPE_WIDTH, pipe.topHeight
            )) return true;
            
            if (this.checkCircleRectCollision(
                this.bird.x, this.bird.y, CONFIG.BIRD_RADIUS,
                pipe.x, pipe.bottomY, CONFIG.PIPE_WIDTH, CONFIG.H - pipe.bottomY
            )) return true;
        }
        return false;
    }
    
    updateBird() {
        this.bird.vy += CONFIG.GRAVITY;
        if (this.bird.vy > CONFIG.MAX_VELOCITY) this.bird.vy = CONFIG.MAX_VELOCITY;
        this.bird.y += this.bird.vy;
    }
    
    jump() {
        if (!this.gameRunning) return;
        this.bird.vy = CONFIG.JUMP_POWER;
        if (this.bird.y - CONFIG.BIRD_RADIUS <= 2) {
            this.bird.y = CONFIG.BIRD_RADIUS + 2;
        }
    }
    
    update() {
        if (!this.gameRunning) return false;
        
        this.updateBird();
        this.updatePipes();
        
        if (this.checkCollisions()) {
            this.gameRunning = false;
            return true;
        }
        return false;
    }
    
    getState() {
        return {
            bird: { ...this.bird },
            pipes: this.pipes.map(p => ({ ...p })),
            score: this.score,
            gameRunning: this.gameRunning
        };
    }
}