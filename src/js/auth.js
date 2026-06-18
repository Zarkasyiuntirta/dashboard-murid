import { loadDataFromFirestore, initDashboardEngine } from './dashboard.js';

// ================= ENGINE: 4D PARTICLES BACKGROUND =================
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
    if(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
    }
    update() {
        if (mouse.x !== null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 180) {
                this.x += dx * 0.02;
                this.y += dy * 0.02;
            }
        }
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

if(canvas) {
    for (let i = 0; i < 175; i++) particles.push(new Particle());
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

const loginCardWrapper = document.getElementById('loginCardWrapper');
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    let xAxis = (window.innerWidth / 2 - e.clientX) / 25;
    let yAxis = (window.innerHeight / 2 - e.clientY) / 25;
    if(loginCardWrapper) loginCardWrapper.style.transform = `rotateY(${-xAxis}deg) rotateX(${yAxis}deg)`;
});

// ================= VALIDASI LOGIN MATRIX =================
const authForm = document.getElementById('authForm');
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const flipInner = document.getElementById('flipCardInner');
    const errLabel = document.getElementById('loginError');

    if((user === 'admin' && pass === '13579') || (user === 'murid' && pass === '12345')) {
        errLabel.classList.add('hidden');
        flipInner.classList.add('flipped');

        // Ambil Data dari Firestore Cloud
        await loadDataFromFirestore();

        setTimeout(() => {
            document.getElementById('loginInterface').classList.add('hidden');
            document.getElementById('mainInterface').classList.remove('hidden');
            
            if(user === 'admin') {
                document.getElementById('roleBadge').innerText = "ADMIN ADMINISTRATOR";
                document.getElementById('btnNavData').classList.remove('hidden');
                document.getElementById('btnNavStudents').classList.remove('hidden');
                document.getElementById('btnNavSummary').classList.remove('hidden');
            } else if(user === 'murid') {
                document.getElementById('roleBadge').innerText = "STUDENT MODULE";
                document.getElementById('btnNavSummary').classList.remove('hidden');
                // FORCE HIDE: Sembunyikan paksa menu modifikasi jika login sebagai murid
                document.getElementById('btnNavData').classList.add('hidden');
                document.getElementById('btnNavStudents').classList.add('hidden');
            }
            initDashboardEngine();
        }, 1500);
    } else {
        errLabel.classList.remove('hidden');
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    document.getElementById('mainInterface').classList.add('hidden');
    document.getElementById('loginInterface').classList.remove('hidden');
    document.getElementById('flipCardInner').classList.remove('flipped');
    document.getElementById('authForm').reset();
});