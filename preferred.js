/**
 * preferred.js - Preferred viewing area management and configuration modal
 */

const STORAGE_KEY = 'cinema_preferred_seats';

const PRESETS = {
    colombo_imax_prime: {
        name: 'IMAX Center Prime (E17-E18, F17-F18)',
        seats: ['E17', 'E18', 'F17', 'F18']
    },
    colombo_imax_center: {
        name: 'IMAX Sweet Spot (Rows E-F, 16-19)',
        seats: ['E16', 'E17', 'E18', 'E19', 'F16', 'F17', 'F18', 'F19']
    },
    colombo_imax_wide: {
        name: 'IMAX Wide Center (Rows D-G, 15-20)',
        seats: [
            'D15', 'D16', 'D17', 'D18', 'D19', 'D20',
            'E15', 'E16', 'E17', 'E18', 'E19', 'E20',
            'F15', 'F16', 'F17', 'F18', 'F19', 'F20',
            'G15', 'G16', 'G17', 'G18', 'G19', 'G20'
        ]
    }
};

let preferredSeatsSet = new Set(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(PRESETS.colombo_imax_center.seats))
);

function getPreferredSeats() {
    return preferredSeatsSet;
}

function savePreferredSeats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...preferredSeatsSet]));
    updatePreferredSeatsPill();
}

function updatePreferredSeatsPill() {
    const pill = document.getElementById('preferred-seats-summary');
    if (pill) {
        const count = preferredSeatsSet.size;
        const preview = [...preferredSeatsSet].slice(0, 4).join(', ');
        pill.innerText = `${count} Seats: ${preview}${count > 4 ? '...' : ''}`;
    }
}

function openPreferredModal() {
    const modal = document.getElementById('preferred-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderModalPreferredChips();

    const blueprintContainer = document.getElementById('modal-seatmap-blueprint');
    if (window.state?.sampleQueues) {
        SeatMapModule.renderSeatMap(blueprintContainer, window.state.sampleQueues, {
            preferredSeats: preferredSeatsSet,
            interactive: true,
            onTogglePreferred: (code) => {
                if (preferredSeatsSet.has(code)) {
                    preferredSeatsSet.delete(code);
                } else {
                    preferredSeatsSet.add(code);
                }
                savePreferredSeats();
                openPreferredModal();
            }
        });
    } else {
        blueprintContainer.innerHTML = '<div class="py-6 text-center text-xs text-neutral-400">Inspect any movie session first to preview blueprint.</div>';
    }
}

function closePreferredModal() {
    const modal = document.getElementById('preferred-modal');
    if (modal) modal.classList.add('hidden');
    if (window.onPreferredSeatsChanged) {
        window.onPreferredSeatsChanged();
    }
}

function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (preset) {
        preferredSeatsSet = new Set(preset.seats);
        savePreferredSeats();
        openPreferredModal();
    }
}

function removePreferredSeat(code) {
    preferredSeatsSet.delete(code);
    savePreferredSeats();
    openPreferredModal();
}

function renderModalPreferredChips() {
    const list = document.getElementById('preferred-chips-list');
    if (!list) return;
    list.innerHTML = '';
    [...preferredSeatsSet].sort().forEach(code => {
        const chip = document.createElement('span');
        chip.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold';
        chip.innerHTML = `${code} <button class="hover:text-red-400 ml-0.5" onclick="removePreferredSeat('${code}')">&times;</button>`;
        list.appendChild(chip);
    });
}

window.PreferredModule = {
    getPreferredSeats,
    savePreferredSeats,
    updatePreferredSeatsPill,
    openPreferredModal,
    closePreferredModal,
    applyPreset,
    removePreferredSeat
};
