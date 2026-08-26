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
                            mailLink.href = 'mailto:yassine.mannai@dauphine.eu?subject='
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
        { id: 'dogecoin', sym: 'DOGE' },
    ];
    const cryptoUrl = 'https://api.coingecko.com/api/v3/simple/price?ids='
        + COINS.map((c) => c.id).join(',') + '&vs_currencies=usd&include_24hr_change=true';
    const fxSeriesUrl = () => {
        const d = new Date();
        d.setDate(d.getDate() - 10);
        return `https://api.frankfurter.app/${d.toISOString().slice(0, 10)}..?base=EUR&symbols=USD,GBP,JPY`;
    };
    const fxFallbackUrl = 'https://open.er-api.com/v6/latest/EUR';

    const sep = '<span class="tick-sep">\u00b7</span>';
    const fmt = (p) => p >= 1000 ? '$' + Math.round(p).toLocaleString('en-US')
        : p >= 1 ? '$' + p.toFixed(2) : '$' + p.toFixed(4);

    function cryptoItems(data) {
        return COINS.map((c) => {
            const d = data && data[c.id];
            if (!d || typeof d.usd !== 'number') return '';
            const chg = d.usd_24h_change || 0;
            const up = chg >= 0;
            return `<span class="tick ${up ? 'up' : 'down'}">${c.sym} ${fmt(d.usd)} `
                + `${up ? '\u25B2' : '\u25BC'} ${Math.abs(chg).toFixed(2)}%</span>` + sep;
        }).join('');
    }

    function fxPairs(last, prev) {
        const out = [];
        const push = (k, v, pv, dec) => {
            if (v == null) return;
            if (pv != null) {
                const chg = ((v - pv) / pv) * 100;
                const up = chg >= 0;
                out.push(`<span class="tick ${up ? 'up' : 'down'}">${k} ${v.toFixed(dec)} `
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
        return out.join('');
    }

    function jsonOr(url) {
        return fetch(url, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
    }

    const state = { crypto: '', fx: '' };
    function paint() {
        const one = state.crypto + state.fx;
        if (one.replace(/\s/g, '')) track.innerHTML = one + one;
    }
    function loadFx() {
        jsonOr(fxSeriesUrl()).then((d) => {
            if (d && d.rates) {
                const dates = Object.keys(d.rates).sort();
                const last = d.rates[dates[dates.length - 1]];
                const prev = dates.length > 1 ? d.rates[dates[dates.length - 2]] : null;
                state.fx = fxPairs(last, prev);
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
(function parisWeather() {
    const el = document.getElementById('sidebar-weather');
    if (!el) return;
    const codes = {
        0: ['Clear', '\u2600\ufe0f'], 1: ['Mainly clear', '\ud83c\udf24\ufe0f'],
        2: ['Partly cloudy', '\u26c5'], 3: ['Overcast', '\u2601\ufe0f'],
        45: ['Fog', '\ud83c\udf2b\ufe0f'], 48: ['Fog', '\ud83c\udf2b\ufe0f'],
        51: ['Drizzle', '\ud83c\udf26\ufe0f'], 53: ['Drizzle', '\ud83c\udf26\ufe0f'], 55: ['Drizzle', '\ud83c\udf26\ufe0f'],
        56: ['Freezing drizzle', '\ud83c\udf27\ufe0f'], 57: ['Freezing drizzle', '\ud83c\udf27\ufe0f'],
        61: ['Rain', '\ud83c\udf27\ufe0f'], 63: ['Rain', '\ud83c\udf27\ufe0f'], 65: ['Rain', '\ud83c\udf27\ufe0f'],
        66: ['Freezing rain', '\ud83c\udf27\ufe0f'], 67: ['Freezing rain', '\ud83c\udf27\ufe0f'],
        71: ['Snow', '\ud83c\udf28\ufe0f'], 73: ['Snow', '\ud83c\udf28\ufe0f'], 75: ['Snow', '\ud83c\udf28\ufe0f'], 77: ['Snow', '\ud83c\udf28\ufe0f'],
        80: ['Showers', '\ud83c\udf26\ufe0f'], 81: ['Showers', '\ud83c\udf26\ufe0f'], 82: ['Showers', '\ud83c\udf26\ufe0f'],
        85: ['Snow showers', '\ud83c\udf28\ufe0f'], 86: ['Snow showers', '\ud83c\udf28\ufe0f'],
        95: ['Thunderstorm', '\u26c8\ufe0f'], 96: ['Thunderstorm', '\u26c8\ufe0f'], 99: ['Thunderstorm', '\u26c8\ufe0f'],
    };
    fetch('https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,weather_code')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
            const c = d.current;
            const info = codes[c.weather_code] || ['', '\ud83c\udf21\ufe0f'];
            el.textContent = `${info[1]} ${Math.round(c.temperature_2m)}\u00b0C \u00b7 ${info[0]}`;
        })
        .catch(() => { });
})();

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
        `<svg class="gold-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gold price with career milestones, June 2023 to now">`
        + '<defs><linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#d4af37" stop-opacity="0.28"/>'
        + '<stop offset="1" stop-color="#d4af37" stop-opacity="0"/></linearGradient></defs>'
        + grid
        + `<path class="gold-area" d="${area}" fill="url(#goldFill)"/>`
        + `<path class="gold-line" d="${line.trim()}" fill="none"/>`
        + ms + years
        + `<text class="gold-axis-title" x="${ml - 62}" y="${(mt + ph / 2).toFixed(1)}" transform="rotate(-90 ${ml - 62} ${(mt + ph / 2).toFixed(1)})" text-anchor="middle">Gold \u00b7 USD/oz</text>`
        + '</svg>';
})();

/* ================================================================
   Footer year
   ================================================================ */
document.getElementById('year').textContent = new Date().getFullYear();
