/**
 * app.js - State management, filtering, and preferred seat availability scanner
 */

window.state = {
    movies: [], currentMovie: null, currentDays: [], selectedDayIndex: 0,
    formatFilter: 'ALL', onlyPreferredFilter: false, searchQuery: '',
    seatsCache: {}, sampleQueues: null
};

window.onPreferredSeatsChanged = () => { if (window.state.currentMovie) renderSessionsDay(window.state.selectedDayIndex); };
async function apiFetch(url) {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

async function initApp() {
    PreferredModule.updatePreferredSeatsPill();
    setupEventListeners();
    await loadMovies();
}

function setupEventListeners() {
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        window.state.searchQuery = e.target.value.toLowerCase().trim();
        renderMoviesGrid();
    });

    document.getElementById('filter-preferred-toggle')?.addEventListener('change', (e) => {
        window.state.onlyPreferredFilter = e.target.checked;
        if (window.state.currentMovie) renderSessionsDay(window.state.selectedDayIndex);
    });

    document.querySelectorAll('[data-format-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-format-filter]').forEach(b => {
                b.classList.remove('bg-cyan-500', 'text-neutral-950', 'font-bold');
                b.classList.add('bg-neutral-900', 'text-neutral-300');
            });
            btn.classList.add('bg-cyan-500', 'text-neutral-950', 'font-bold');
            btn.classList.remove('bg-neutral-900', 'text-neutral-300');
            window.state.formatFilter = btn.dataset.formatFilter;
            renderMoviesGrid();
            if (window.state.currentMovie) renderSessionsDay(window.state.selectedDayIndex);
        });
    });
}

function groupRawMovies(rawItems) {
    const groups = new Map();
    for (const item of rawItems) {
        const key = item.aggregateformatnumber || item.aggregatetitle || item.title;
        if (!groups.has(key)) {
            groups.set(key, {
                ...item,
                title: item.aggregatetitle || item.title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
                formats: new Set(), hasImax: false
            });
        }
        const g = groups.get(key);
        if (item.format) g.formats.add(item.format.toUpperCase());
        if ((item.title + ' ' + (item.format || '')).toLowerCase().includes('imax')) g.hasImax = true;
        if ((!g.portraitimages?.path || !g.portraitimages.path.length) && item.portraitimages?.path) {
            g.portraitimages = item.portraitimages;
        }
    }
    return Array.from(groups.values()).map(g => ({ ...g, formats: Array.from(g.formats) }));
}

async function loadMovies() {
    const statusEl = document.getElementById('movies-status');
    try {
        statusEl.innerText = 'Loading movies from Cinemas NOS...';
        statusEl.classList.remove('hidden');
        const data = await apiFetch('/movies');
        window.state.movies = groupRawMovies(data.data?.movieList?.items || []);
        statusEl.classList.add('hidden');
        renderMoviesGrid();
    } catch (err) {
        console.error(err);
        statusEl.innerText = 'Failed to load movies. Ensure server.js is running.';
        statusEl.classList.add('text-red-400');
    }
}

