// ===== HISTORY =====
let printHistory = [];

function loadHistory() {
    const saved = localStorage.getItem('vencheck_history');
    if (saved) {
        try { printHistory = JSON.parse(saved); } catch (e) { printHistory = []; }
    }
}

function saveToHistory() {
    if (!state.globalScheduleRows.length) return;
    const historyData = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('th-TH'),
        title: document.getElementById('print-title').textContent,
        subtitle: document.getElementById('print-subtitle').textContent,
        rows: JSON.parse(JSON.stringify(state.globalScheduleRows)),
        stats: JSON.parse(JSON.stringify(state.globalStats))
    };
    printHistory.unshift(historyData);
    if (printHistory.length > 50) printHistory.pop();
    localStorage.setItem('vencheck_history', JSON.stringify(printHistory));
    renderHistoryUI();
    showToast('💾 บันทึกประวัติการพิมพ์เรียบร้อย');
}

function renderHistoryUI() {
    const container = document.getElementById('history-list');
    if (!printHistory.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px;font-size:11px;color:#64748b;font-style:italic;">ไม่มีประวัติการพิมพ์</div>';
        return;
    }
    container.innerHTML = printHistory.map((item, index) => `
        <div class="history-card" data-index="${index}">
            <div class="meta">📌 ${item.timestamp}</div>
            <div class="title">${item.title}</div>
            <div style="font-size:10px;color:#0369a1;margin-top:4px;">(${item.rows.length} ผลัด / คลิกเพื่อเรียกคืน)</div>
        </div>`).join('');

    container.querySelectorAll('.history-card').forEach(card => {
        card.addEventListener('click', () => restoreFromHistory(parseInt(card.dataset.index)));
    });
}

function restoreFromHistory(index) {
    const item = printHistory[index];
    if (!item) return;
    if (confirm(`เรียกคืนตาราง "${item.title}" (${item.timestamp})?`)) {
        state.globalScheduleRows = item.rows;
        state.globalStats = item.stats;
        document.getElementById('print-title').textContent = item.title;
        document.getElementById('print-subtitle').textContent = item.subtitle;
        renderTable(state.globalScheduleRows, new Date(), new Date());
        showToast('🔄 เรียกคืนข้อมูลสำเร็จ');
    }
}

function clearHistory() {
    if (confirm('คุณต้องการลบประวัติการพิมพ์ทั้งหมดใช่หรือไม่?')) {
        printHistory = [];
        localStorage.removeItem('vencheck_history');
        renderHistoryUI();
        showToast('🗑️ ลบประวัติทั้งหมดแล้ว');
    }
}

function handlePrint() {
    saveToHistory();

    // ล้าง filter ก่อนพิมพ์ เพื่อให้ตารางพิมพ์ออกมาครบทุก row และสีสม่ำเสมอ
    const searchInput = document.getElementById('search-input');
    const resultBox   = document.getElementById('search-result-box');
    const savedQuery  = searchInput ? searchInput.value : '';

    if (savedQuery) {
        // Reset row styles ชั่วคราว
        const trs = document.querySelectorAll('#schedule-body tr');
        trs.forEach(tr => { tr.style.opacity = '1'; tr.style.background = ''; });
        if (resultBox) resultBox.style.display = 'none';
    }

    window.print();

    // คืนค่า filter หลังพิมพ์เสร็จ (dialog ปิดแล้ว)
    if (savedQuery && typeof searchStaff === 'function') {
        searchStaff();
    }
}
