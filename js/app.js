// ===== ADMIN APP BOOTSTRAP =====

// Collapse multiple spaces, trim, lowercase — applied to both query and stored names
function normalizeSearch(s) {
    return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Reusable autocomplete dropdown for admin search inputs.
// getNames(): called on each keystroke, returns current candidate name list.
// onConfirm(): called when user selects a name (input already contains the chosen value).
function buildAdminAutocomplete(inputId, getNames, onConfirm) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Wrap input in a position:relative container so the dropdown anchors correctly.
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:block;';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const list = document.createElement('ul');
    list.style.cssText = [
        'position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:9999',
        'margin:0;padding:4px 0;list-style:none',
        'background:rgba(15,23,42,0.93);backdrop-filter:blur(20px) saturate(1.8)',
        'border:1px solid rgba(255,255,255,0.14);border-radius:10px',
        'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
        'max-height:200px;overflow-y:auto;display:none'
    ].join(';');
    wrapper.appendChild(list);

    let activeIdx = -1;

    function closeList() {
        list.style.display = 'none';
        list.innerHTML = '';
        activeIdx = -1;
    }

    function setActive(idx) {
        const items = list.querySelectorAll('li');
        items.forEach((li, i) => {
            li.style.background = i === idx ? 'rgba(14,165,233,0.32)' : 'transparent';
        });
        activeIdx = idx;
    }

    function renderList(matches) {
        list.innerHTML = '';
        activeIdx = -1;
        if (matches.length === 0) { list.style.display = 'none'; return; }
        matches.forEach((name, idx) => {
            const li = document.createElement('li');
            li.textContent = name;
            li.style.cssText = [
                'padding:8px 14px;cursor:pointer;font-size:13px',
                'color:rgba(255,255,255,0.92);font-family:Sarabun,sans-serif',
                'white-space:nowrap;overflow:hidden;text-overflow:ellipsis',
                'transition:background 0.1s'
            ].join(';');
            li.addEventListener('mouseenter', () => setActive(idx));
            li.addEventListener('mousedown', e => {
                e.preventDefault(); // keep focus on input
                input.value = name;
                closeList();
                onConfirm();
            });
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    input.addEventListener('input', () => {
        const q = normalizeSearch(input.value);
        if (!q) { closeList(); return; }
        const matches = getNames().filter(n => normalizeSearch(n).includes(q));
        renderList(matches);
    });

    input.addEventListener('keydown', e => {
        const items = list.querySelectorAll('li');
        const listOpen = list.style.display !== 'none' && items.length > 0;

        if (e.key === 'ArrowDown') {
            if (!listOpen) return;
            e.preventDefault();
            setActive(Math.min(activeIdx + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            if (!listOpen) return;
            e.preventDefault();
            setActive(Math.max(activeIdx - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (listOpen && activeIdx >= 0) {
                input.value = items[activeIdx].textContent;
            }
            closeList();
            onConfirm();
        } else if (e.key === 'Escape') {
            closeList();
        }
    });

    document.addEventListener('click', e => {
        if (!wrapper.contains(e.target)) closeList();
    });
}

// Override searchStaff from search.js with normalized matching
function searchStaff() {
    const q = normalizeSearch(document.getElementById('search-input').value);
    const box = document.getElementById('search-result-box');
    const tbody = document.getElementById('schedule-body');
    if (!tbody) return;

    const trs = tbody.querySelectorAll('tr');

    if (!q) {
        box.style.display = 'none';
        trs.forEach(tr => { tr.style.opacity = '1'; tr.style.background = ''; });
        return;
    }

    let countDay = 0, countNight = 0;
    const dates = [];

    state.globalScheduleRows.forEach(r => {
        const match1 = r.p1 && normalizeSearch(r.p1.name).includes(q);
        const match2 = r.p2 && normalizeSearch(r.p2.name).includes(q);
        if (match1 || match2) {
            if (r.shift === 'day') countDay++; else countNight++;
            dates.push(`${r.date.split(' ')[0]} ${r.date.split(' ')[1]} (${r.shift === 'day' ? 'กะกลางวัน' : 'กะกลางคืน'})`);
        }
    });

    state.globalScheduleRows.forEach((r, i) => {
        const match1 = r.p1 && normalizeSearch(r.p1.name).includes(q);
        const match2 = r.p2 && normalizeSearch(r.p2.name).includes(q);
        if (trs[i]) {
            trs[i].style.opacity = (match1 || match2) ? '1' : '0.3';
            trs[i].style.background = (match1 || match2) ? 'rgba(147,197,253,0.3)' : '';
        }
    });

    const total = countDay + countNight;
    box.style.display = 'block';
    if (total > 0) {
        box.innerHTML = `
            <div style="font-weight:700;color:#0f172a;margin-bottom:6px;font-size:14px;display:flex;align-items:center;gap:6px;">
                <span>🎯</span> สรุปจำนวนเวรของ: <span style="color:#0284c7;">"${q}"</span>
            </div>
            <div style="font-size:13px;color:#1e293b;margin-bottom:8px;border-bottom:1px dashed #cbd5e1;padding-bottom:8px;">
                <strong>รวมทั้งหมด: <span style="font-size:15px;color:#0369a1;">${total}</span> ครั้ง / รอบนี้</strong>
                (ผลัดกลางวัน <span style="color:#c2410c">${countDay}</span> ครั้ง, ผลัดกลางคืน <span style="color:#4338ca">${countNight}</span> ครั้ง)
            </div>
            <div style="font-size:12px;color:#334155;line-height:1.6;">
                <strong>📅 วันที่เข้าเวร:</strong> ${dates.length > 0 ? dates.join(', ') : '-'}
            </div>`;
    } else {
        box.innerHTML = `<div style="font-size:13px;color:#ef4444;font-weight:600;">❌ ไม่พบรายชื่อที่มีคำว่า "${q}" ในตารางรอบนี้</div>`;
    }
}

// Override searchFrequency from search.js with normalized matching
function searchFrequency() {
    const q = normalizeSearch(document.getElementById('freq-search').value);
    const resultBox = document.getElementById('freq-result');

    if (!q) { resultBox.style.display = 'none'; return; }

    let totalDay = 0, totalNight = 0, appearances = 0;

    printHistory.forEach(historyItem => {
        let hasInRound = false;
        historyItem.rows.forEach(r => {
            const match1 = r.p1 && normalizeSearch(r.p1.name).includes(q);
            const match2 = r.p2 && normalizeSearch(r.p2.name).includes(q);
            if (match1 || match2) {
                if (r.shift === 'day') totalDay++; else totalNight++;
                hasInRound = true;
            }
        });
        if (hasInRound) appearances++;
    });

    resultBox.style.display = 'block';
    if (totalDay + totalNight === 0) {
        resultBox.innerHTML = `<div style="color:#ef4444;font-weight:600;text-align:center;">ไม่พบข้อมูลชื่อ "${q}" ในประวัติ</div>`;
    } else {
        resultBox.innerHTML = `
            <div style="font-weight:700;color:#0f172a;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
                📊 ความถี่สะสม: <span style="color:#0369a1;">"${q}"</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span>รวมทั้งหมด:</span>
                <span style="font-weight:700;color:#0369a1;">${totalDay + totalNight} ครั้ง</span>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:8px;">
                <span class="freq-badge freq-day">☀️ กลางวัน: ${totalDay}</span>
                <span class="freq-badge freq-night">🌙 กลางคืน: ${totalNight}</span>
            </div>
            <div style="font-size:10px;color:#64748b;font-style:italic;">
                *คำนวณจากประวัติการพิมพ์ที่บันทึกไว้ ${appearances} รอบ
            </div>`;
    }
}

function initDatePickers() {
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth();
    const first = new Date(y, m, 1);
    const last  = new Date(y, m + 1, 0);

    const populate = (prefix, defaultDate) => {
        const dSel = document.getElementById(`${prefix}-d`);
        const mSel = document.getElementById(`${prefix}-m`);
        const ySel = document.getElementById(`${prefix}-y`);
        for (let i = 1; i <= 31; i++) dSel.innerHTML += `<option value="${i}">${i}</option>`;
        THAI_MONTHS_FULL.forEach((mName, i) => mSel.innerHTML += `<option value="${i}">${mName}</option>`);
        for (let i = y - 1; i <= y + 2; i++) ySel.innerHTML += `<option value="${i}">${i + 543}</option>`;
        dSel.value = defaultDate.getDate();
        mSel.value = defaultDate.getMonth();
        ySel.value = defaultDate.getFullYear();
    };

    populate('start', first);
    populate('end', last);
}

function initHamburger() {
    const btn  = document.getElementById('btn-hamburger');
    const menu = document.getElementById('hamburger-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', e => {
        e.stopPropagation();
        menu.classList.toggle('open');
    });

    document.addEventListener('click', e => {
        if (!menu.contains(e.target) && e.target !== btn) {
            menu.classList.remove('open');
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') menu.classList.remove('open');
    });
}

function initChangePasswordModal() {
    const modal    = document.getElementById('change-pw-modal');
    const btnOpen  = document.getElementById('btn-change-pw');
    const btnClose = document.getElementById('btn-pw-cancel');
    const btnSave  = document.getElementById('btn-pw-save');
    const errMsg   = document.getElementById('pw-error');
    const menu     = document.getElementById('hamburger-menu');

    btnOpen.addEventListener('click', () => {
        if (menu) menu.classList.remove('open');
        document.getElementById('pw-old').value = '';
        document.getElementById('pw-new').value = '';
        document.getElementById('pw-confirm').value = '';
        errMsg.textContent = '';
        modal.classList.add('active');
    });

    btnClose.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    btnSave.addEventListener('click', () => {
        const oldVal  = document.getElementById('pw-old').value;
        const newVal  = document.getElementById('pw-new').value.trim();
        const confVal = document.getElementById('pw-confirm').value.trim();

        if (!oldVal) { errMsg.textContent = 'กรุณาใส่รหัสผ่านปัจจุบัน'; return; }
        if (!newVal) { errMsg.textContent = 'กรุณาใส่รหัสผ่านใหม่'; return; }
        if (newVal.length < 6) { errMsg.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'; return; }
        if (newVal !== confVal) { errMsg.textContent = 'รหัสผ่านใหม่ไม่ตรงกัน'; return; }

        if (!changePassword(oldVal, newVal)) {
            errMsg.textContent = 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
            return;
        }

        modal.classList.remove('active');
        showToast('✅ เปลี่ยนรหัสผ่านสำเร็จ');
    });
}

// ===== SHIFT CONFIG =====

function renderShiftTags() {
    const container = document.getElementById('shift-tags');
    if (!container) return;
    container.innerHTML = state.shiftCategories.map((cat, i) => `
        <span class="shift-tag">
            ${cat.icon || '🏷️'} ${cat.label}
            ${i >= 2 ? `<span class="remove-tag" onclick="removeShiftCategory(${i})">✕</span>` : ''}
        </span>`).join('');
}

function addShiftCategory() {
    const input = document.getElementById('new-shift-name');
    const name = (input.value || '').trim();
    if (!name) { showToast('❌ กรุณาใส่ชื่อกะ', 'error'); return; }
    const id = 'custom_' + Date.now();
    state.shiftCategories.push({ id, label: name, icon: '🏷️' });
    renderShiftTags();
    input.value = '';
    showToast(`✅ เพิ่มกะ "${name}" แล้ว`);
}

function removeShiftCategory(index) {
    if (index < 2) return; // Don't remove default day/night
    const removed = state.shiftCategories.splice(index, 1);
    renderShiftTags();
    showToast(`🗑️ ลบกะ "${removed[0].label}" แล้ว`);
}

function updateStaffPerShift() {
    const input = document.getElementById('staff-per-shift');
    if (!input) return;
    const val = parseInt(input.value) || 2;
    state.staffPerShift = Math.max(1, Math.min(10, val));
    input.value = state.staffPerShift;

    // Update UI labels
    const rulesLabel = document.getElementById('rules-per-shift');
    const thLabel = document.getElementById('th-per-shift');
    if (rulesLabel) rulesLabel.textContent = state.staffPerShift;
    if (thLabel) thLabel.textContent = state.staffPerShift;
}

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    renderHistoryUI();
    initDatePickers();
    initImportListeners();
    initHamburger();
    initChangePasswordModal();

    // Load buddy pairs
    if (typeof loadBuddyPairs === 'function') {
        loadBuddyPairs();
        renderBuddyUI();
        initBuddyListeners();
    }

    // Shift config
    renderShiftTags();
    const staffPerShiftInput = document.getElementById('staff-per-shift');
    if (staffPerShiftInput) {
        staffPerShiftInput.addEventListener('change', updateStaffPerShift);
        staffPerShiftInput.addEventListener('input', updateStaffPerShift);
    }
    const addShiftBtn = document.getElementById('btn-add-shift');
    if (addShiftBtn) addShiftBtn.addEventListener('click', addShiftCategory);
    const newShiftInput = document.getElementById('new-shift-name');
    if (newShiftInput) newShiftInput.addEventListener('keydown', e => { if (e.key === 'Enter') addShiftCategory(); });

    // Swap modal close
    const swapModal = document.getElementById('swap-modal');
    if (swapModal) {
        swapModal.addEventListener('click', e => {
            if (e.target === swapModal) closeSwapModal();
        });
    }

    document.getElementById('btn-generate').addEventListener('click', generateSchedule);
    document.getElementById('btn-print').addEventListener('click', handlePrint);
    document.getElementById('btn-prev').addEventListener('click', () => changePage(-1));
    document.getElementById('btn-next').addEventListener('click', () => changePage(1));
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
    document.getElementById('btn-demo').addEventListener('click', loadDemoData);

    // Quick random
    const btnQuickRandom = document.getElementById('btn-quick-random');
    if (btnQuickRandom) btnQuickRandom.addEventListener('click', quickRandomAssign);

    // Autocomplete for schedule table search — names sourced from current schedule rows
    buildAdminAutocomplete(
        'search-input',
        () => {
            const names = new Set();
            state.globalScheduleRows.forEach(r => {
                if (r.p1?.name) names.add(r.p1.name);
                if (r.p2?.name) names.add(r.p2.name);
            });
            return [...names].sort((a, b) => a.localeCompare(b, 'th'));
        },
        () => searchStaff()
    );

    // Autocomplete for history frequency search — names sourced from all history records
    buildAdminAutocomplete(
        'freq-search',
        () => {
            const names = new Set();
            printHistory.forEach(item => {
                item.rows.forEach(r => {
                    if (r.p1?.name) names.add(r.p1.name);
                    if (r.p2?.name) names.add(r.p2.name);
                });
            });
            return [...names].sort((a, b) => a.localeCompare(b, 'th'));
        },
        () => searchFrequency()
    );
});

