export const CONFIG = {
    W: 400,
    H: 600,
    BIRD_RADIUS: 14,
    GRAVITY: 0.2,
    JUMP_POWER: -5.1,
    MAX_VELOCITY: 9,
    PIPE_WIDTH: 58,
    PIPE_GAP: 150,
    PIPE_SPACING: 240,
    PIPE_SPEED: 2.2,
    MIN_TOP_HEIGHT: 50,
    MAX_TOP_HEIGHT: null,
    
    MOVING_PIPES_START_SCORE: 20,
    PIPE_MOVE_BASE_AMPLITUDE: 25,
    PIPE_MOVE_BASE_SPEED: 0.8,
    PIPE_MOVE_AMPLITUDE_INCREMENT: 8,
    PIPE_MOVE_SPEED_INCREMENT: 0.3,
    PIPE_MOVE_MAX_AMPLITUDE: 80,
    PIPE_MOVE_MAX_SPEED: 3.5,
    
    OBSTACLES_START_SCORE: 10,
    OBSTACLE_SIZE: 20,
    OBSTACLE_SPEED: 3.5,
    OBSTACLE_SPAWN_CHANCE: 0.015,
    
    DAY_NIGHT_START_SCORE: 10,
    DAY_NIGHT_INTERVAL: 10,
    NIGHT_PIPE_GAP_BONUS: 30,
    NIGHT_OBSTACLE_MULTIPLIER: 0,
};

export class PhysicsEngine {
    constructor() {
        CONFIG.MAX_TOP_HEIGHT = CONFIG.H - CONFIG.PIPE_GAP - 50;
        this.reset();
    }
    
    getCurrentAmplitude() {
        if (this.score < CONFIG.MOVING_PIPES_START_SCORE) return 0;
        const levelsAbove = Math.floor((this.score - CONFIG.MOVING_PIPES_START_SCORE) / 10);
        return Math.min(
            CONFIG.PIPE_MOVE_BASE_AMPLITUDE + levelsAbove * CONFIG.PIPE_MOVE_AMPLITUDE_INCREMENT,
            CONFIG.PIPE_MOVE_MAX_AMPLITUDE
        );
    }
    
    getCurrentMoveSpeed() {
        if (this.score < CONFIG.MOVING_PIPES_START_SCORE) return 0;
        const levelsAbove = Math.floor((this.score - CONFIG.MOVING_PIPES_START_SCORE) / 10);
        return Math.min(
            CONFIG.PIPE_MOVE_BASE_SPEED + levelsAbove * CONFIG.PIPE_MOVE_SPEED_INCREMENT,
            CONFIG.PIPE_MOVE_MAX_SPEED
        );
    }
    
    getDifficultyLevel() {
        if (this.score < CONFIG.MOVING_PIPES_START_SCORE) return 0;
        return Math.floor((this.score - CONFIG.MOVING_PIPES_START_SCORE) / 10) + 1;
    }
    
    isNightTime() {
        if (this.score < CONFIG.DAY_NIGHT_START_SCORE) return false;
        const cyclesAfterStart = Math.floor((this.score - CONFIG.DAY_NIGHT_START_SCORE) / CONFIG.DAY_NIGHT_INTERVAL);
        return cyclesAfterStart % 2 === 1;
    }
    
    getEffectivePipeGap() {
        if (this.isNightTime()) {
            return CONFIG.PIPE_GAP + CONFIG.NIGHT_PIPE_GAP_BONUS;
        }
        return CONFIG.PIPE_GAP;
    }
    
    reset() {
        this.bird = {
            x: 80,
            y: CONFIG.H / 2,
            vy: 0,
            radius: CONFIG.BIRD_RADIUS
        };
        this.pipes = [];
        this.obstacles = [];
        this.score = 0;
        this.gameRunning = true;
        this.pipeMovePhase = 0;
        this.dayNightTransition = 0;
        this.wasNight = false;
        this.lastPassedPipe = null;
        this.framesSincePassed = 0;
        this.invulnerableFrames = 20;
        this.initPipes();
    }
    
