/**
 * seatmap.js - High-resolution interactive seat map renderer
 * Supports visual blueprints, sweet-spot preferred seat highlighting, and interactive selection.
 */

function getSeatCode(seat) {
    if (!seat || !seat.Queue) return '';
    return `${seat.Queue}${seat.SeatNumber}`;
}

function analyzeSeats(queues, preferredSeatsSet = new Set()) {
    let totalSeats = 0;
    let availableSeats = 0;
    let takenSeats = 0;
    const preferredAvailableList = [];
    const preferredTakenList = [];

    (queues || []).forEach(row => {
        const seats = row.LocalSeats?.List || [];
        seats.forEach(seat => {
            if (!seat.isSeat) return;
            totalSeats++;
            const code = getSeatCode(seat);
            const isPref = preferredSeatsSet.has(code);

            if (seat.isAvailable) {
                availableSeats++;
                if (isPref) preferredAvailableList.push(code);
            } else {
                takenSeats++;
                if (isPref) preferredTakenList.push(code);
            }
        });
    });

    return {
        totalSeats,
        availableSeats,
        takenSeats,
        preferredTotal: preferredAvailableList.length + preferredTakenList.length,
        preferredAvailableCount: preferredAvailableList.length,
        preferredAvailableList,
        preferredTakenList
    };
}

function renderSeatMap(container, queues, options = {}) {
    const {
        preferredSeats = new Set(),
        interactive = false,
        onTogglePreferred = null,
        showScreen = true
    } = options;

    const prefSet = preferredSeats instanceof Set ? preferredSeats : new Set(preferredSeats);

    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    container.innerHTML = '';

    if (!queues || queues.length === 0) {
        container.innerHTML = `
            <div class="py-8 text-center text-sm text-neutral-400">
                No seat blueprint data available for this room.
            </div>`;
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col items-center select-none w-full';

    // Screen Header Indicator
    if (showScreen) {
        const screenDiv = document.createElement('div');
        screenDiv.className = 'w-full max-w-xl mb-6 flex flex-col items-center';
        screenDiv.innerHTML = `
            <div class="w-3/4 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
            <div class="text-[10px] tracking-[0.25em] uppercase text-cyan-400/80 font-bold mt-1">Ecrã / Screen</div>
        `;
        wrapper.appendChild(screenDiv);
    }

    // Grid Container
    const gridDiv = document.createElement('div');
    gridDiv.className = 'inline-flex flex-col gap-1.5 p-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-2xl max-w-full overflow-x-auto';

    queues.forEach(q => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex items-center gap-1.5 justify-center';

        const rowLabel = q.Queue || '';
        
        // Left Row Label
        const leftLabel = document.createElement('span');
        leftLabel.className = 'w-5 text-[11px] font-bold text-neutral-400 text-center shrink-0';
        leftLabel.innerText = rowLabel;
        rowDiv.appendChild(leftLabel);

        const localSeats = q.LocalSeats?.List || [];
        localSeats.forEach(seat => {
            const seatDiv = document.createElement('div');
            
            if (!seat.isSeat) {
                seatDiv.className = 'w-6 h-6 shrink-0'; // Blank space
            } else {
                const code = getSeatCode(seat);
                const isPreferred = prefSet.has(code);
                seatDiv.dataset.seatCode = code;

                let stateClasses = '';
                let statusLabel = '';

                if (isPreferred && seat.isAvailable) {
                    stateClasses = 'bg-amber-400 text-neutral-950 font-black shadow-[0_0_12px_rgba(251,191,36,0.6)] ring-2 ring-amber-300 ring-offset-1 ring-offset-neutral-900 scale-105';
                    statusLabel = 'Preferred (AVAILABLE)';
                } else if (isPreferred && !seat.isAvailable) {
                    stateClasses = 'bg-red-950/80 border border-red-500/80 text-red-400 opacity-80';
                    statusLabel = 'Preferred (Taken)';
                } else if (seat.isAvailable) {
                    stateClasses = 'bg-emerald-600/90 text-white hover:bg-emerald-500 hover:scale-110 shadow-sm border border-emerald-400/30';
                    statusLabel = 'Available';
                } else {
                    stateClasses = 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/40';
                    statusLabel = 'Taken';
                }

                seatDiv.className = `w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-mono transition-all duration-150 cursor-pointer shrink-0 ${stateClasses}`;
                seatDiv.innerText = seat.SeatNumber || '';
                seatDiv.title = `Seat ${code} • ${statusLabel}`;

                if (interactive && onTogglePreferred) {
                    seatDiv.onclick = (e) => {
                        e.stopPropagation();
                        onTogglePreferred(code);
                    };
                }
            }
            rowDiv.appendChild(seatDiv);
        });

        // Right Row Label
        const rightLabel = document.createElement('span');
        rightLabel.className = 'w-5 text-[11px] font-bold text-neutral-400 text-center shrink-0';
        rightLabel.innerText = rowLabel;
        rowDiv.appendChild(rightLabel);

        gridDiv.appendChild(rowDiv);
    });

    wrapper.appendChild(gridDiv);

    // Legend
    const legendDiv = document.createElement('div');
    legendDiv.className = 'flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-neutral-300';
    legendDiv.innerHTML = `
        <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded bg-amber-400 ring-2 ring-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
            <span class="font-medium text-amber-300">Preferred Free</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-400/30"></span>
            <span>Regular Free</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded bg-red-950 border border-red-500/80"></span>
            <span class="text-neutral-400">Preferred Taken</span>
        </div>
        <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded bg-neutral-800 border border-neutral-700/40"></span>
            <span class="text-neutral-500">Taken</span>
        </div>
    `;
    wrapper.appendChild(legendDiv);

    container.appendChild(wrapper);
}

// Global expose
window.SeatMapModule = {
    getSeatCode,
    analyzeSeats,
    renderSeatMap
};