function renderMoviesGrid() {
    const grid = document.getElementById('movies-grid');
    grid.innerHTML = '';

    const filtered = window.state.movies.filter(m => {
        const matchesSearch = !window.state.searchQuery || m.title.toLowerCase().includes(window.state.searchQuery);
        if (window.state.formatFilter === 'IMAX' && !m.hasImax) return false;
        if (window.state.formatFilter === 'ATMOS' && !m.formats.some(f => f.includes('ATMOS'))) return false;
        if (window.state.formatFilter === 'STANDARD' && m.hasImax && m.formats.length === 1) return false;
        return matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-neutral-400">No movies found matching criteria.</div>';
        return;
    }

    filtered.forEach(movie => {
        let imgUrl = movie.portraitimages?.path || '';
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        const formats = movie.formats || [];

        const card = document.createElement('div');
        card.className = 'group bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/20 flex flex-col';
        card.onclick = () => selectMovie(movie);
        card.innerHTML = `
            <div class="relative aspect-[2/3] overflow-hidden bg-neutral-950">
                <img src="${imgUrl}" alt="${movie.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4='">
                <div class="absolute top-2 right-2 flex flex-col items-end gap-1">
                    ${movie.hasImax ? '<span class="px-2 py-0.5 text-[10px] font-black tracking-wider bg-cyan-400 text-neutral-950 rounded shadow-md uppercase">IMAX</span>' : ''}
                    ${formats.some(f => f.includes('ATMOS')) ? '<span class="px-1.5 py-0.5 text-[9px] font-bold bg-violet-950 text-violet-300 border border-violet-700/60 rounded">ATMOS</span>' : ''}
                    ${formats.includes('4DX') ? '<span class="px-1.5 py-0.5 text-[9px] font-bold bg-neutral-900/90 text-neutral-200 border border-neutral-700 rounded">4DX</span>' : ''}
                    ${!movie.hasImax && !formats.some(f => f.includes('ATMOS')) ? '<span class="px-1.5 py-0.5 text-[9px] font-bold bg-neutral-900/90 text-neutral-400 border border-neutral-800 rounded">2D</span>' : ''}
                </div>
            </div>
            <div class="p-3.5 flex flex-col flex-1">
                <h3 class="font-bold text-sm text-neutral-100 group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1" title="${movie.title}">${movie.title}</h3>
                <div class="text-xs text-neutral-400 mt-auto flex items-center justify-between">
                    <span>${movie.classification || 'NA'} • ${movie.genre || 'Cinema'}</span>
                    <span>${movie.duration ? movie.duration + 'm' : ''}</span>
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

async function selectMovie(movie) {
    window.state.currentMovie = movie;
    document.getElementById('view-movies').classList.add('hidden');
    document.getElementById('view-sessions').classList.remove('hidden');

    let imgUrl = movie.portraitimages?.path || '';
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    const $ = id => document.getElementById(id);
    $('session-movie-poster').src = imgUrl;
    $('session-movie-title').innerText = movie.title;
    $('session-movie-synopsis').innerText = movie.synopsis?.plaintext || 'No synopsis available.';
    $('session-movie-meta').innerText = `${movie.classification || ''} • ${movie.genre || ''} • ${movie.duration ? movie.duration + ' mins' : ''}`;

    const contentDiv = $('sessions-content');
    contentDiv.innerHTML = '<div class="py-12 text-center text-cyan-400 animate-pulse">Fetching Colombo sessions...</div>';

    try {
        const movieId = movie.aggregateformatnumber || movie.uuid;
        const data = await apiFetch(`/sessions?id=${movieId}`);
        window.state.currentDays = data.days || [];
        window.state.selectedDayIndex = 0;
        renderDaysTabs();
        renderSessionsDay(0);
    } catch (err) {
        console.error(err);
        contentDiv.innerHTML = '<div class="py-12 text-center text-red-400">Failed to load sessions for this movie.</div>';
    }
}

function showMoviesView() {
    document.getElementById('view-sessions').classList.add('hidden');
    document.getElementById('view-movies').classList.remove('hidden');
}

function renderDaysTabs() {
    const tabsContainer = document.getElementById('day-tabs');
    tabsContainer.innerHTML = '';

    window.state.currentDays.forEach((day, idx) => {
        const colombo = day.theaters?.find(t => t.name === 'Cinemas NOS Colombo');
        if (!colombo || !colombo.sessions?.length) return;

        const btn = document.createElement('button');
        const isActive = idx === window.state.selectedDayIndex;
        btn.className = `px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            isActive ? 'bg-cyan-500 text-neutral-950 shadow-md font-bold' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
        }`;
        btn.innerText = day.name;
        btn.onclick = () => {
            window.state.selectedDayIndex = idx;
            renderDaysTabs();
            renderSessionsDay(idx);
        };
        tabsContainer.appendChild(btn);
    });
}

function renderSessionsDay(dayIndex) {
    const content = document.getElementById('sessions-content');
    content.innerHTML = '';
    const day = window.state.currentDays[dayIndex];
    const colombo = day?.theaters?.find(t => t.name === 'Cinemas NOS Colombo');
    if (!colombo || !colombo.sessions?.length) {
        content.innerHTML = '<div class="py-10 text-center text-neutral-400">No sessions available for Colombo on this date.</div>';
        return;
    }

    const sessionGrid = document.createElement('div');
    sessionGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    colombo.sessions.forEach(session => {
        const fmt = (session.format || session.description || '').toLowerCase();
        const isImax = fmt.includes('imax');
        const isAtmos = fmt.includes('atmos');
        if (window.state.formatFilter === 'IMAX' && !isImax) return;
        if (window.state.formatFilter === 'ATMOS' && !isAtmos) return;
        if (window.state.formatFilter === 'STANDARD' && isImax) return;

        let badgeStyle = 'bg-neutral-800 text-neutral-300 border border-neutral-700/60';
        if (isImax) badgeStyle = 'bg-cyan-950 text-cyan-300 border border-cyan-500/40';
        else if (isAtmos) badgeStyle = 'bg-violet-950 text-violet-300 border border-violet-500/40';

        const card = document.createElement('div');
        card.id = `session-card-${session.uuid}`;
        card.className = 'bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 transition-colors';
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-baseline gap-2">
                    <span class="text-xl font-black text-neutral-100 font-mono">${session.time}</span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded uppercase ${badgeStyle}">${session.format}</span>
                </div>
                <span class="text-xs text-neutral-400">${session.description || 'Sala'}</span>
            </div>
            <div id="badge-${session.uuid}" class="text-xs py-1.5 px-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-400 flex items-center justify-between">
                <span>Scanning seats...</span>
            </div>
            <div class="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
                <button class="flex-1 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 transition-colors" onclick="toggleSeatMap('${session.uuid}')">
                    Inspect Seats
                </button>
                <a href="https://bilheteira.cinemas.nos.pt/Cinemas/Ticket?SessionUUID=${session.uuid}" target="_blank" rel="noopener" class="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold rounded-lg text-neutral-950 transition-colors flex items-center gap-1">
                    Book on NOS ↗
                </a>
            </div>
            <div id="seatmap-container-${session.uuid}" class="hidden pt-3 border-t border-neutral-800"></div>`;

        sessionGrid.appendChild(card);
        scanSessionSeats(session.uuid);
    });

    if (sessionGrid.children.length === 0) {
        content.innerHTML = '<div class="py-10 text-center text-neutral-400">No sessions match current format filters.</div>';
    } else { content.appendChild(sessionGrid); }
}

