// ===== SHIFT SWAP / TRANSFER =====

let swapSourceIndex = -1;
let swapTargetIndex = -1;

function openSwapModal(rowIndex) {
    swapSourceIndex = rowIndex;
    swapTargetIndex = -1;
    const row = state.globalScheduleRows[rowIndex];
    if (!row) return;

    const modal = document.getElementById('swap-modal');
    const content = document.getElementById('swap-modal-content');

    const shiftLabel = row.shift === 'day' ? '☀️ กลางวัน' : '🌙 กลางคืน';
    const srcStaff = row.staff && row.staff.length ? row.staff : [row.p1, row.p2].filter(Boolean);
    const srcNames = srcStaff.map(p => p.name).join(', ') || '-';

    let targetsHTML = '';
    state.globalScheduleRows.forEach((r, i) => {
        if (i === rowIndex) return;
        const rShift = r.shift === 'day' ? '☀️' : '🌙';
        const tgtStaff = r.staff && r.staff.length ? r.staff : [r.p1, r.p2].filter(Boolean);
        const tgtNames = tgtStaff.map(p => p.name.split(' ').slice(0,2).join(' ')).join(', ') || '-';
        targetsHTML += `
            <div class="swap-target-item" data-idx="${i}" onclick="selectSwapTarget(${i})">
                <span>${r.date} (${r.day}) ${rShift}</span>
                <span style="color:#475569;">${tgtNames}</span>
            </div>`;
    });

    content.innerHTML = `
        <h3>🔄 สลับ / ย้ายกะเวร</h3>
        <div class="swap-row-preview">
            <div class="label">📌 ต้นทาง (กะที่เลือก)</div>
            <div><strong>${row.date}</strong> ${row.day} — ${shiftLabel}</div>
            <div style="margin-top:4px;">ผู้เข้าเวร: <strong>${srcNames}</strong></div>
        </div>
        <div class="swap-row-preview">
            <div class="label">🎯 เลือกกะปลายทางที่ต้องการสลับ</div>
            <div class="swap-target-list" id="swap-target-list">${targetsHTML}</div>
        </div>
        <div id="swap-balance-info"></div>
        <div class="modal-actions" style="margin-top:16px;">
            <button class="btn-secondary" onclick="closeSwapModal()">ยกเลิก</button>
            <button class="btn-primary" id="btn-confirm-swap" disabled onclick="confirmSwap()">✅ ยืนยันสลับ</button>
        </div>`;

    modal.classList.add('active');
}

function selectSwapTarget(idx) {
    swapTargetIndex = idx;
    document.querySelectorAll('.swap-target-item').forEach(el => {
        el.classList.toggle('selected', parseInt(el.dataset.idx) === idx);
    });
    document.getElementById('btn-confirm-swap').disabled = false;
    checkSwapBalance();
}

function checkSwapBalance() {
    const info = document.getElementById('swap-balance-info');
    if (swapSourceIndex < 0 || swapTargetIndex < 0) return;

    // Count shifts per person before swap
    const countMap = {};
    state.globalScheduleRows.forEach(r => {
        const staffArr = r.staff && r.staff.length ? r.staff : [r.p1, r.p2].filter(Boolean);
        staffArr.forEach(p => { countMap[p.name] = (countMap[p.name] || 0) + 1; });
    });

    const counts = Object.values(countMap);
    const max = Math.max(...counts), min = Math.min(...counts);
    const diff = max - min;

    if (diff > 3) {
        info.innerHTML = `<div class="balance-warning">⚠️ ความเตือน: หลังสลับ ความต่างของจำนวนเวรระหว่างพนักงานอาจเกิน 3 ครั้ง (ปัจจุบัน max-min = ${diff})</div>`;
    } else {
        info.innerHTML = `<div style="margin-top:8px;font-size:11px;color:#059669;">✅ ความสมดุลปกติ (ความต่าง ${diff} ครั้ง)</div>`;
    }
}

function confirmSwap() {
    if (swapSourceIndex < 0 || swapTargetIndex < 0) return;

    const src = state.globalScheduleRows[swapSourceIndex];
    const tgt = state.globalScheduleRows[swapTargetIndex];

    // Swap the staff arrays
    const tmpStaff = src.staff;
    const tmpP1 = src.p1;
    const tmpP2 = src.p2;
    src.staff = tgt.staff;
    src.p1 = tgt.p1;
    src.p2 = tgt.p2;
    tgt.staff = tmpStaff;
    tgt.p1 = tmpP1;
    tgt.p2 = tmpP2;

    // Re-render table
    renderTablePage();
    closeSwapModal();

    // Save updated schedule
    try {
        localStorage.setItem('vencheck_currentSchedule', JSON.stringify(state.globalScheduleRows));
    } catch (e) { /* quota */ }

    showToast('✅ สลับกะเวรสำเร็จ');
    autoBalanceCheck();
}

function autoBalanceCheck() {
    const countMap = {};
    state.globalScheduleRows.forEach(r => {
        const staffArr = r.staff && r.staff.length ? r.staff : [r.p1, r.p2].filter(Boolean);
        staffArr.forEach(p => { countMap[p.name] = (countMap[p.name] || 0) + 1; });
    });
    const counts = Object.values(countMap);
    if (!counts.length) return;
    const max = Math.max(...counts), min = Math.min(...counts);
    if (max - min > 3) {
        showToast(`⚠️ ความสมดุลไม่ดี: คนเข้าเวรมากสุด ${max} ครั้ง, น้อยสุด ${min} ครั้ง`, 'error');
    }
}

function closeSwapModal() {
    const modal = document.getElementById('swap-modal');
    if (modal) modal.classList.remove('active');
    swapSourceIndex = -1;
    swapTargetIndex = -1;
}
