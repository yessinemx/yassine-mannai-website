/* ================================================================
   Monte Carlo background — geometric Brownian motion paths fanning out
   from a common origin, with the analytic ±1σ cone. Scrolling advances
   the simulation clock, so moving down the page moves forward in time.
   ================================================================ */
(function monteCarloBackground() {
    const canvas = document.getElementById('net-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const PATHS = 8;
    const STEPS = 260;
    const PX_PER_STEP = 11;
    const MU = 0.08;      // drift
    const SIGMA = 0.55;   // vol
    const DT = 1 / 120;

    let width, height, paths, running = false;
    let drift = 0, scrollShift = 0;

    // Box-Muller standard normal
    function gauss() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function simulate() {
        paths = [];
        for (let p = 0; p < PATHS; p++) {
            const s = [1];
            for (let i = 1; i < STEPS; i++) {
                s.push(s[i - 1] * Math.exp((MU - 0.5 * SIGMA * SIGMA) * DT + SIGMA * Math.sqrt(DT) * gauss()));
            }
            paths.push(s);
        }
    }

    const Y = (v) => height * 0.5 - Math.log(v) * height * 0.28;
    const X = (i) => i * PX_PER_STEP - drift - scrollShift;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function updateScroll() {
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, window.scrollY / max));
        const travel = Math.max(0, STEPS * PX_PER_STEP - width);
        scrollShift = progress * travel;
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.lineJoin = 'round';

        // faint horizontal grid
        ctx.strokeStyle = 'rgba(27, 35, 51, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
            const y = (height / 6) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // analytic ±1σ cone: log S_t ~ N((mu - sigma²/2)t, sigma²t)
        ctx.beginPath();
        for (let i = 0; i < STEPS; i++) {
            const t = i * DT;
            const up = Math.exp((MU - 0.5 * SIGMA * SIGMA) * t + SIGMA * Math.sqrt(t));
            i === 0 ? ctx.moveTo(X(i), Y(up)) : ctx.lineTo(X(i), Y(up));
        }
        for (let i = STEPS - 1; i >= 0; i--) {
            const t = i * DT;
            const dn = Math.exp((MU - 0.5 * SIGMA * SIGMA) * t - SIGMA * Math.sqrt(t));
            ctx.lineTo(X(i), Y(dn));
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(15, 118, 110, 0.07)';
        ctx.fill();

        // simulated paths
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(15, 118, 110, 0.22)';
        paths.forEach((s, p) => {
            if (p === 0) return;
            ctx.beginPath();
            for (let i = 0; i < STEPS; i++) {
                i === 0 ? ctx.moveTo(X(i), Y(s[i])) : ctx.lineTo(X(i), Y(s[i]));
            }
            ctx.stroke();
        });

        // one highlighted "realised" path
        ctx.beginPath();
        const lead = paths[0];
        for (let i = 0; i < STEPS; i++) {
            i === 0 ? ctx.moveTo(X(i), Y(lead[i])) : ctx.lineTo(X(i), Y(lead[i]));
        }
        ctx.strokeStyle = 'rgba(15, 118, 110, 0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // expected value line
        ctx.beginPath();
        for (let i = 0; i < STEPS; i++) {
            const m = Math.exp((MU - 0.5 * SIGMA * SIGMA) * i * DT);
            i === 0 ? ctx.moveTo(X(i), Y(m)) : ctx.lineTo(X(i), Y(m));
        }
        ctx.strokeStyle = 'rgba(109, 40, 217, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function step() {
        drift += 0.12;
        // loop the auto-drift so the fan never runs off screen
        if (drift > PX_PER_STEP * 40) drift = 0;
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

    let queued = false;
    window.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            updateScroll();
            if (prefersReducedMotion) draw();
        });
    }, { passive: true });

    window.addEventListener('resize', () => { resize(); updateScroll(); if (prefersReducedMotion) draw(); });
    document.addEventListener('visibilitychange', start);

    resize();
    simulate();
    updateScroll();
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
        { code: 'NYC', city: 'New York', tz: 'America/New_York', open: 9 * 60 + 30, close: 16 * 60 },
        { code: 'LDN', city: 'London', tz: 'Europe/London', open: 8 * 60, close: 16 * 60 + 30 },
        { code: 'PAR', city: 'Paris', tz: 'Europe/Paris', open: 9 * 60, close: 17 * 60 + 30 },
        { code: 'HKG', city: 'Hong Kong', tz: 'Asia/Hong_Kong', open: 9 * 60 + 30, close: 16 * 60, break: [12 * 60, 13 * 60] },
    ];

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (y, mo, d) => `${y}-${pad(mo)}-${pad(d)}`;

    // Exchange trading holidays in local dates (YYYY-MM-DD). Curated — refresh yearly.
    // Weekends and daylight saving are handled automatically via the IANA time zones.
    const HOLIDAYS = {
        NYC: new Set([
            '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
            '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
            '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
            '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
        ]),
        LDN: new Set([
            '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25',
            '2026-08-31', '2026-12-25', '2026-12-28',
            '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31',
            '2027-08-30', '2027-12-27', '2027-12-28',
        ]),
        PAR: new Set([
            '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-12-25',
            '2027-01-01', '2027-03-26', '2027-03-29',
        ]),
        // Hong Kong mixes lunar dates — best-effort, verify each year.
        HKG: new Set([
            '2026-01-01', '2026-02-17', '2026-02-18', '2026-02-19', '2026-04-03',
            '2026-04-06', '2026-05-01', '2026-06-19', '2026-07-01', '2026-10-01',
            '2026-10-19', '2026-12-25', '2026-12-28',
            '2027-01-01', '2027-03-26', '2027-03-29', '2027-07-01', '2027-10-01',
            '2027-12-27', '2027-12-28',
        ]),
    };

    function isTradingDate(code, y, mo, d) {
        const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
        if (dow === 0 || dow === 6) return false;
        const set = HOLIDAYS[code];
        return !(set && set.has(iso(y, mo, d)));
    }

    function isHolidayToday(mkt, t) {
        const set = HOLIDAYS[mkt.code];
        return t.day >= 1 && t.day <= 5 && !!set && set.has(iso(t.Y, t.Mo, t.D));
    }

    function localParts(tz, date) {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
            hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
        return {
            day: DAYS.indexOf(parts.weekday),
            Y: +parts.year, Mo: +parts.month, D: +parts.day,
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

    // Minutes until the next open, skipping weekends and holidays via the local calendar.
    function minutesUntilOpen(mkt, t) {
        const min = t.h * 60 + t.m + t.s / 60;
        for (let k = 0; k < 14; k++) {
            const cur = new Date(Date.UTC(t.Y, t.Mo - 1, t.D + k));
            if (isTradingDate(mkt.code, cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate())) {
                if (k === 0) {
                    if (min < mkt.open) return mkt.open - min;
                } else {
                    return k * 1440 - min + mkt.open;
                }
            }
        }
        return 0;
    }

    function countdown(mins) {
        const h = Math.floor(mins / 60);
        if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
        return h ? `${h}h ${Math.round(mins % 60)}m` : `${Math.max(1, Math.round(mins))}m`;
    }

    function status(mkt, t) {
        const min = t.h * 60 + t.m + t.s / 60;
        const holiday = isHolidayToday(mkt, t);
        const weekday = t.day >= 1 && t.day <= 5 && !holiday;
        const progress = Math.min(1, Math.max(0, (min - mkt.open) / (mkt.close - mkt.open)));

        if (weekday && min >= mkt.open && min < mkt.close) {
            if (mkt.break && min >= mkt.break[0] && min < mkt.break[1]) {
                return { cls: 'is-break', label: `Lunch · back in ${countdown(mkt.break[1] - min)}`, progress };
            }
            return { cls: 'is-open', label: `Open · ${countdown(mkt.close - min)} left`, progress };
        }
        const prefix = holiday ? 'Holiday' : 'Closed';
        return { cls: '', label: `${prefix} · opens in ${countdown(minutesUntilOpen(mkt, t))}`, progress: 0 };
    }

    const rows = MARKETS.map((mkt) => {
        const li = document.createElement('li');
        li.className = 'mkt';
        li.innerHTML =
            '<span class="mkt-city"><span class="full"></span><span class="code"></span></span>' +
            '<span class="mkt-zone"></span>' +
            '<span class="mkt-time"><span class="hm"></span><span class="sec"></span></span>' +
            '<span class="mkt-bar"><i></i></span>' +
            '<span class="mkt-state"></span>';
        li.querySelector('.full').textContent = mkt.city;
        li.querySelector('.code').textContent = mkt.code;
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
            const zone = offsetLabel(row.mkt.tz, now);
            row.zone.textContent = zone;
            row.state.textContent = st.label;
            // Also a tooltip, for the compact bottom-bar layout that hides the status.
            row.li.title = `${row.mkt.city} (${zone}) — ${st.label}`;
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
   Nav rail — a chart-axis marker that tracks reading position
   ================================================================ */
(function navRail() {
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll('a'));
    const sections = links.map((a) => document.querySelector(a.getAttribute('href')));
    if (!links.length || sections.some((s) => !s)) return;

    const top = (el) => el.getBoundingClientRect().top + window.scrollY;
    let queued = false;

    function update() {
        queued = false;
        const probe = window.scrollY + window.innerHeight * 0.4;

        let i = 0;
        for (let k = 0; k < sections.length; k++) {
            if (top(sections[k]) <= probe) i = k;
        }

        // how far we are through the current section, 0..1
        const start = top(sections[i]);
        const end = sections[i + 1] ? top(sections[i + 1]) : document.documentElement.scrollHeight;
        const frac = Math.min(Math.max((probe - start) / Math.max(end - start, 1), 0), 1);

        // interpolate between the matching nav item centres so the marker lines up with the labels
        const navTop = nav.getBoundingClientRect().top;
        const centre = (el) => el.getBoundingClientRect().top - navTop + el.offsetHeight / 2;
        const from = centre(links[i]);
        const to = links[i + 1] ? centre(links[i + 1]) : from;
        const y = from + (to - from) * frac;

        nav.style.setProperty('--nav-progress', ((y / nav.offsetHeight) * 100).toFixed(2) + '%');
    }

    window.addEventListener(
        'scroll',
        () => {
            if (!queued) {
                queued = true;
                requestAnimationFrame(update);
            }
        },
        { passive: true }
    );
    window.addEventListener('resize', update);
    update();
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

    // siblings inside a grid/list cascade instead of all appearing at once
    const STAGGER_PARENTS = '.research-grid, .pub-list, .timeline, .skills-grid, .events-grid';
    document.querySelectorAll(STAGGER_PARENTS).forEach((parent) => {
        Array.from(parent.children)
            .filter((kid) => kid.classList.contains('reveal'))
            .forEach((kid, i) => {
                kid.style.setProperty('--reveal-delay', Math.min(i * 80, 400) + 'ms');
            });
    });

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
    const cta = document.getElementById('quiz-cta');
    const ctaLine = document.getElementById('quiz-cta-line');
    const mailLink = document.getElementById('quiz-mail');
    const coffeeLink = document.getElementById('quiz-coffee');
    let answered = 0;
    let score = 0;

    const verdict = (s, total) => {
        if (s === total) return 'you basically know me.';
        if (s >= Math.ceil(total * 0.6)) return 'pretty good!';
        if (s >= 1) return 'we should talk more.';
        return 'ouch — not a single one.';
    };

    // Every score, brilliant or catastrophic, ends at the same coffee.
    const invitation = (s, total) => {
        if (s === total) {
            return 'Flawless. Either we have already met, or you have read this page far too closely '
                + '— both are grounds for a coffee, and I am buying.';
        }
        if (s >= Math.ceil(total * 0.6)) {
            const missed = total - s;
            if (missed === 1) {
                return 'So close. The one you missed is exactly the one that needs context, '
                    + 'and context is best delivered over an espresso.';
            }
            return `Solid. The ${missed} you missed are exactly the ones that need context, `
                + 'and context is best delivered over an espresso.';
        }
        if (s >= 1) {
            return 'A respectable start. The rest of my personality does not fit into multiple choice, '
                + 'so let us do this properly — coffee, or a call.';
        }
        return `Zero out of ${total}. Statistically, that takes real commitment, and commitment `
            + 'deserves a coffee. First round on me.';
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
                    const total = questions.length;
                    result.hidden = false;
                    result.textContent = `You scored ${score}/${total} — ${verdict(score, total)}`;
                    if (cta && ctaLine) {
                        ctaLine.textContent = invitation(score, total);
                        // Carry the score into the message so the opening line writes itself.
                        const opener = `Hi Yassine — I scored ${score}/${total} on your quiz.`;
                        if (mailLink) {
                            mailLink.href = 'mailto:contact@yassinemannai.com?subject='
                                + encodeURIComponent(`I scored ${score}/${total} on your quiz`);
                        }
                        if (coffeeLink) {
                            coffeeLink.href = 'https://wa.me/33623643180?text='
                                + encodeURIComponent(`${opener} Coffee?`);
                        }
                        cta.hidden = false;
                    }
                }
            });
        });
    });
})();