async function scanSessionSeats(sessionUuid) {
    try {
        let queues = window.state.seatsCache[sessionUuid];
        if (!queues) {
            queues = await apiFetch(`/seats?sessionUuid=${sessionUuid}`);
            window.state.seatsCache[sessionUuid] = queues;
            if (!window.state.sampleQueues && queues.length > 0) window.state.sampleQueues = queues;
        }

        const prefSet = PreferredModule.getPreferredSeats();
        const stats = SeatMapModule.analyzeSeats(queues, prefSet);
        const badgeEl = document.getElementById(`badge-${sessionUuid}`);
        const cardEl = document.getElementById(`session-card-${sessionUuid}`);

        if (window.state.onlyPreferredFilter && stats.preferredAvailableCount === 0 && cardEl) {
            cardEl.classList.add('hidden');
        }

        if (badgeEl) {
            if (stats.preferredTotal === 0) {
                badgeEl.className = 'text-xs py-1.5 px-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-400 flex items-center justify-between';
                badgeEl.innerHTML = `<span class="text-neutral-500">Sweet spot not in room</span><span class="text-[10px] text-emerald-400/90 font-bold">${stats.availableSeats} / ${stats.totalSeats} free</span>`;
            } else if (stats.preferredAvailableCount > 0) {
                badgeEl.className = 'text-xs py-1.5 px-2.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300 font-medium flex items-center justify-between';
                badgeEl.innerHTML = `<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><strong>${stats.preferredAvailableCount} Preferred Free:</strong> ${stats.preferredAvailableList.slice(0, 4).join(', ')}${stats.preferredAvailableList.length > 4 ? '...' : ''}</span><span class="text-[10px] text-amber-200/80">${stats.availableSeats} free</span>`;
            } else {
                badgeEl.className = 'text-xs py-1.5 px-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-400 flex items-center justify-between';
                badgeEl.innerHTML = `<span class="text-neutral-500">Preferred sold out</span><span class="text-[10px]">${stats.availableSeats} / ${stats.totalSeats} free</span>`;
            }
        }
    } catch (err) {
        console.error(`Error scanning session ${sessionUuid}:`, err);
        const badgeEl = document.getElementById(`badge-${sessionUuid}`);
        if (badgeEl) badgeEl.innerHTML = `<span class="text-neutral-500">Seat scan unavailable</span>`;
    }
}

async function toggleSeatMap(sessionUuid) {
    const container = document.getElementById(`seatmap-container-${sessionUuid}`);
    if (!container) return;
    if (container.classList.toggle('hidden')) return;
    container.innerHTML = '<div class="py-4 text-center text-xs text-neutral-400">Loading seat layout...</div>';

    let queues = window.state.seatsCache[sessionUuid] || (window.state.seatsCache[sessionUuid] = await apiFetch(`/seats?sessionUuid=${sessionUuid}`));
    SeatMapModule.renderSeatMap(container, queues, {
        preferredSeats: PreferredModule.getPreferredSeats(),
        interactive: false
    });
}

window.addEventListener('DOMContentLoaded', initApp);
