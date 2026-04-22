// ===== SEARCH =====

function searchStaff() {
    const q = document.getElementById('search-input').value.trim().toLowerCase();
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
        const match1 = r.p1 && r.p1.name.toLowerCase().includes(q);
        const match2 = r.p2 && r.p2.name.toLowerCase().includes(q);
        if (match1 || match2) {
            if (r.shift === 'day') countDay++; else countNight++;
            dates.push(`${r.date.split(' ')[0]} ${r.date.split(' ')[1]} (${r.shift === 'day' ? 'กะกลางวัน' : 'กะกลางคืน'})`);
        }
    });

    state.globalScheduleRows.forEach((r, i) => {
        const match1 = r.p1 && r.p1.name.toLowerCase().includes(q);
        const match2 = r.p2 && r.p2.name.toLowerCase().includes(q);
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

function searchFrequency() {
    const q = document.getElementById('freq-search').value.trim().toLowerCase();
    const resultBox = document.getElementById('freq-result');

    if (!q) { resultBox.style.display = 'none'; return; }

    let totalDay = 0, totalNight = 0, appearances = 0;

    printHistory.forEach(historyItem => {
        let hasInRound = false;
        historyItem.rows.forEach(r => {
            const match1 = r.p1 && r.p1.name.toLowerCase().includes(q);
            const match2 = r.p2 && r.p2.name.toLowerCase().includes(q);
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
