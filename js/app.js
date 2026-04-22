// ===== ADMIN APP BOOTSTRAP =====

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

function initChangePasswordModal() {
    const modal    = document.getElementById('change-pw-modal');
    const btnOpen  = document.getElementById('btn-change-pw');
    const btnClose = document.getElementById('btn-pw-cancel');
    const btnSave  = document.getElementById('btn-pw-save');
    const errMsg   = document.getElementById('pw-error');

    btnOpen.addEventListener('click', () => {
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

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    renderHistoryUI();
    initDatePickers();
    initImportListeners();
    initChangePasswordModal();

    document.getElementById('btn-generate').addEventListener('click', generateSchedule);
    document.getElementById('btn-print').addEventListener('click', handlePrint);
    document.getElementById('btn-prev').addEventListener('click', () => changePage(-1));
    document.getElementById('btn-next').addEventListener('click', () => changePage(1));
    document.getElementById('search-input').addEventListener('input', searchStaff);
    document.getElementById('freq-search').addEventListener('input', searchFrequency);
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
    document.getElementById('btn-demo').addEventListener('click', loadDemoData);
});
