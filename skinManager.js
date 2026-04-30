const skins = {
    classic: { bodyColor1: '#f5cf5e', bodyColor2: '#e0a800', eyeColor: '#010101', beakColor: '#e07a2c', crestColor: '#dbb42c' },
    red: { bodyColor1: '#ff6b6b', bodyColor2: '#cc3333', eyeColor: '#010101', beakColor: '#ff9933', crestColor: '#ff4444' },
    blue: { bodyColor1: '#6ba5ff', bodyColor2: '#3366cc', eyeColor: '#010101', beakColor: '#ffaa33', crestColor: '#4488ff' },
    green: { bodyColor1: '#6bff8b', bodyColor2: '#33cc55', eyeColor: '#010101', beakColor: '#ffaa33', crestColor: '#44ff66' },
    purple: { bodyColor1: '#c96bff', bodyColor2: '#8833cc', eyeColor: '#010101', beakColor: '#ffcc44', crestColor: '#bb55ff' },
    gold: { bodyColor1: '#ffd700', bodyColor2: '#ffaa00', eyeColor: '#8b4513', beakColor: '#ff6600', crestColor: '#ffcc33' }
};

let currentSkin = 'classic';
let customSkinImage = null;
let customSkinLoaded = false;

let wingAngle = 0;
let wingDirection = 1;
let isFlapping = false;
let flapTimer = 0;

function updateWingAngle() {
    if (isFlapping) {
        wingAngle = Math.sin(flapTimer * 0.03) * 1.4;
        flapTimer++;
        if (flapTimer > 55) {
            isFlapping = false;
            flapTimer = 0;
        }
    } else {
        wingAngle += 0.025 * wingDirection;
        if (wingAngle > 0.5) {
            wingAngle = 0.5;
            wingDirection = -1;
        } else if (wingAngle < -0.5) {
            wingAngle = -0.5;
            wingDirection = 1;
        }
    }
}

function triggerWingFlap() {
    isFlapping = true;
    flapTimer = 0;
    wingAngle = 0.9;
}

function resetWingFlap() {
    isFlapping = false;
    flapTimer = 0;
    wingAngle = 0;
    wingDirection = 1;
}

window.drawBird = function(state) {
    const { bird, gameRunning, isPaused, ctx, config } = state;
    if (!ctx || !config) return;
    
    updateWingAngle();
    
    let currentWingAngle = wingAngle;
    if (!gameRunning || isPaused) currentWingAngle = -0.3;
    
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.translate(bird.x, bird.y);
    
    if (customSkinLoaded && customSkinImage) {
        ctx.beginPath();
        ctx.arc(0, 0, config.BIRD_RADIUS - 1, 0, Math.PI * 2);
        ctx.save();
        ctx.clip();
        ctx.drawImage(customSkinImage, -config.BIRD_RADIUS + 1, -config.BIRD_RADIUS + 1, 
                     (config.BIRD_RADIUS - 1) * 2, (config.BIRD_RADIUS - 1) * 2);
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(5, -4, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -4.5, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#010101';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(11, -3);
        ctx.lineTo(18, -2);
        ctx.lineTo(11, 0);
        ctx.fillStyle = '#e07a2c';
        ctx.fill();
        
        ctx.save();
        ctx.rotate(currentWingAngle);
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.quadraticCurveTo(-16, -10, -11, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();
        ctx.restore();
    } else {
        const skin = skins[currentSkin];
        
        ctx.beginPath();
        ctx.ellipse(0, -1, config.BIRD_RADIUS - 1, config.BIRD_RADIUS, 0, 0, Math.PI * 2);
        ctx.fillStyle = skin.bodyColor1;
        ctx.fill();
        ctx.strokeStyle = skin.bodyColor2;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.lineTo(12, -5);
        ctx.lineTo(6, -3);
        ctx.fillStyle = skin.beakColor;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(5, -6, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5.8, -6.5, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = skin.eyeColor;
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-4, -13);
        ctx.lineTo(-1, -19);
        ctx.lineTo(3, -14);
        ctx.fillStyle = skin.crestColor;
        ctx.fill();
        
        ctx.save();
        ctx.rotate(currentWingAngle);
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.quadraticCurveTo(-16, -10, -11, 4);
        ctx.fillStyle = skin.bodyColor2;
        ctx.fill();
        ctx.restore();
    }
    
    ctx.restore();
};

function changeSkin(skinName) {
    if (skins[skinName]) {
        currentSkin = skinName;
        customSkinLoaded = false;
        customSkinImage = null;
        updateActiveSkinUI(skinName);
    }
}

function loadCustomSkin(file) {
    if (!file.type.match('image.*')) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            customSkinImage = img;
            customSkinLoaded = true;
            currentSkin = 'custom';
            updateActiveSkinUI(null);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateActiveSkinUI(skinName) {
    document.querySelectorAll('.skin-btn, .gameover-skin-btn').forEach(btn => {
        const skin = btn.getAttribute('data-skin');
        if (skinName && skin === skinName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function initSkinUI() {
    document.querySelectorAll('.skin-btn, .gameover-skin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const skinName = btn.getAttribute('data-skin');
            if (skinName) changeSkin(skinName);
        });
    });
    
    const fileInput = document.getElementById('customSkin');
    const fileInputGameover = document.getElementById('customSkinGameover');
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) loadCustomSkin(e.target.files[0]);
        });
    }
    
    if (fileInputGameover) {
        fileInputGameover.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) loadCustomSkin(e.target.files[0]);
        });
    }
    
    updateActiveSkinUI('classic');
}

window.triggerWingFlap = triggerWingFlap;
window.resetWingFlap = resetWingFlap;

document.addEventListener('DOMContentLoaded', () => {
    initSkinUI();
});