/**
 * 波浪背景效果的原生 JavaScript 实现
 * 基于 React 组件转换，使用 Perlin 噪声算法和交互式动画
 */

console.log('🌊 新版 waves-background.js 文件已加载');

class Grad {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    dot2(x, y) {
        return this.x * x + this.y * y;
    }
}

class Noise {
    constructor(seed = 0) {
        this.grad3 = [
            new Grad(1, 1, 0),
            new Grad(-1, 1, 0),
            new Grad(1, -1, 0),
            new Grad(-1, -1, 0),
            new Grad(1, 0, 1),
            new Grad(-1, 0, 1),
            new Grad(1, 0, -1),
            new Grad(-1, 0, -1),
            new Grad(0, 1, 1),
            new Grad(0, -1, 1),
            new Grad(0, 1, -1),
            new Grad(0, -1, -1),
        ];
        
        this.p = [
            151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
            140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247,
            120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177,
            33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165,
            71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
            133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25,
            63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
            135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217,
            226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
            59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248,
            152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22,
            39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218,
            246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
            81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
            184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
            222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
        ];
        
        this.perm = new Array(512);
        this.gradP = new Array(512);
        this.seed(seed);
    }
    
    seed(seed) {
        if (seed > 0 && seed < 1) seed *= 65536;
        seed = Math.floor(seed);
        if (seed < 256) seed |= seed << 8;
        
        for (let i = 0; i < 256; i++) {
            let v = i & 1 ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
            this.perm[i] = this.perm[i + 256] = v;
            this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
        }
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }
    
    perlin2(x, y) {
        let X = Math.floor(x);
        let Y = Math.floor(y);
        x -= X;
        y -= Y;
        X &= 255;
        Y &= 255;
        
        const n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
        const n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
        const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
        const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);
        
        const u = this.fade(x);
        return this.lerp(
            this.lerp(n00, n10, u),
            this.lerp(n01, n11, u),
            this.fade(y)
        );
    }
}

