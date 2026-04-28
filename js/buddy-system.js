// ===== BUDDY SYSTEM =====

function loadBuddyPairs() {
    try {
        const saved = localStorage.getItem('vencheck_buddyPairs');
        if (saved) state.buddyPairs = JSON.parse(saved);
    } catch (e) { state.buddyPairs = []; }
}

function saveBuddyPairs() {
    try { localStorage.setItem('vencheck_buddyPairs', JSON.stringify(state.buddyPairs)); }
    catch (e) { /* quota */ }
}

function addBuddyPair(name1, name2) {
    if (!name1 || !name2 || name1 === name2) {
        showToast('❌ กรุณาเลือกคนละชื่อ 2 คน', 'error');
        return false;
    }
    const exists = state.buddyPairs.some(
        p => (p[0] === name1 && p[1] === name2) || (p[0] === name2 && p[1] === name1)
    );
    if (exists) {
        showToast('❌ คู่บัดดี้นี้มีอยู่แล้ว', 'error');
        return false;
    }
    state.buddyPairs.push([name1, name2]);
    saveBuddyPairs();
    renderBuddyUI();
    showToast(`👥 จับคู่บัดดี้: ${name1.split(' ')[0]} ↔ ${name2.split(' ')[0]}`);
    return true;
}

function removeBuddyPair(index) {
    state.buddyPairs.splice(index, 1);
    saveBuddyPairs();
    renderBuddyUI();
    showToast('🗑️ ลบคู่บัดดี้แล้ว');
}

function renderBuddyUI() {
    const container = document.getElementById('buddy-list');
    if (!container) return;

    if (!state.buddyPairs.length) {
        container.innerHTML = '<div style="text-align:center;padding:8px;font-size:11px;color:#94a3b8;">ยังไม่มีคู่บัดดี้</div>';
    } else {
        container.innerHTML = state.buddyPairs.map((pair, i) => `
            <div class="buddy-pair-card">
                <span class="buddy-icon">👥</span>
                <span class="buddy-names">${pair[0].split(' ').slice(0,2).join(' ')} ↔ ${pair[1].split(' ').slice(0,2).join(' ')}</span>
                <span class="buddy-remove" onclick="removeBuddyPair(${i})" title="ลบคู่">✕</span>
            </div>`).join('');
    }

    // Update select options
    const sel1 = document.getElementById('buddy-sel-1');
    const sel2 = document.getElementById('buddy-sel-2');
    if (sel1 && sel2) {
        const names = state.staffData.map(s => s.name);
        const opts = '<option value="">-- เลือก --</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
        sel1.innerHTML = opts;
        sel2.innerHTML = opts;
    }
}

function getBuddyFor(name) {
    for (const pair of state.buddyPairs) {
        if (pair[0] === name) return pair[1];
        if (pair[1] === name) return pair[0];
    }
    return null;
}

function initBuddyListeners() {
    const addBtn = document.getElementById('btn-add-buddy');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const sel1 = document.getElementById('buddy-sel-1');
            const sel2 = document.getElementById('buddy-sel-2');
            if (sel1 && sel2) {
                addBuddyPair(sel1.value, sel2.value);
                sel1.value = '';
                sel2.value = '';
            }
        });
    }
}