/* ================================================================
   Live market ticker — popular crypto (CoinGecko) and FX rates with
   daily change (ECB via Frankfurter, er-api fallback). No keys.
   ================================================================ */
(function marketTicker() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    const COINS = [
        { id: 'bitcoin', sym: 'BTC' },
        { id: 'ethereum', sym: 'ETH' },
        { id: 'solana', sym: 'SOL' },
        { id: 'ripple', sym: 'XRP' },
        { id: 'binancecoin', sym: 'BNB' },
    ];
    const cryptoUrl = 'https://api.coingecko.com/api/v3/simple/price?ids='
        + COINS.map((c) => c.id).join(',') + '&vs_currencies=usd&include_24hr_change=true';
    // currency-api (fawazahmed0) via jsDelivr CDN — CORS-safe, daily history
    const fxLatestUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json';
    const fxDatedUrl = (d) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${d}/v1/currencies/eur.json`;
    const fxFallbackUrl = 'https://open.er-api.com/v6/latest/EUR';

    const sep = '<span class="tick-sep">\u00b7</span>';
    const fmt = (p) => p >= 1000 ? '$' + Math.round(p).toLocaleString('en-US')
        : p >= 1 ? '$' + p.toFixed(2) : '$' + p.toFixed(4);

    // remembers the last printed value per symbol so a move can flash green/red
    const lastValues = {};
    function flashClass(key, value) {
        const prev = lastValues[key];
        lastValues[key] = value;
        if (prev === undefined || prev === value) return '';
        return value > prev ? ' flash-up' : ' flash-down';
    }

    function cryptoItems(data) {
        return COINS.map((c) => {
            const d = data && data[c.id];
            if (!d || typeof d.usd !== 'number') return '';
            const chg = d.usd_24h_change || 0;
            const up = chg >= 0;
            return `<span class="tick ${up ? 'up' : 'down'}${flashClass(c.sym, d.usd)}">${c.sym} ${fmt(d.usd)} `
                + `${up ? '\u25B2' : '\u25BC'} ${Math.abs(chg).toFixed(2)}%</span>` + sep;
        }).filter(Boolean);
    }

    function fxPairs(last, prev) {
        const out = [];
        const push = (k, v, pv, dec) => {
            if (v == null) return;
            if (pv != null) {
                const chg = ((v - pv) / pv) * 100;
                const up = chg >= 0;
                out.push(`<span class="tick ${up ? 'up' : 'down'}${flashClass(k, v)}">${k} ${v.toFixed(dec)} `
                    + `${up ? '\u25B2' : '\u25BC'} ${Math.abs(chg).toFixed(2)}%</span>` + sep);
            } else {
                out.push(`<span class="tick-item">${k} ${v.toFixed(dec)}</span>` + sep);
            }
        };
        const cross = (r) => (r && r.USD && r.GBP) ? r.USD / r.GBP : null;
        push('EUR/USD', last.USD, prev && prev.USD, 4);
        push('EUR/GBP', last.GBP, prev && prev.GBP, 4);
        push('GBP/USD', cross(last), cross(prev), 4);
        push('EUR/JPY', last.JPY, prev && prev.JPY, 2);
        push('EUR/TND', last.TND, prev && prev.TND, 4);
        return out;
    }

    function ratesFrom(j) {
        const e = j && j.eur;
        if (!e) return null;
        return { USD: e.usd, GBP: e.gbp, JPY: e.jpy, TND: e.tnd };
    }
    function prevDate(dstr) {
        const d = new Date(dstr + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
    }

    function jsonOr(url) {
        return fetch(url, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
    }

    const state = { crypto: [], fx: [] };
    function paint() {
        const c = state.crypto, f = state.fx;
        const n = Math.max(c.length, f.length);
        const items = [];
        for (let i = 0; i < n; i++) {
            if (c[i]) items.push(c[i]);
            if (f[i]) items.push(f[i]);
        }
        const one = items.join('');
        if (one.replace(/\s/g, '')) track.innerHTML = one + one;
    }
    function loadFx() {
        jsonOr(fxLatestUrl).then((j) => {
            const last = ratesFrom(j);
            if (last && j.date) {
                jsonOr(fxDatedUrl(prevDate(j.date))).then((p) => {
                    state.fx = fxPairs(last, ratesFrom(p));
                    paint();
                });
            } else if (last) {
                state.fx = fxPairs(last, null);
                paint();
            } else {
                jsonOr(fxFallbackUrl).then((f) => {
                    if (f && f.rates) { state.fx = fxPairs(f.rates, null); paint(); }
                });
            }
        });
    }
    function load() {
        jsonOr(cryptoUrl).then((d) => { state.crypto = cryptoItems(d); paint(); });
        loadFx();
    }
    load();
    setInterval(load, 60000);
})();

/* ================================================================
   Paris weather (Open-Meteo, no key) — shown under the sidebar location
   ================================================================ */
/* ================================================================
   Gold-price career chart — real monthly XAU/USD, milestones on the line
   ================================================================ */
(function goldChart() {
    const host = document.getElementById('gold-chart');
    if (!host) return;

    const data = [
        ['2020-01', 1583], ['2020-02', 1564], ['2020-04', 1684], ['2020-05', 1737],
        ['2020-06', 1793], ['2020-07', 1963], ['2020-08', 1968], ['2020-09', 1888],
        ['2020-10', 1877], ['2020-12', 1893], ['2021-01', 1847], ['2021-02', 1728],
        ['2021-03', 1714], ['2021-04', 1767], ['2021-05', 1902], ['2021-06', 1771],
        ['2021-07', 1813], ['2021-09', 1755], ['2021-10', 1783], ['2021-11', 1774],
        ['2021-12', 1828], ['2022-01', 1795], ['2022-02', 1899], ['2022-03', 1949],
        ['2022-04', 1909], ['2022-06', 1804], ['2022-07', 1763], ['2022-08', 1713],
        ['2022-09', 1662], ['2022-10', 1636], ['2022-11', 1746], ['2022-12', 1820],
        ['2023-02', 1829], ['2023-03', 1969], ['2023-04', 1990], ['2023-05', 1964],
        ['2023-06', 1921], ['2023-07', 1970], ['2023-08', 1938], ['2023-09', 1848],
        ['2023-11', 2038], ['2023-12', 2062], ['2024-01', 2048], ['2024-02', 2046],
        ['2024-03', 2217], ['2024-04', 2291], ['2024-05', 2323], ['2024-06', 2328],
        ['2024-07', 2426], ['2024-08', 2494], ['2024-10', 2738], ['2024-11', 2657],
        ['2025-01', 2812], ['2025-02', 2837], ['2025-03', 3123], ['2025-04', 3305],
        ['2025-05', 3289], ['2025-07', 3293], ['2025-08', 3474], ['2025-09', 3841],
        ['2025-10', 3982], ['2025-11', 4218], ['2025-12', 4326], ['2026-01', 4714],
        ['2026-04', 4615], ['2026-05', 4560], ['2026-06', 4023], ['2026-07', 4049],
        ['2026-08', 4638],
    ];
    const milestones = [
        { date: '2021-09', label: "McDonald's", logo: 'assets/logos/mcdo.png' },
        { date: '2023-06', label: 'ODDO BHF', logo: 'assets/logos/oddo.jpg' },
        { date: '2023-11', label: 'BNP Paribas', logo: 'assets/logos/bnpparibas.png', lift: 60 },
        { date: '2024-06', label: 'BIAT CIB', logo: 'assets/logos/biat.jpg' },
        { date: '2024-09', label: 'CA CIB', logo: 'assets/logos/cacib.png', lift: 60 },
        { date: '2025-03', label: 'BNP CIB', logo: 'assets/logos/bnpparibas.png' },
        { date: '2025-09', label: 'Generali', logo: 'assets/logos/generali.png', current: true },
    ];

    const mi = (ym) => { const [y, m] = ym.split('-').map(Number); return (y - 2020) * 12 + (m - 1); };
    const start = mi('2020-01'), span = mi('2026-08') - start;

    const W = 920, H = 320, ml = 78, mr = 16, mt = 30, mb = 50;
    const pw = W - ml - mr, ph = H - mt - mb;
    const prices = data.map((d) => d[1]);
    const lo = Math.floor(Math.min(...prices) / 500) * 500;
    const hi = Math.ceil(Math.max(...prices) / 500) * 500;

    const X = (ym) => ml + ((mi(ym) - start) / span) * pw;
    const Y = (p) => mt + (1 - (p - lo) / (hi - lo)) * ph;

    function priceAt(ym) {
        const idx = mi(ym);
        let lower = null, upper = null;
        for (const [dt, p] of data) {
            const di = mi(dt);
            if (di <= idx) lower = [di, p];
            if (di >= idx) { upper = [di, p]; break; }
        }
        if (lower && upper) {
            if (lower[0] === upper[0]) return lower[1];
            const t = (idx - lower[0]) / (upper[0] - lower[0]);
            return lower[1] + t * (upper[1] - lower[1]);
        }
        return (lower || upper)[1];
    }

    let line = '';
    data.forEach(([dt, p], i) => { line += (i ? 'L' : 'M') + X(dt).toFixed(1) + ' ' + Y(p).toFixed(1) + ' '; });
    const baseY = (mt + ph).toFixed(1);
    const area = line + `L${X(data[data.length - 1][0]).toFixed(1)} ${baseY} L${ml} ${baseY} Z`;

    let grid = '';
    for (let v = lo; v <= hi; v += 500) {
        const gy = Y(v);
        grid += `<line class="gold-grid" x1="${ml}" y1="${gy.toFixed(1)}" x2="${W - mr}" y2="${gy.toFixed(1)}"/>`;
        grid += `<text class="gold-price" x="${ml - 8}" y="${(gy + 3).toFixed(1)}" text-anchor="end">$${v.toLocaleString('en-US')}</text>`;
    }

    let years = '';
    ['2020', '2021', '2022', '2023', '2024', '2025', '2026'].forEach((yr) => {
        const x = X(yr + '-01');
        years += `<text class="gold-year" x="${x.toFixed(1)}" y="${H - 22}" text-anchor="middle">${yr}</text>`;
    });

    let ms = '';
    milestones.forEach((m) => {
        const lift = m.lift || 22;
        const mx = X(m.date), my = Y(priceAt(m.date)), s = 30, top = my - lift - s;
        ms += '<g>'
            + `<line class="gold-stem" x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${mx.toFixed(1)}" y2="${(my - lift).toFixed(1)}"/>`
            + `<rect class="gold-tile${m.current ? ' gold-tile-current' : ''}" x="${(mx - s / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${s}" height="${s}" rx="7"/>`
            + `<image href="${m.logo}" x="${(mx - s / 2 + 3).toFixed(1)}" y="${(top + 3).toFixed(1)}" width="${s - 6}" height="${s - 6}" preserveAspectRatio="xMidYMid meet"/>`
            + `<circle class="gold-dot" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3.5"/>`
            + `<text class="gold-ms-label" x="${mx.toFixed(1)}" y="${(top - 7).toFixed(1)}">${m.label}</text>`
            + '</g>';
    });

    host.innerHTML =
        `<svg class="gold-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gold price with career milestones, 2020 to now">`
        + '<defs><linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#d4af37" stop-opacity="0.28"/>'
        + '<stop offset="1" stop-color="#d4af37" stop-opacity="0"/></linearGradient>'
        + `<clipPath id="goldClip"><rect class="gold-clip-rect" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>`
        + grid
        + '<g clip-path="url(#goldClip)">'
        + `<path class="gold-area" d="${area}" fill="url(#goldFill)"/>`
        + `<path class="gold-line" d="${line.trim()}" fill="none"/>`
        + '</g>'
        + ms + years
        + `<text class="gold-axis-title" x="${ml - 62}" y="${(mt + ph / 2).toFixed(1)}" transform="rotate(-90 ${ml - 62} ${(mt + ph / 2).toFixed(1)})" text-anchor="middle">Gold \u00b7 USD/oz</text>`
        + '</svg>';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        host.classList.add('is-drawn');
    } else {
        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        host.classList.add('is-drawn');
                        obs.disconnect();
                    }
                });
            },
            { threshold: 0.3 }
        );
        observer.observe(host);
    }
})();

