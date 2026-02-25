class ParticlesBackground {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id "${canvasId}" not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: 0, y: 0, radius: 250 };
        this.animationFrameId = null;

        this.resize();
        this.animate();

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        // Responsive to site theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                    // Theme changed, colors will be updated in next animate frame
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    }

    isDark() {
        return document.documentElement.classList.contains('dark');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const numberOfParticles = (this.canvas.width * this.canvas.height) / 12000;
        for (let i = 0; i < numberOfParticles; i++) {
            this.particles.push(new Particle(this.canvas));
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const isDark = this.isDark();

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    const mdx = this.mouse.x - (this.particles[i].x + this.particles[j].x) / 2;
                    const mdy = this.mouse.y - (this.particles[i].y + this.particles[j].y) / 2;
                    const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                    const mouseFactor = mDist < this.mouse.radius ? 1.5 : 1;

                    this.ctx.beginPath();
                    const color = isDark ? '200, 200, 200' : '80, 80, 80';
                    const opacity = isDark ? 0.15 : 0.25;
                    this.ctx.strokeStyle = `rgba(${color}, ${opacity * (1 - distance / 120) * mouseFactor})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }

        this.particles.forEach(p => {
            p.update(this.mouse);
            p.draw(this.ctx, isDark);
        });

        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
}

class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 1.5 + 0.5;
    }

    update(mouse) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            this.x -= Math.cos(angle) * force * 1.5;
            this.y -= Math.sin(angle) * force * 1.5;
        }
    }

    draw(ctx, isDark) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(200, 200, 200, 0.3)' : 'rgba(80, 80, 80, 0.4)';
        ctx.fill();
    }
}

window.ParticlesBackground = ParticlesBackground;