    randomPipeHeight() {
        const effectiveGap = this.getEffectivePipeGap();
        const max = CONFIG.H - effectiveGap - 50;
        const min = CONFIG.MIN_TOP_HEIGHT;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    
    initPipes() {
        this.pipes = [];
        for (let i = 0; i < 4; i++) {
            let xPos = CONFIG.W + i * CONFIG.PIPE_SPACING;
            let topHeight = this.randomPipeHeight();
            const effectiveGap = this.getEffectivePipeGap();
            this.pipes.push({
                x: xPos,
                width: CONFIG.PIPE_WIDTH,
                topHeight: topHeight,
                bottomY: topHeight + effectiveGap,
                passed: false,
                baseTopHeight: topHeight,
                moveOffset: 0
            });
        }
    }
    
    addPipe() {
        let lastPipe = this.pipes[this.pipes.length - 1];
        let newX = lastPipe.x + CONFIG.PIPE_SPACING;
        let topH = this.randomPipeHeight();
        const effectiveGap = this.getEffectivePipeGap();
        this.pipes.push({
            x: newX,
            width: CONFIG.PIPE_WIDTH,
            topHeight: topH,
            bottomY: topH + effectiveGap,
            passed: false,
            baseTopHeight: topH,
            moveOffset: 0
        });
    }
    
    spawnObstacle() {
        if (this.isNightTime()) return;
        
        const y = Math.random() * (CONFIG.H - 100) + 50;
        const speedBonus = Math.floor((Math.max(0, this.score - 50)) / 10) * 0.5;
        
        this.obstacles.push({
            x: CONFIG.W + 20,
            y: y,
            size: CONFIG.OBSTACLE_SIZE,
            speed: CONFIG.OBSTACLE_SPEED + Math.random() * 2 + speedBonus
        });
    }
    
   updatePipes() {
        const isNight = this.isNightTime();
        
        for (let pipe of this.pipes) {
            pipe.x -= CONFIG.PIPE_SPEED;
        }
        
        if (this.score >= CONFIG.MOVING_PIPES_START_SCORE) {
            const currentAmplitude = this.getCurrentAmplitude();
            const currentMoveSpeed = this.getCurrentMoveSpeed();
            const nightMultiplier = isNight ? 0.5 : 1.0;
            const effectiveSpeed = currentMoveSpeed * nightMultiplier;
            const effectiveAmplitude = currentAmplitude * nightMultiplier;
            
            this.pipeMovePhase += effectiveSpeed * 0.02;
            
            for (let pipe of this.pipes) {
                const birdX = this.bird.x;
                const birdRadius = this.bird.radius;
                const pipeLeft = pipe.x;
                const pipeRight = pipe.x + pipe.width;
                
                const birdInsidePipe = birdX - birdRadius < pipeRight && 
                                    birdX + birdRadius > pipeLeft &&
                                    !pipe.passed;
                
                if (!birdInsidePipe) {
                    const offset = Math.sin(this.pipeMovePhase + pipe.x * 0.01) * effectiveAmplitude;
                    pipe.moveOffset = offset;
                    
                    const gapSize = pipe.bottomY - pipe.topHeight;
                    const newTopHeight = pipe.baseTopHeight + offset;
                    const newBottomY = newTopHeight + gapSize;
                    
                    if (newTopHeight >= CONFIG.MIN_TOP_HEIGHT && 
                        newBottomY <= CONFIG.H - 50) {
                        pipe.topHeight = newTopHeight;
                        pipe.bottomY = newBottomY;
                    }
                }
            }
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
                this.lastPassedPipe = pipe;
                this.framesSincePassed = 0;
                this.score++;
                
                const nowNight = this.isNightTime();
                if (nowNight !== this.wasNight) {
                    this.wasNight = nowNight;
                    this.dayNightTransition = 0;
                }
            }
        }
        
        this.framesSincePassed++;
        
        if (this.dayNightTransition < 1) {
            this.dayNightTransition += 0.02;
        }
    }
    
    updateObstacles() {
        if (this.score >= CONFIG.OBSTACLES_START_SCORE && !this.isNightTime()) {
            const spawnBonus = Math.floor((this.score - 50) / 10) * 0.003;
            const effectiveChance = CONFIG.OBSTACLE_SPAWN_CHANCE + spawnBonus;
            
            if (Math.random() < effectiveChance) {
                this.spawnObstacle();
            }
        }
        
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].x -= this.obstacles[i].speed;
            if (this.obstacles[i].x < -50) {
                this.obstacles.splice(i, 1);
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
    
    checkCircleCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (r1 + r2);
    }
    
    checkCollisions() {
        if (this.bird.y - CONFIG.BIRD_RADIUS <= 0) return true;
        if (this.bird.y + CONFIG.BIRD_RADIUS >= CONFIG.H) return true;
        
        for (let pipe of this.pipes) {
            if (pipe === this.lastPassedPipe && this.framesSincePassed < this.invulnerableFrames) {
                continue;
            }
            
            if (this.checkCircleRectCollision(
                this.bird.x, this.bird.y, CONFIG.BIRD_RADIUS,
                pipe.x, 0, CONFIG.PIPE_WIDTH, pipe.topHeight
            )) return true;
            
            if (this.checkCircleRectCollision(
                this.bird.x, this.bird.y, CONFIG.BIRD_RADIUS,
                pipe.x, pipe.bottomY, CONFIG.PIPE_WIDTH, CONFIG.H - pipe.bottomY
            )) return true;
        }
        
        for (let obstacle of this.obstacles) {
            if (this.checkCircleCollision(
                this.bird.x, this.bird.y, CONFIG.BIRD_RADIUS,
                obstacle.x, obstacle.y, obstacle.size / 2
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
        this.updateObstacles();
        
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
            obstacles: this.obstacles.map(o => ({ ...o })),
            score: this.score,
            gameRunning: this.gameRunning,
            pipeMovePhase: this.pipeMovePhase,
            isNight: this.isNightTime(),
            dayNightTransition: this.dayNightTransition,
            difficultyLevel: this.getDifficultyLevel(),
            currentAmplitude: this.getCurrentAmplitude(),
            currentMoveSpeed: this.getCurrentMoveSpeed()
        };
    }
}