/* ================================================================
   Footer year
   ================================================================ */
document.getElementById('year').textContent = new Date().getFullYear();

/* ================================================================
   Intro kicker typewriter
   ================================================================ */
(function introTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const phrases = [
        'Still long gold. Still long ambition.',
        'Short volatility, long curiosity.',
        'Delta hedged. Dreams, not so much.',
        'Building models, breaking assumptions.',
    ];

    if (prefersReducedMotion) {
        el.textContent = phrases[0];
        return;
    }

    let phraseIndex = 0, charIndex = 0, deleting = false;

    function tick() {
        const phrase = phrases[phraseIndex];
        if (!deleting) {
            charIndex++;
            el.textContent = phrase.slice(0, charIndex);
            if (charIndex === phrase.length) {
                deleting = true;
                setTimeout(tick, 1800);
                return;
            }
        } else {
            charIndex--;
            el.textContent = phrase.slice(0, charIndex);
            if (charIndex === 0) {
                deleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
            }
        }
        setTimeout(tick, deleting ? 28 : 45);
    }

    tick();
})();

/* ================================================================
   Animated stat counters — count up once when scrolled into view
   ================================================================ */
(function statCounters() {
    const strip = document.querySelector('.stats-strip');
    if (!strip) return;
    const nums = Array.from(strip.querySelectorAll('.stat-num'));
    if (!nums.length) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const targets = nums.map((n) => parseInt(n.textContent.replace(/[^\d]/g, ''), 10) || 0);

    function animate() {
        const duration = 1200;
        const start = performance.now();
        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            nums.forEach((n, i) => {
                n.textContent = Math.round(targets[i] * eased).toString();
            });
            if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
        animate();
        return;
    }
    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animate();
                    obs.disconnect();
                }
            });
        },
        { threshold: 0.4 }
    );
    observer.observe(strip);
})();

