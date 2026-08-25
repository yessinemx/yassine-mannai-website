/* ================================================================
   Vercel Speed Insights initialization
   ================================================================ */
import { injectSpeedInsights } from './vendor/speed-insights.js';

// Initialize Speed Insights when the page loads
if (typeof injectSpeedInsights === 'function') {
    injectSpeedInsights();
}

/* ================================================================
   Market line background — a slow scrolling price path over a faint
   grid, echoing the markets rather than a starfield.
   ================================================================ */
(function marketBackground() {
    const canvas = document.getElementById('net-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const STEP = 46;   // px between price points
    const SPEED = 0.35; // px per frame
    let width, height, pts, offset = 0, running = false;

    const clampY = (y) => Math.max(height * 0.22, Math.min(height * 0.82, y));
    const nextY = (prev) => clampY(prev + (Math.random() - 0.5) * height * 0.14);

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        const need = Math.ceil(width / STEP) + 4;
        if (!pts) {
            pts = [];
            let y = height * 0.55;
            for (let i = 0; i < need; i++) { pts.push(y); y = nextY(y); }
        } else {
            while (pts.length < need) pts.push(nextY(pts[pts.length - 1]));
        }
    }

    function tracePath() {
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const x = i * STEP - offset;
            if (i === 0) ctx.moveTo(x, pts[i]);
            else ctx.lineTo(x, pts[i]);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.lineJoin = 'round';

        // faint horizontal grid
        ctx.strokeStyle = 'rgba(27, 35, 51, 0.06)';
        ctx.lineWidth = 1;
        const rows = 6;
        for (let i = 1; i < rows; i++) {
            const y = (height / rows) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // area under the line
        tracePath();
        ctx.lineTo((pts.length - 1) * STEP - offset, height);
        ctx.lineTo(-offset, height);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(15, 118, 110, 0.12)');
        grad.addColorStop(1, 'rgba(15, 118, 110, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // the price line
        tracePath();
        ctx.strokeStyle = 'rgba(15, 118, 110, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function step() {
        offset += SPEED;
        if (offset >= STEP) {
            offset -= STEP;
            pts.shift();
            pts.push(nextY(pts[pts.length - 1]));
        }
        draw();
        if (!prefersReducedMotion && !document.hidden) requestAnimationFrame(step);
        else running = false;
    }

    function start() {
        if (!running && !prefersReducedMotion && !document.hidden) {
            running = true;
            requestAnimationFrame(step);
        }
    }

    window.addEventListener('resize', resize);
    // Pause the loop while the tab is hidden to save battery/CPU.
    document.addEventListener('visibilitychange', start);
    resize();
    start();
    if (prefersReducedMotion) draw();
})();

/* ================================================================
   Mobile nav toggle
   ================================================================ */
(function navToggle() {
    const toggle = document.getElementById('nav-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
        const open = sidebar.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
    });

    sidebar.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => {
            sidebar.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        })
    );
})();

/* ================================================================
   Scroll spy — highlight the active section in the sidebar nav
   ================================================================ */
(function scrollSpy() {
    const links = Array.from(document.querySelectorAll('.sidebar-nav a'));
    if (!('IntersectionObserver' in window) || !links.length) return;

    const map = new Map();
    links.forEach((a) => {
        const sec = document.getElementById(a.getAttribute('href').slice(1));
        if (sec) map.set(sec, a);
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    links.forEach((l) => l.classList.remove('active'));
                    const active = map.get(entry.target);
                    if (active) active.classList.add('active');
                }
            });
        },
        { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    map.forEach((_, sec) => observer.observe(sec));
})();

/* ================================================================
   Scroll reveal
   ================================================================ */
(function scrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
        els.forEach((el) => el.classList.add('is-visible'));
        return;
    }
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
})();

/* ================================================================
   Back-to-top button
   ================================================================ */
(function backToTop() {
    const btn = document.getElementById('to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
})();

/* ================================================================
   Scroll progress bar
   ================================================================ */
(function scrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    const update = () => {
        const el = document.documentElement;
        const max = el.scrollHeight - el.clientHeight;
        bar.style.width = max > 0 ? (el.scrollTop / max) * 100 + '%' : '0%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
})();

/* ================================================================
   Quiz — "How well do you know me?"
   ================================================================ */
(function quiz() {
    const app = document.getElementById('quiz-app');
    if (!app) return;
    const questions = Array.from(app.querySelectorAll('.quiz-q'));
    const result = document.getElementById('quiz-result');
    let answered = 0;
    let score = 0;

    const verdict = (s, total) => {
        if (s === total) return 'you basically know me.';
        if (s >= Math.ceil(total * 0.6)) return 'pretty good!';
        if (s >= 1) return 'we should talk more.';
        return 'ouch — let\u2019s grab a coffee.';
    };

    questions.forEach((q) => {
        const answer = q.dataset.answer;
        const opts = Array.from(q.querySelectorAll('.quiz-opt'));
        opts.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (q.classList.contains('done')) return;
                q.classList.add('done');
                const picked = btn.textContent.trim();
                if (picked === answer) score++;
                else btn.classList.add('wrong');
                opts.forEach((b) => {
                    if (b.textContent.trim() === answer) b.classList.add('correct');
                    b.disabled = true;
                });
                answered++;
                if (answered === questions.length && result) {
                    result.hidden = false;
                    result.textContent = `You scored ${score}/${questions.length} — ${verdict(score, questions.length)}`;
                }
            });
        });
    });
})();

/* ================================================================
   Footer year
   ================================================================ */
document.getElementById('year').textContent = new Date().getFullYear();
