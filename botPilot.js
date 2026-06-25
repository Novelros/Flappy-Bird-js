export class BotPilot {
    constructor(engine) {
        this.engine = engine;
        this.enabled = false;
        this.debugMode = false;
        
        this.currentPipe = null;
        this.nextPipe = null;
        this.lastJumpFrame = 0;
        this.jumpCooldown = 2;
        this.bestPlan = null;
        
        this.pipeSwitchRequired = 10;
        this.framesSincePipePassed = 0;
        
        this.debugInfo = {};
    }
    
    findPipes() {
        const birdX = this.engine.bird.x;
        const birdRadius = this.engine.bird.radius;
        const pipes = this.engine.pipes;
        
        let closest = null;
        let closestDist = Infinity;
        let next = null;
        
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];
            const pipeRight = pipe.x + pipe.width;
            
            if (pipeRight > birdX - birdRadius - 10) {
                const dist = pipe.x - birdX;
                if (dist < closestDist && dist > -pipe.width) {
                    if (closest && closest.pipe !== pipe) next = closest;
                    closestDist = dist;
                    closest = { pipe, index: i };
                } else if (closest && pipe !== closest.pipe && !next) {
                    next = { pipe, index: i };
                }
            }
        }
        
        return { current: closest, next };
    }
    
    predictPipePosition(pipe, frames) {
        if (this.engine.score < 20) {
            return { 
                topHeight: pipe.topHeight, 
                bottomY: pipe.bottomY 
            };
        }
        
        const currentAmplitude = this.engine.getCurrentAmplitude();
        const currentMoveSpeed = this.engine.getCurrentMoveSpeed();
        const isNight = this.engine.isNightTime();
        const nightMultiplier = isNight ? 0.5 : 1.0;
        const effectiveAmplitude = currentAmplitude * nightMultiplier;
        const effectiveSpeed = currentMoveSpeed * nightMultiplier;
        const pipeSpeed = 2.2;
        const gapSize = pipe.bottomY - pipe.topHeight;
        
        const futureX = pipe.x - pipeSpeed * frames;
        const futurePhase = this.engine.pipeMovePhase + effectiveSpeed * 0.02 * frames;
        const predictedOffset = Math.sin(futurePhase + futureX * 0.01) * effectiveAmplitude;
        const predictedTopHeight = (pipe.baseTopHeight || pipe.topHeight) + predictedOffset;
        const predictedBottomY = predictedTopHeight + gapSize;
        
        if (predictedTopHeight < 50 || predictedBottomY > 550) {
            return { 
                topHeight: pipe.topHeight, 
                bottomY: pipe.bottomY 
            };
        }
        
        return { 
            topHeight: predictedTopHeight, 
            bottomY: predictedBottomY 
        };
    }
    
    needsEmergencyJump(y, vy, safeTop, safeBottom) {
        if (y > safeBottom && vy > 0) return true;
        if (y < 60 && vy <= 0) return true;
        return false;
    }
    
    checkObstacleCollisionAtTime(x, y, frame) {
        for (let obs of this.engine.obstacles) {
            const futureObsX = obs.x - obs.speed * frame;
            const futureObsY = obs.y;
            const dx = x - futureObsX;
            const dy = y - futureObsY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const safeDist = 14 + obs.size / 2 + 15;
            if (dist < safeDist) return true;
        }
        return false;
    }
    
    checkTrajectoryObstacles(startY, startVy, totalFrames, timings, jumpPower, gravity) {
        let y = startY;
        let vy = startVy;
        const birdStartX = this.engine.bird.x;
        
        for (let frame = 0; frame < totalFrames; frame++) {
            if (timings.includes(frame)) vy = jumpPower;
            vy += gravity;
            if (vy > 9) vy = 9;
            y += vy;
            y = Math.max(0, Math.min(600, y));
            
            if (this.checkObstacleCollisionAtTime(birdStartX, y, frame)) {
                return false;
            }
        }
        
        return true;
    }
    
    update() {
        if (!this.enabled || !this.engine.gameRunning) return;
        
        const { current, next } = this.findPipes();
        if (!current) return;
        
        const birdX = this.engine.bird.x;
        const birdRadius = this.engine.bird.radius;
        const pipe = current.pipe;
        const pipeRight = pipe.x + pipe.width;
        const birdClearedPipe = birdX - birdRadius > pipeRight + 10;
        
        if (birdClearedPipe) {
            this.framesSincePipePassed++;
        } else {
            this.framesSincePipePassed = 0;
        }
        
        if (birdClearedPipe && this.framesSincePipePassed >= this.pipeSwitchRequired && next) {
            this.currentPipe = next.pipe;
            this.nextPipe = null;
            this.bestPlan = null;
            this.framesSincePipePassed = 0;
            this.lastJumpFrame = performance.now();
        } else {
            this.currentPipe = current.pipe;
            this.nextPipe = next ? next.pipe : null;
        }
        
        if (!this.currentPipe) return;
        
        const bird = this.engine.bird;
        const pipeW = this.currentPipe.width;
        const isNight = this.engine.isNightTime();
        
        const distToPipeEnd = (this.currentPipe.x + pipeW) - birdX;
        const timeToPipe = Math.max(1, Math.min(40, Math.floor(distToPipeEnd / 2.2)));
        
        const predictedPipe = this.predictPipePosition(this.currentPipe, timeToPipe);
        
        const safetyMargin = isNight ? 4 : 6;
        const gapTop = predictedPipe.topHeight + birdRadius + safetyMargin;
        const gapBottom = predictedPipe.bottomY - birdRadius - safetyMargin;
        const gapCenter = (gapTop + gapBottom) / 2;
        const safeTop = gapTop;
        const safeBottom = gapBottom;
        const gapSize = safeBottom - safeTop;
        
        const obstaclesCount = this.engine.obstacles.length;
        const hasObstacles = obstaclesCount > 0 && !isNight;
        
        let shouldJump = false;
        let plan = null;
        
        if (this.needsEmergencyJump(bird.y, bird.vy, safeTop, safeBottom)) {
            shouldJump = true;
            plan = { reason: 'Emergency', finalInSafe: false, score: 0, totalPlans: 0 };
        } else {
            plan = this.findBestPlan(
                bird.y, bird.vy, timeToPipe, 
                safeTop, safeBottom, gapCenter, gapSize,
                hasObstacles
            );
            this.bestPlan = plan;
            shouldJump = plan && plan.actions && plan.actions[0] === 'jump';
        }
        
        if (shouldJump && this.canJump()) {
            this.engine.jump();
            this.lastJumpFrame = performance.now();
        }
    }
    
    findBestPlan(startY, startVy, totalFrames, safeTop, safeBottom, gapCenter, gapSize, hasObstacles) {
        const maxJumps = hasObstacles ? 5 : 3;
        const jumpPower = -5.4;
        const gravity = 0.2;
        const minJumpGap = hasObstacles ? 3 : 5;
        
        let bestPlan = null;
        let bestScore = -Infinity;
        let totalPlans = 0;
        const maxPlans = 150;
        
        for (let numJumps = 0; numJumps <= maxJumps; numJumps++) {
            if (totalPlans >= maxPlans) break;
            
            const jumpTimings = this.generateJumpTimings(numJumps, totalFrames, minJumpGap, maxPlans - totalPlans);
            
            for (const timings of jumpTimings) {
                totalPlans++;
                if (totalPlans > maxPlans) break;
                
                const safeFromObstacles = !hasObstacles || 
                    this.checkTrajectoryObstacles(startY, startVy, totalFrames, timings, jumpPower, gravity);
                
                const result = this.simulateWithJumps(
                    startY, startVy, totalFrames, timings, 
                    jumpPower, gravity, safeTop, safeBottom
                );
                
                let score = this.evaluatePlan(result, gapCenter, safeTop, safeBottom, gapSize);
                
                if (hasObstacles && !safeFromObstacles) score -= 3000;
                if (hasObstacles && safeFromObstacles) score += 1000;
                
                if (score > bestScore) {
                    bestScore = score;
                    
                    const actions = [];
                    for (let frame = 0; frame < totalFrames; frame++) {
                        actions.push(timings.includes(frame) ? 'jump' : 'wait');
                    }
                    
                    bestPlan = { actions, timings, finalY: result.finalY, finalInSafe: result.finalInSafe, score, totalPlans };
                }
            }
        }
        
        return bestPlan;
    }
    
    generateJumpTimings(numJumps, totalFrames, minGap, maxResults) {
        if (numJumps === 0) return [[]];
        if (maxResults <= 0) return [];
        
        const results = [];
        const maxCombinations = Math.min(maxResults, 50);
        
        const generate = (start, depth, current) => {
            if (results.length >= maxCombinations) return;
            if (depth === numJumps) { results.push([...current]); return; }
            
            const maxFrame = totalFrames - (numJumps - depth) * minGap;
            const step = Math.max(1, Math.floor((maxFrame - start) / 8));
            
            for (let frame = start; frame < maxFrame; frame += step) {
                if (results.length >= maxCombinations) return;
                current.push(frame);
                generate(frame + minGap, depth + 1, current);
                current.pop();
            }
        };
        
        generate(0, 0, []);
        return results;
    }
    
    simulateWithJumps(startY, startVy, totalFrames, jumpTimings, jumpPower, gravity, safeTop, safeBottom) {
        let y = startY;
        let vy = startVy;
        let minDistToCenter = Infinity;
        let timeInSafe = 0;
        let finalInSafe = false;
        const gapCenter = (safeTop + safeBottom) / 2;
        
        for (let frame = 0; frame < totalFrames; frame++) {
            if (jumpTimings.includes(frame)) vy = jumpPower;
            vy += gravity;
            if (vy > 9) vy = 9;
            y += vy;
            y = Math.max(0, Math.min(600, y));
            
            const inSafe = y >= safeTop && y <= safeBottom;
            if (inSafe) timeInSafe++;
            
            const dist = Math.abs(y - gapCenter);
            if (dist < minDistToCenter) minDistToCenter = dist;
            
            if (frame === totalFrames - 1) finalInSafe = inSafe;
        }
        
        return { finalY: y, finalVy: vy, finalInSafe, minDistToCenter, timeInSafe };
    }
    
    evaluatePlan(result, gapCenter, safeTop, safeBottom, gapSize) {
        let score = 0;
        
        if (result.finalInSafe) {
            score += 2500;
        } else {
            const distToSafe = result.finalY < safeTop ? safeTop - result.finalY : result.finalY - safeBottom;
            score -= distToSafe * 120;
        }
        
        score -= result.minDistToCenter * 5;
        score += result.timeInSafe * 15;
        
        const marginTop = result.finalY - safeTop;
        const marginBottom = safeBottom - result.finalY;
        if (result.finalInSafe && (marginTop < 8 || marginBottom < 8)) score -= 600;
        
        if (result.finalY < 25) score -= 1500;
        if (result.finalY > 575) score -= 1500;
        
        return score;
    }
    
    canJump() {
        const now = performance.now();
        const hasObstacles = this.engine.obstacles.length > 0;
        const effectiveCooldown = hasObstacles ? 1.5 * 16.67 : this.jumpCooldown * 16.67;
        
        if ((now - this.lastJumpFrame) < effectiveCooldown) return false;
        if (this.engine.bird.y < 30) return false;
        if (this.engine.bird.vy < -7) return false;
        return true;
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    getDebugInfo() { return this.debugInfo; }
    
    drawDebug(ctx, config) {
        if (!this.debugMode || !this.enabled) return;
        
        if (this.currentPipe) {
            const birdX = this.engine.bird.x;
            const info = this.debugInfo;
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.04)';
            ctx.fillRect(0, info.safeTop, config.W, info.safeBottom - info.safeTop);
        }
    }
}