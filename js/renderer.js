// ===== RENDERER =====

function updatePreview() {
    const prev = document.getElementById('staff-preview');
    document.getElementById('staff-count').textContent = state.staffData.length;
    if (!state.staffData.length) {
        prev.innerHTML = '<div style="text-align:center;padding:16px;font-size:12px;color:#94a3b8;">ยังไม่มีข้อมูล</div>';
        return;
    }
    prev.innerHTML = state.staffData.map((s, index) => `
        <div class="staff-item" style="justify-content:flex-start;padding:7px 10px;margin-bottom:5px;border-radius:6px;border:1px solid ${s.gender === 'M' ? '#bfdbfe' : '#fbcfe8'};background-color:${s.gender === 'M' ? '#eff6ff' : '#fdf2f8'};border-bottom:none;">
            <span style="font-size:11.5px;color:${s.gender === 'M' ? '#3b82f6' : '#ec4899'};font-weight:700;width:24px;text-align:right;margin-right:8px;">${index + 1}.</span>
            <span class="staff-name" style="font-size:13px;color:${s.gender === 'M' ? '#1e3a8a' : '#831843'};">${s.name}</span>
        </div>`).join('');
}

function updateInspectorList() {
    document.getElementById('inspector-count').textContent = state.inspectorData.length;
    const prev = document.getElementById('inspector-preview');
    if (!state.inspectorData.length) {
        prev.innerHTML = '<div style="text-align:center;padding:16px;font-size:12px;color:#94a3b8;">ยังไม่มีผู้ตรวจเวร</div>';
        return;
    }
    prev.innerHTML = state.inspectorData.map((ins, index) => `
        <div class="staff-item" style="justify-content:flex-start;padding:5px 8px;margin-bottom:4px;border-radius:4px;border:1px solid #dcfce7;background-color:#f0fdf4;border-bottom:none;">
            <span style="font-size:11px;color:#166534;font-weight:700;width:20px;text-align:right;margin-right:6px;">${index + 1}.</span>
            <span class="staff-name" style="font-size:12px;color:#14532d;font-weight:600;">${ins.name}</span>
        </div>`).join('');
}

function renderTable(rows, startObj, endObj) {
    state.globalScheduleRows = rows;
    state.currentPage = 1;

    const s = startObj, e = endObj;
    document.getElementById('print-title').textContent =
        `ตารางเวรประจำเดือน ${THAI_MONTHS[s.getMonth()]} ${s.getFullYear() + 543}` +
        (s.getMonth() !== e.getMonth() ? ` – ${THAI_MONTHS[e.getMonth()]} ${e.getFullYear() + 543}` : '');
    document.getElementById('print-subtitle').textContent =
        `ช่วง ${formatDateThai(s)} ถึง ${formatDateThai(e)} | จำนวน ${rows.length} ผลัด`;

    document.getElementById('result-summary').innerHTML = `
        <span style="font-weight:700;color:#0369a1;">(${rows.length} ผลัด)</span>
        <span style="margin-left:12px;color:#475569;font-size:12px;display:inline-block;background:rgba(255,255,255,0.6);padding:2px 8px;border-radius:12px;">
            ความถี่เข้าเวรต่อคน (รอบนี้): กลางวัน ≈ ${state.globalStats.avgDay} | กลางคืน ≈ ${state.globalStats.avgNight} ครั้ง
        </span>`;

    renderTablePage();

    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`✅ จัดตารางสำเร็จ ${rows.length} ผลัด`);
}

function renderTablePage() {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';

    const totalPages = Math.ceil(state.globalScheduleRows.length / ROWS_PER_PAGE) || 1;
    if (state.currentPage < 1) state.currentPage = 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const startIdx = (state.currentPage - 1) * ROWS_PER_PAGE;
    const endIdx = startIdx + ROWS_PER_PAGE;

    if (!state.globalScheduleRows.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">ไม่มีข้อมูล</td></tr>';
    } else {
        state.globalScheduleRows.forEach((r, i) => {
            const tr = document.createElement('tr');
            let rowClass = r.weekend
                ? (r.shift === 'day' ? 'row-weekend-day' : 'row-weekend-night')
                : 'row-weekday';
            const isVisible = i >= startIdx && i < endIdx;
            tr.className = rowClass + (isVisible ? '' : ' page-hidden');

            let shiftBadge;
            if (r.shift === 'day') shiftBadge = `<span class="shift-badge shift-day" title="กลางวัน">☀️</span>`;
            else if (r.shift === 'night') shiftBadge = `<span class="shift-badge shift-night" title="กลางคืน">🌙</span>`;
            else shiftBadge = `<span class="shift-badge shift-weekday-night" title="กลางคืน">🌙</span>`;

            const formatPersonInline = (p, idx) => {
                if (!p) return '';
                let sub = [];
                if (p.position && p.position !== '-') sub.push(`<span style="display:inline-block;white-space:nowrap;">${p.position}</span>`);
                if (p.type && p.type !== '-') sub.push(`<span style="display:inline-block;white-space:nowrap;">${p.type}</span>`);
                if (p.department && p.department !== '-') sub.push(`<span style="display:inline-block;white-space:nowrap;">${p.department}</span>`);
                const subH = sub.length > 0 ? `<div style="font-size:10.5px;color:#4b5563;font-weight:400;margin-top:2px;line-height:1.4;max-width:280px;margin-left:auto;margin-right:auto;">(${sub.join(' · ')})</div>` : '';
                return `<div style="text-align:center;font-weight:600;font-size:13px;margin-bottom:${idx === 1 ? '14px' : '0'};">
                           <div style="color:#0f172a;line-height:1.2;"><span style="color:#64748b;font-size:11px;">${idx}.</span> ${p.name}</div>
                           ${subH}
                        </div>`;
            };

            const formatInspectorCell = insp => {
                if (!insp) return '';
                return `<div style="font-weight:600;font-size:13px;color:#0f172a;line-height:1.4;max-width:190px;margin:0 auto;">${insp.name}</div>`;
            };

            tr.innerHTML = `
                <td style="white-space:nowrap;font-size:11.5px;text-align:center;">${r.date}</td>
                <td style="font-weight:700;color:${r.weekend ? '#c2410c' : '#1d4ed8'};text-align:center;">${r.day}</td>
                <td style="text-align:center;">${shiftBadge}</td>
                <td style="padding:10px 4px;">${formatPersonInline(r.p1, 1)}${formatPersonInline(r.p2, 2)}</td>
                <td style="padding:6px 8px !important;text-align:center;vertical-align:middle;">${formatInspectorCell(r.insp)}</td>
                <td></td>`;
            tbody.appendChild(tr);
        });
    }

    const pInfo = document.getElementById('page-info');
    if (pInfo) {
        pInfo.textContent = `หน้า ${state.currentPage} / ${totalPages}`;
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        btnPrev.disabled = state.currentPage === 1;
        btnNext.disabled = state.currentPage === totalPages;
        btnPrev.style.opacity = state.currentPage === 1 ? '0.5' : '1';
        btnNext.style.opacity = state.currentPage === totalPages ? '0.5' : '1';
        btnPrev.style.pointerEvents = state.currentPage === 1 ? 'none' : 'auto';
        btnNext.style.pointerEvents = state.currentPage === totalPages ? 'none' : 'auto';
    }
}

function changePage(delta) {
    state.currentPage += delta;
    renderTablePage();
    searchStaff();
}
