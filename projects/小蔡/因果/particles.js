// NEUXA 特效引擎 v1.1 - 業力餘燼（低負載版）
const initParticles = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const particleCount = isMobile ? 42 : 100;

    const canvas = document.createElement('canvas');
    canvas.id = 'particleCanvas';
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1500; mix-blend-mode:screen; opacity:0.6;';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let rafId = 0;
    let running = true;
    const particles = [];

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 100;
            this.size = Math.random() * 4 + 1;
            this.speedY = Math.random() * 1.5 + 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        update() {
            this.y -= this.speedY;
            if (this.y < -100) this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(196, 30, 58, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i += 1) particles.push(new Particle());

    function animate() {
        if (!running) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p) => { p.update(); p.draw(); });
        rafId = requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            running = false;
            cancelAnimationFrame(rafId);
            return;
        }
        if (!running) {
            running = true;
            animate();
        }
    });
};

function startParticlesWhenIdle() {
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => initParticles(), { timeout: 1200 });
        return;
    }
    setTimeout(initParticles, 180);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startParticlesWhenIdle);
} else {
    startParticlesWhenIdle();
}
