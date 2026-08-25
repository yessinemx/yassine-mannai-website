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
   Trading floor clocks — live local time and session state for the
   main exchanges, drawn into the background layer.
   ================================================================ */
(function marketClocks() {
    const host = document.getElementById('mkt-clocks');
    if (!host || typeof Intl === 'undefined' || !Intl.DateTimeFormat) return;

    // Cash-session hours in each exchange's own local time, in minutes.
    const MARKETS = [
        { city: 'New York', tz: 'America/New_York', open: 9 * 60 + 30, close: 16 * 60 },
        { city: 'London', tz: 'Europe/London', open: 8 * 60, close: 16 * 60 + 30 },
        { city: 'Paris', tz: 'Europe/Paris', open: 9 * 60, close: 17 * 60 + 30 },
        { city: 'Hong Kong', tz: 'Asia/Hong_Kong', open: 9 * 60 + 30, close: 16 * 60, break: [12 * 60, 13 * 60] },
    ];

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pad = (n) => String(n).padStart(2, '0');

    function localParts(tz, date) {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz, weekday: 'short', hourCycle: 'h23',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
        return {
            day: DAYS.indexOf(parts.weekday),
            h: +parts.hour % 24,
            m: +parts.minute,
            s: +parts.second,
        };
    }

    function offsetLabel(tz, date) {
        try {
            const name = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'shortOffset' })
                .formatToParts(date).find((p) => p.type === 'timeZoneName');
            return name ? name.value.replace('GMT', 'UTC').replace('-', '−') : '';
        } catch (e) {
            return '';
        }
    }

    // Minutes from `min` on weekday `day` until the next weekday open.
    function untilOpen(day, min, openMin) {
        let delta = openMin - min;
        let d = day;
        if (delta <= 0) { delta += 1440; d = (d + 1) % 7; }
        while (d === 0 || d === 6) { delta += 1440; d = (d + 1) % 7; }
        return delta;
    }

    function countdown(mins) {
        const h = Math.floor(mins / 60);
        if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
        return h ? `${h}h ${Math.round(mins % 60)}m` : `${Math.max(1, Math.round(mins))}m`;
    }

    function status(mkt, t) {
        const min = t.h * 60 + t.m + t.s / 60;
        const weekday = t.day >= 1 && t.day <= 5;
        const progress = Math.min(1, Math.max(0, (min - mkt.open) / (mkt.close - mkt.open)));

        if (weekday && min >= mkt.open && min < mkt.close) {
            if (mkt.break && min >= mkt.break[0] && min < mkt.break[1]) {
                return { cls: 'is-break', label: `Lunch · back in ${countdown(mkt.break[1] - min)}`, progress };
            }
            return { cls: 'is-open', label: `Open · ${countdown(mkt.close - min)} left`, progress };
        }
        return { cls: '', label: `Closed · opens in ${countdown(untilOpen(t.day, min, mkt.open))}`, progress: 0 };
    }

    const rows = MARKETS.map((mkt) => {
        const li = document.createElement('li');
        li.className = 'mkt';
        li.innerHTML =
            '<span class="mkt-city"></span>' +
            '<span class="mkt-zone"></span>' +
            '<span class="mkt-time"><span class="hm"></span><span class="sec"></span></span>' +
            '<span class="mkt-bar"><i></i></span>' +
            '<span class="mkt-state"></span>';
        li.querySelector('.mkt-city').textContent = mkt.city;
        host.appendChild(li);
        return {
            mkt, li,
            zone: li.querySelector('.mkt-zone'),
            hm: li.querySelector('.hm'),
            sec: li.querySelector('.sec'),
            bar: li.querySelector('.mkt-bar i'),
            state: li.querySelector('.mkt-state'),
        };
    });

    function tick() {
        const now = new Date();
        rows.forEach((row) => {
            const t = localParts(row.mkt.tz, now);
            const st = status(row.mkt, t);
            row.hm.textContent = `${pad(t.h)}:${pad(t.m)}`;
            row.sec.textContent = `:${pad(t.s)}`;
            row.zone.textContent = offsetLabel(row.mkt.tz, now);
            row.state.textContent = st.label;
            row.bar.style.width = (st.progress * 100).toFixed(1) + '%';
            row.li.classList.toggle('is-open', st.cls === 'is-open');
            row.li.classList.toggle('is-break', st.cls === 'is-break');
        });
    }

    let timer = null;
    function run() {
        clearInterval(timer);
        tick();
        if (!document.hidden) timer = setInterval(tick, 1000);
    }
    document.addEventListener('visibilitychange', run);
    run();
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
   Project filters — topic chips over the projects list
   ================================================================ */
(function projectFilters() {
    const bar = document.getElementById('pub-filters');
    const list = document.getElementById('pub-list');
    if (!bar || !list) return;

    const pubs = Array.from(list.querySelectorAll('.pub'));
    const buttons = Array.from(bar.querySelectorAll('.pub-filter'));
    const topics = (el) => (el.dataset.topic || '').split(' ');

    // Counts live in the markup so they render without JS, but recount here
    // so they can never drift from the list itself.
    buttons.forEach((btn) => {
        const f = btn.dataset.filter;
        const n = f === 'all' ? pubs.length : pubs.filter((p) => topics(p).includes(f)).length;
        const slot = btn.querySelector('i');
        if (slot) slot.textContent = n;
    });

    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('.pub-filter');
        if (!btn) return;
        const f = btn.dataset.filter;
        buttons.forEach((b) => {
            const on = b === btn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        pubs.forEach((p) => p.classList.toggle('is-hidden', f !== 'all' && !topics(p).includes(f)));
    });
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