/* ================================================================
   Tilt effect on project / research cards
   ================================================================ */
(function cardTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = document.querySelectorAll('.pub, .research-grid .card');
    if (!cards.length) return;

    const MAX_TILT = 6;

    cards.forEach((card) => {
        const isLiftCard = card.classList.contains('card');

        function onMove(e) {
            const rect = card.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width - 0.5;
            const py = (e.clientY - rect.top) / rect.height - 0.5;
            const rotateY = px * MAX_TILT * 2;
            const rotateX = py * -MAX_TILT * 2;
            const lift = isLiftCard ? ' translateY(-4px)' : '';
            card.style.transform =
                `perspective(700px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)${lift}`;
        }

        function onLeave() {
            card.style.transform = '';
        }

        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
    });
})();

/* ================================================================
   Custom cursor
   ================================================================ */
(function customCursor() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    document.body.classList.add('custom-cursor-active');

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;

    // trail canvas — the cursor leaves a stepped tape, like a tick chart
    const trail = document.getElementById('cursor-trail');
    const tctx = trail ? trail.getContext('2d') : null;
    const LIFE = 650;
    let points = [];

    function resizeTrail() {
        if (!trail) return;
        trail.width = window.innerWidth;
        trail.height = window.innerHeight;
    }
    resizeTrail();
    window.addEventListener('resize', resizeTrail);

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.left = mouseX + 'px';
        dot.style.top = mouseY + 'px';
        if (tctx) points.push({ x: mouseX, y: mouseY, t: performance.now() });
    });

    function drawTrail(now) {
        if (!tctx) return;
        points = points.filter((p) => now - p.t < LIFE);
        tctx.clearRect(0, 0, trail.width, trail.height);
        if (points.length < 2) return;
        tctx.lineWidth = 1.5;
        tctx.lineJoin = 'round';
        for (let i = 1; i < points.length; i++) {
            const p0 = points[i - 1], p1 = points[i];
            const age = (now - p1.t) / LIFE;
            tctx.strokeStyle = `rgba(15, 118, 110, ${(1 - age) * 0.45})`;
            tctx.beginPath();
            tctx.moveTo(p0.x, p0.y);
            tctx.lineTo(p1.x, p0.y);
            tctx.lineTo(p1.x, p1.y);
            tctx.stroke();
        }
    }

    function raf(now) {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
        ring.style.left = ringX + 'px';
        ring.style.top = ringY + 'px';
        drawTrail(now);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const hoverTargets = 'a, button, .btn, .card, .pub, .pub-filter, input, .tick-item';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverTargets)) ring.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverTargets)) ring.classList.remove('is-hovering');
    });
})();

