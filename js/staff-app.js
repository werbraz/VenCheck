// ===== STAFF PAGE =====

let staffScheduleRows = [];
let staffList = [];

function loadStaffData() {
    try {
        const sd = localStorage.getItem('vencheck_staffData');
        const sc = localStorage.getItem('vencheck_currentSchedule');
        if (sd) staffList = JSON.parse(sd);
        if (sc) staffScheduleRows = JSON.parse(sc);
    } catch (e) {
        staffList = [];
        staffScheduleRows = [];
    }
}

function searchMySchedule() {
    const q = document.getElementById('staff-name-input').value.trim();
    const resultSection = document.getElementById('staff-result-section');
    const errBox = document.getElementById('staff-search-error');

    errBox.textContent = '';
    resultSection.style.display = 'none';

    if (!q) { errBox.textContent = 'กรุณาพิมพ์ชื่อ-สกุลของคุณ'; return; }
    if (!staffScheduleRows.length) {
        errBox.textContent = 'ยังไม่มีตารางเวรจากผู้ดูแลระบบ กรุณาติดต่อ Admin';
        return;
    }

    const qLower = q.toLowerCase();
    const matched = staffList.find(s => s.name.toLowerCase().includes(qLower));
    if (!matched) {
        errBox.textContent = `ไม่พบชื่อ "${q}" ในระบบ กรุณาตรวจสอบชื่อ-สกุล`;
        return;
    }

    const myRows = staffScheduleRows.filter(r =>
        (r.p1 && r.p1.name.toLowerCase().includes(qLower)) ||
        (r.p2 && r.p2.name.toLowerCase().includes(qLower))
    );

    const now = new Date();
    const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

    let upcomingDay = 0, upcomingNight = 0, upcomingTotal = 0;

    myRows.forEach(r => {
        // Parse Thai date back to JS Date for comparison
        const rowDate = parseThaiBuddhistDate(r.date);
        if (rowDate && rowDate >= now && rowDate <= threeMonthsLater) {
            if (r.shift === 'day') upcomingDay++;
            else upcomingNight++;
            upcomingTotal++;
        }
    });

    renderStaffResult(matched.name, myRows, upcomingDay, upcomingNight, upcomingTotal);
    resultSection.style.display = 'block';
}

function parseThaiBuddhistDate(thaiDateStr) {
    // Format: "D เดือน YYYY+543", e.g. "22 เม.ย. 2568"
    const monthMap = {
        'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
        'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7,
        'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
    };
    const parts = thaiDateStr.trim().split(' ');
    if (parts.length < 3) return null;
    const day = parseInt(parts[0]);
    const month = monthMap[parts[1]];
    const year = parseInt(parts[2]) - 543;
    if (isNaN(day) || month === undefined || isNaN(year)) return null;
    return new Date(year, month, day);
}

function renderStaffResult(name, rows, upcomingDay, upcomingNight, upcomingTotal) {
    document.getElementById('result-name').textContent = name;

    // Summary cards
    document.getElementById('sum-total').textContent = upcomingTotal;
    document.getElementById('sum-day').textContent = upcomingDay;
    document.getElementById('sum-night').textContent = upcomingNight;

    // Table
    const tbody = document.getElementById('staff-schedule-body');
    tbody.innerHTML = '';

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">ไม่มีตารางเวรที่พบ</td></tr>';
        return;
    }

    rows.forEach(r => {
        const tr = document.createElement('tr');
        let rowClass = r.weekend
            ? (r.shift === 'day' ? 'row-weekend-day' : 'row-weekend-night')
            : 'row-weekday';
        tr.className = rowClass;

        let shiftLabel, shiftBadge;
        if (r.shift === 'day') {
            shiftLabel = 'กลางวัน';
            shiftBadge = `<span class="shift-badge shift-day">☀️</span>`;
        } else {
            shiftLabel = 'กลางคืน';
            shiftBadge = `<span class="shift-badge shift-${r.shift === 'night' ? 'night' : 'weekday-night'}">🌙</span>`;
        }

        const partner = r.p1 && r.p1.name !== r.p2?.name
            ? [r.p1, r.p2].filter(p => p && !p.name.toLowerCase().includes(
                document.getElementById('staff-name-input').value.trim().toLowerCase()
              )).map(p => p.name).join(', ')
            : '-';

        const inspectorName = r.insp ? r.insp.name : '-';

        tr.innerHTML = `
            <td style="white-space:nowrap;font-size:12px;text-align:center;">${r.date}</td>
            <td style="font-weight:700;color:${r.weekend ? '#c2410c' : '#1d4ed8'};text-align:center;">${r.day}</td>
            <td style="text-align:center;">${shiftBadge}</td>
            <td style="font-size:12px;color:#334155;">${partner || '-'}</td>
            <td style="font-size:12px;color:#0f172a;font-weight:600;text-align:center;">${inspectorName}</td>`;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadStaffData();

    if (!staffScheduleRows.length) {
        document.getElementById('no-schedule-msg').style.display = 'block';
        document.getElementById('staff-search-area').style.display = 'none';
    }

    document.getElementById('btn-staff-search').addEventListener('click', searchMySchedule);
    document.getElementById('staff-name-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') searchMySchedule();
    });
});
