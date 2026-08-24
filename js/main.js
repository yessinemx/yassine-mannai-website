/* ================================================================
   Network graph background — nodes drift and connect when close,
   echoing the dynamic dependence graphs used in the research.
   ================================================================ */
(function networkBackground() {
    const canvas = document.getElementById('net-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, nodes;
    const LINK_DIST = 150;
    const NODE_COUNT_DENSITY = 14000; // px^2 per node

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        const count = Math.max(24, Math.min(90, Math.floor((width * height) / NODE_COUNT_DENSITY)));
        nodes = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            r: Math.random() * 1.6 + 0.8,
        }));
    }

    function step() {
        ctx.clearRect(0, 0, width, height);

        for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > width) n.vx *= -1;
            if (n.y < 0 || n.y > height) n.vy *= -1;
        }

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < LINK_DIST) {
                    const alpha = (1 - dist / LINK_DIST) * 0.35;
                    ctx.strokeStyle = `rgba(94, 234, 212, ${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        for (const n of nodes) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(167, 139, 250, 0.55)';
            ctx.fill();
        }

        if (!prefersReducedMotion) requestAnimationFrame(step);
    }

    window.addEventListener('resize', resize);
    resize();
    step();
})();

/* ================================================================
   Mobile nav toggle
   ================================================================ */
(function navToggle() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
    });

    links.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => {
            links.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        })
    );
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
    });
})();

/* ================================================================
   Footer year
   ================================================================ */
document.getElementById('year').textContent = new Date().getFullYear();