class WavesBackground {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            lineColor: options.lineColor || 'rgba(255, 255, 255, 0.3)',
            backgroundColor: options.backgroundColor || 'transparent',
            waveSpeedX: options.waveSpeedX || 0.0125,
            waveSpeedY: options.waveSpeedY || 0.005,
            waveAmpX: options.waveAmpX || 32,
            waveAmpY: options.waveAmpY || 16,
            xGap: options.xGap || 10,
            yGap: options.yGap || 32,
            friction: options.friction || 0.925,
            tension: options.tension || 0.005,
            maxCursorMove: options.maxCursorMove || 100,
            ...options
        };
        
        this.canvas = null;
        this.ctx = null;
        this.bounding = { width: 0, height: 0, left: 0, top: 0 };
        this.noise = new Noise(Math.random());
        this.lines = [];
        this.mouse = {
            x: -10,
            y: 0,
            lx: 0,
            ly: 0,
            sx: 0,
            sy: 0,
            v: 0,
            vs: 0,
            a: 0,
            set: false
        };
        
        this.animationId = null;
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.setSize();
        this.setLines();
        this.bindEvents();
        this.startAnimation();
    }
    
    createCanvas() {
        // 创建鼠标跟随点
        this.cursorDot = document.createElement('div');
        this.cursorDot.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            pointer-events: none;
            transform: translate3d(-50%, -50%, 0);
            will-change: transform;
            z-index: 10;
        `;
        this.container.appendChild(this.cursorDot);
        
        // 创建 canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            display: block;
            width: 100%;
            height: 100%;
        `;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // 设置容器样式
        this.container.style.backgroundColor = this.options.backgroundColor;
    }
    
    setSize() {
        this.bounding = this.container.getBoundingClientRect();
        this.canvas.width = this.bounding.width;
        this.canvas.height = this.bounding.height;
    }
    
    setLines() {
        const { width, height } = this.bounding;
        this.lines = [];
        const oWidth = width + 200;
        const oHeight = height + 30;
        const totalLines = Math.ceil(oWidth / this.options.xGap);
        const totalPoints = Math.ceil(oHeight / this.options.yGap);
        const xStart = (width - this.options.xGap * totalLines) / 2;
        const yStart = (height - this.options.yGap * totalPoints) / 2;
        
        for (let i = 0; i <= totalLines; i++) {
            const pts = [];
            for (let j = 0; j <= totalPoints; j++) {
                pts.push({
                    x: xStart + this.options.xGap * i,
                    y: yStart + this.options.yGap * j,
                    wave: { x: 0, y: 0 },
                    cursor: { x: 0, y: 0, vx: 0, vy: 0 }
                });
            }
            this.lines.push(pts);
        }
    }
    
    movePoints(time) {
        this.lines.forEach((pts) => {
            pts.forEach((p) => {
                const move = this.noise.perlin2(
                    (p.x + time * this.options.waveSpeedX) * 0.002,
                    (p.y + time * this.options.waveSpeedY) * 0.0015
                ) * 12;
                
                p.wave.x = Math.cos(move) * this.options.waveAmpX;
                p.wave.y = Math.sin(move) * this.options.waveAmpY;
                
                const dx = p.x - this.mouse.sx;
                const dy = p.y - this.mouse.sy;
                const dist = Math.hypot(dx, dy);
                const l = Math.max(175, this.mouse.vs);
                
                if (dist < l) {
                    const s = 1 - dist / l;
                    const f = Math.cos(dist * 0.001) * s;
                    p.cursor.vx += Math.cos(this.mouse.a) * f * l * this.mouse.vs * 0.00065;
                    p.cursor.vy += Math.sin(this.mouse.a) * f * l * this.mouse.vs * 0.00065;
                }
                
                p.cursor.vx += (0 - p.cursor.x) * this.options.tension;
                p.cursor.vy += (0 - p.cursor.y) * this.options.tension;
                p.cursor.vx *= this.options.friction;
                p.cursor.vy *= this.options.friction;
                p.cursor.x += p.cursor.vx * 2;
                p.cursor.y += p.cursor.vy * 2;
                
                p.cursor.x = Math.min(
                    this.options.maxCursorMove,
                    Math.max(-this.options.maxCursorMove, p.cursor.x)
                );
                p.cursor.y = Math.min(
                    this.options.maxCursorMove,
                    Math.max(-this.options.maxCursorMove, p.cursor.y)
                );
            });
        });
    }
    
    moved(point, withCursor = true) {
        const x = point.x + point.wave.x + (withCursor ? point.cursor.x : 0);
        const y = point.y + point.wave.y + (withCursor ? point.cursor.y : 0);
        return { 
            x: Math.round(x * 10) / 10, 
            y: Math.round(y * 10) / 10 
        };
    }
    
    drawLines() {
        const { width, height } = this.bounding;
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.options.lineColor;
        this.ctx.lineWidth = 1;
        
        this.lines.forEach((points) => {
            let p1 = this.moved(points[0], false);
            this.ctx.moveTo(p1.x, p1.y);
            
            points.forEach((p, idx) => {
                const isLast = idx === points.length - 1;
                p1 = this.moved(p, !isLast);
                const p2 = this.moved(
                    points[idx + 1] || points[points.length - 1],
                    !isLast
                );
                this.ctx.lineTo(p1.x, p1.y);
                if (isLast) this.ctx.moveTo(p2.x, p2.y);
            });
        });
        
        this.ctx.stroke();
    }
    
    tick = (t) => {
        this.mouse.sx += (this.mouse.x - this.mouse.sx) * 0.1;
        this.mouse.sy += (this.mouse.y - this.mouse.sy) * 0.1;
        
        const dx = this.mouse.x - this.mouse.lx;
        const dy = this.mouse.y - this.mouse.ly;
        const d = Math.hypot(dx, dy);
        this.mouse.v = d;
        this.mouse.vs += (d - this.mouse.vs) * 0.1;
        this.mouse.vs = Math.min(100, this.mouse.vs);
        this.mouse.lx = this.mouse.x;
        this.mouse.ly = this.mouse.y;
        this.mouse.a = Math.atan2(dy, dx);
        
        // 更新鼠标跟随点位置
        this.cursorDot.style.transform = `translate3d(${this.mouse.sx - 4}px, ${this.mouse.sy - 4}px, 0)`;
        
        this.movePoints(t);
        this.drawLines();
        this.animationId = requestAnimationFrame(this.tick);
    }
    
    startAnimation() {
        this.animationId = requestAnimationFrame(this.tick);
    }
    
    bindEvents() {
        this.onResize = () => {
            this.setSize();
            this.setLines();
        };
        
        this.onMouseMove = (e) => {
            this.updateMouse(e.pageX, e.pageY);
        };
        
        this.onTouchMove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.updateMouse(touch.clientX, touch.clientY);
        };
        
        window.addEventListener('resize', this.onResize);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    }
    
    updateMouse(x, y) {
        this.mouse.x = x - this.bounding.left;
        this.mouse.y = y - this.bounding.top + window.scrollY;
        
        if (!this.mouse.set) {
            this.mouse.sx = this.mouse.x;
            this.mouse.sy = this.mouse.y;
            this.mouse.lx = this.mouse.x;
            this.mouse.ly = this.mouse.y;
            this.mouse.set = true;
        }
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('touchmove', this.onTouchMove);
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// 将 WavesBackground 类挂载到全局 window 对象
window.WavesBackground = WavesBackground;
console.log('✅ 新版 WavesBackground 类已挂载到 window 对象');