/* ================================================================
   Timeline accent line — fills as the section scrolls past
   ================================================================ */
(function timelineFill() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timelines = Array.from(document.querySelectorAll('.timeline'));
    if (!timelines.length) return;

    let queued = false;
    function update() {
        queued = false;
        const trigger = window.innerHeight * 0.72;
        timelines.forEach((tl) => {
            const rect = tl.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            const progress = (trigger - rect.top) / rect.height;
            tl.style.setProperty('--fill', Math.max(0, Math.min(1, progress)).toFixed(3));
        });
    }
    function onScroll() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
})();

/* ================================================================
   Magnetic buttons
   ================================================================ */
(function magneticButtons() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const STRENGTH = 0.3, MAX = 9;
    document.querySelectorAll('.btn').forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);
            const x = Math.max(-MAX, Math.min(MAX, dx * STRENGTH));
            const y = Math.max(-MAX, Math.min(MAX, dy * STRENGTH));
            btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
})();

/* ================================================================
   Section headings — scramble into place on first view
   ================================================================ */
(function scrambleHeadings() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    const heads = document.querySelectorAll('.section-head h2');
    if (!heads.length) return;

    const CHARS = '!<>-_\\/[]{}=+*^?#$%&';

    function scramble(el) {
        const text = el.dataset.text || '';
        const duration = 850;
        const start = performance.now();
        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const settled = Math.floor(text.length * t * 1.35);
            let out = '';
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (ch === ' ') { out += ' '; continue; }
                out += i < settled ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
            }
            el.textContent = out;
            if (t < 1) requestAnimationFrame(frame);
            else el.textContent = text;
        }
        requestAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    scramble(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.6 }
    );

    heads.forEach((h) => {
        h.dataset.text = h.textContent.trim();
        observer.observe(h);
    });
})();

/* ================================================================
   Command palette — Bloomberg-style navigation on Ctrl/Cmd + K
   ================================================================ */
(function commandPalette() {
    const root = document.getElementById('cmdk');
    const input = document.getElementById('cmdk-input');
    const list = document.getElementById('cmdk-list');
    const hint = document.getElementById('cmdk-hint');
    if (!root || !input || !list) return;

    const go = (sel) => {
        const target = document.querySelector(sel);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const openTab = (url) => window.open(url, '_blank', 'noopener,noreferrer');

    const COMMANDS = [
        { code: 'ABOUT', label: 'Who I am', kind: 'section', run: () => go('#about') },
        { code: 'XP', label: 'Path so far \u2014 experience', kind: 'section', run: () => go('#experience') },
        { code: 'PORT', label: 'Academic projects', kind: 'section', run: () => go('#projects') },
        { code: 'BSM', label: 'Black-Scholes playground', kind: 'tool', run: () => go('.bs-lab') },
        { code: 'SKILL', label: 'Toolkit \u2014 skills', kind: 'section', run: () => go('#skills') },
        { code: 'VOL', label: 'Volunteering', kind: 'section', run: () => go('#volunteering') },
        { code: 'EVTS', label: 'Conferences & industry events', kind: 'section', run: () => go('#events') },
        { code: 'BYND', label: 'Beyond the desk', kind: 'section', run: () => go('#beyond') },
        { code: 'NOTE', label: 'Quant Finance Notes \u2014 newsletter', kind: 'section', run: () => go('#newsletter') },
        { code: 'CONT', label: "Let's talk \u2014 contact", kind: 'section', run: () => go('#contact') },
        { code: 'CV', label: 'Open resume (PDF)', kind: 'file', run: () => openTab('assets/docs/resume/Yassine-MANNAI-Resume.pdf') },
        { code: 'GH', label: 'GitHub profile', kind: 'link', run: () => openTab('https://github.com/yessinemx') },
        { code: 'LI', label: 'LinkedIn profile', kind: 'link', run: () => openTab('https://www.linkedin.com/in/yassine-mannai') },
        { code: 'MAIL', label: 'Email me', kind: 'link', run: () => { window.location.href = 'mailto:contact@yassinemannai.com'; } },
        { code: 'TOP', label: 'Back to top', kind: 'nav', run: () => go('#top') },
    ];

    let results = COMMANDS.slice();
    let active = 0;
    let lastFocused = null;

    function render() {
        if (!results.length) {
            list.innerHTML = '<li class="cmdk-empty">No matching command</li>';
            input.removeAttribute('aria-activedescendant');
            return;
        }
        list.innerHTML = results.map((c, i) =>
            `<li class="cmdk-item" role="option" id="cmdk-opt-${i}" data-i="${i}" aria-selected="${i === active}">`
            + `<span class="cmdk-code">${c.code}</span>`
            + `<span class="cmdk-label">${c.label}</span>`
            + `<span class="cmdk-kind">${c.kind}</span></li>`
        ).join('');
        input.setAttribute('aria-activedescendant', 'cmdk-opt-' + active);
        const el = list.querySelector('[aria-selected="true"]');
        if (el) el.scrollIntoView({ block: 'nearest' });
    }

    function filter(q) {
        const s = q.trim().toLowerCase();
        results = !s ? COMMANDS.slice() : COMMANDS.filter((c) =>
            c.code.toLowerCase().includes(s) || c.label.toLowerCase().includes(s));
        active = 0;
        render();
    }

    function open() {
        lastFocused = document.activeElement;
        root.hidden = false;
        input.value = '';
        filter('');
        input.focus();
    }
    function close() {
        if (root.hidden) return;
        root.hidden = true;
        // hand focus back to whatever opened the palette
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        lastFocused = null;
    }
    function runActive() {
        const cmd = results[active];
        if (!cmd) return;
        close();
        cmd.run();
    }

    document.addEventListener('keydown', (e) => {
        const combo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
        if (combo) {
            e.preventDefault();
            root.hidden ? open() : close();
            return;
        }
        if (root.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        // the palette is a combobox: Tab must not escape it
        else if (e.key === 'Tab') { e.preventDefault(); input.focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % results.length; render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + results.length) % results.length; render(); }
        else if (e.key === 'Enter') { e.preventDefault(); runActive(); }
    });

    input.addEventListener('input', () => filter(input.value));

    list.addEventListener('click', (e) => {
        const item = e.target.closest('.cmdk-item');
        if (!item) return;
        active = Number(item.dataset.i);
        runActive();
    });
    list.addEventListener('mousemove', (e) => {
        const item = e.target.closest('.cmdk-item');
        if (!item) return;
        const i = Number(item.dataset.i);
        if (i !== active) { active = i; render(); }
    });

    root.querySelectorAll('[data-cmdk-close]').forEach((el) => el.addEventListener('click', close));
    if (hint) hint.addEventListener('click', open);

    render();
})();

/* ================================================================
   Black-Scholes playground — European option, no dividends
   ================================================================ */
(function blackScholes() {
    const lab = document.querySelector('.bs-lab');
    if (!lab) return;
    const $ = (id) => document.getElementById(id);
    const inputs = { S: $('bs-S'), K: $('bs-K'), T: $('bs-T'), V: $('bs-V'), R: $('bs-R') };
    if (Object.values(inputs).some((el) => !el)) return;

    // Abramowitz & Stegun 26.2.17 normal CDF
    function normCdf(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989422804014327 * Math.exp(-x * x / 2);
        const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937
            + t * (-1.821255978 + t * 1.330274429))));
        return x >= 0 ? 1 - p : p;
    }
    const normPdf = (x) => 0.3989422804014327 * Math.exp(-x * x / 2);

    function compute() {
        const S = +inputs.S.value, K = +inputs.K.value, T = +inputs.T.value;
        const sig = +inputs.V.value, r = +inputs.R.value;

        const sqrtT = Math.sqrt(T);
        const d1 = (Math.log(S / K) + (r + sig * sig / 2) * T) / (sig * sqrtT);
        const d2 = d1 - sig * sqrtT;
        const disc = Math.exp(-r * T);

        const call = S * normCdf(d1) - K * disc * normCdf(d2);
        const put = K * disc * normCdf(-d2) - S * normCdf(-d1);

        const gamma = normPdf(d1) / (S * sig * sqrtT);
        const vega = S * normPdf(d1) * sqrtT;
        const thetaC = (-S * normPdf(d1) * sig / (2 * sqrtT)) - r * K * disc * normCdf(d2);
        const rhoC = K * T * disc * normCdf(d2);

        $('bs-S-out').textContent = S;
        $('bs-K-out').textContent = K;
        $('bs-T-out').textContent = T.toFixed(2) + 'y';
        $('bs-V-out').textContent = Math.round(sig * 100) + '%';
        $('bs-R-out').textContent = (r * 100).toFixed(1) + '%';

        $('bs-call').textContent = call.toFixed(2);
        $('bs-put').textContent = put.toFixed(2);
        $('bs-dc').textContent = normCdf(d1).toFixed(3);
        $('bs-dp').textContent = (normCdf(d1) - 1).toFixed(3);
        $('bs-ga').textContent = gamma.toFixed(4);
        $('bs-ve').textContent = (vega / 100).toFixed(3);
        $('bs-th').textContent = (thetaC / 365).toFixed(3);
        $('bs-rh').textContent = (rhoC / 100).toFixed(3);
    }

    Object.values(inputs).forEach((el) => el.addEventListener('input', compute));
    compute();
})();
