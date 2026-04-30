// ===== STAFF PAGE =====

let staffScheduleRows = [];
let staffList = [];
let acActiveIndex = -1;

function normalizeName(s) {
    return (s || '')
        .replace(/^(นางสาว|น\.ส\.|นาง|นาย)\s*/u, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

async function loadStaffData() {
    // Try Supabase first for cross-device sharing
    try {
        const cloudData = await loadScheduleCloud();
        if (cloudData) {
            staffList         = cloudData.staffData        || [];
            staffScheduleRows = cloudData.currentSchedule  || [];
            // Mirror to localStorage so the next offline load still works
            try {
                localStorage.setItem('vencheck_staffData',        JSON.stringify(staffList));
                localStorage.setItem('vencheck_currentSchedule',  JSON.stringify(staffScheduleRows));
            } catch (_) {}
            return;
        }
    } catch (e) {
        console.warn('Supabase load failed, falling back to localStorage:', e.message);
    }
    // Offline / Supabase unavailable — use localStorage
    try {
        const sd = localStorage.getItem('vencheck_staffData');
        const sc = localStorage.getItem('vencheck_currentSchedule');
        if (sd) staffList         = JSON.parse(sd);
        if (sc) staffScheduleRows = JSON.parse(sc);
    } catch (e) {
        staffList = [];
        staffScheduleRows = [];
    }
}

function buildAutocompleteDropdown() {
    const input = document.getElementById('staff-name-input');
    if (!input) return;

    // Wrap input in a relative-positioned div so dropdown can anchor to it
    const wrapper = document.createElement('div');
    wrapper.id = 'staff-name-wrapper';
    wrapper.style.cssText = 'position:relative;flex:1;min-width:200px;';
    input.removeAttribute('style');
    input.style.width = '100%';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const dropdown = document.createElement('ul');
    dropdown.id = 'staff-autocomplete-list';
    dropdown.style.cssText = [
        'position:absolute',
        'top:calc(100% + 4px)',
        'left:0',
        'right:0',
        'background:rgba(10,20,40,0.96)',
        'backdrop-filter:blur(24px) saturate(1.8)',
        '-webkit-backdrop-filter:blur(24px) saturate(1.8)',
        'border:1px solid rgba(56,189,248,0.35)',
        'border-radius:14px',
        'box-shadow:0 12px 40px rgba(0,0,0,0.40),inset 0 1px 0 rgba(255,255,255,0.10)',
        'list-style:none',
        'max-height:220px',
        'overflow-y:auto',
        'z-index:999',
        'display:none',
        'padding:4px 0',
    ].join(';');
    wrapper.appendChild(dropdown);

    input.addEventListener('input', () => {
        const q = normalizeName(input.value);
        acActiveIndex = -1;
        if (q.length < 3 || !staffList.length) {
            dropdown.style.display = 'none';
            return;
        }
        const matches = staffList.filter(s => normalizeName(s.name).includes(q)).slice(0, 10);
        if (!matches.length) {
            dropdown.style.display = 'none';
            return;
        }
        dropdown.innerHTML = '';
        matches.forEach((s, i) => {
            const li = document.createElement('li');
            li.textContent = s.name;
            li.dataset.index = i;
            li.style.cssText = 'padding:10px 16px;cursor:pointer;font-size:14px;color:rgba(255,255,255,0.88);font-family:Sarabun,sans-serif;border-bottom:1px solid rgba(255,255,255,0.07);transition:background 0.12s,color 0.12s;';
            li.addEventListener('mouseenter', () => {
                acActiveIndex = i;
                highlightAcItem(dropdown, i);
            });
            li.addEventListener('mouseleave', () => highlightAcItem(dropdown, -1));
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                selectAcItem(input, dropdown, s.name);
            });
            dropdown.appendChild(li);
        });
        dropdown.style.display = 'block';
    });

    input.addEventListener('keydown', e => {
        const items = dropdown.querySelectorAll('li');
        if (dropdown.style.display === 'none' || !items.length) {
            if (e.key === 'Enter') searchMySchedule();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1);
            highlightAcItem(dropdown, acActiveIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            acActiveIndex = Math.max(acActiveIndex - 1, 0);
            highlightAcItem(dropdown, acActiveIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (acActiveIndex >= 0 && items[acActiveIndex]) {
                selectAcItem(input, dropdown, items[acActiveIndex].textContent);
            } else {
                dropdown.style.display = 'none';
                searchMySchedule();
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            acActiveIndex = -1;
        }
    });

    document.addEventListener('click', e => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
            acActiveIndex = -1;
        }
    });
}

function highlightAcItem(dropdown, index) {
    dropdown.querySelectorAll('li').forEach((li, i) => {
        if (i === index) {
            li.style.background = 'rgba(56,189,248,0.18)';
            li.style.color = '#38bdf8';
            li.style.fontWeight = '600';
        } else {
            li.style.background = '';
            li.style.color = 'rgba(255,255,255,0.88)';
            li.style.fontWeight = '';
        }
    });
}

function selectAcItem(input, dropdown, name) {
    input.value = name;
    dropdown.style.display = 'none';
    acActiveIndex = -1;
    searchMySchedule();
}

function searchMySchedule() {
    const rawQ = document.getElementById('staff-name-input').value.trim();
    const q = normalizeName(rawQ);
    const resultSection = document.getElementById('staff-result-section');
    const errBox = document.getElementById('staff-search-error');

    const dropdown = document.getElementById('staff-autocomplete-list');
    if (dropdown) dropdown.style.display = 'none';

    errBox.textContent = '';
    resultSection.style.display = 'none';

    if (!rawQ) { errBox.textContent = 'กรุณาพิมพ์ชื่อ-สกุลของคุณ'; return; }
    if (!staffScheduleRows.length) {
        errBox.textContent = 'ยังไม่มีตารางเวรจากผู้ดูแลระบบ กรุณาติดต่อ Admin';
        return;
    }

    const matched = staffList.find(s => normalizeName(s.name).includes(q));
    if (!matched) {
        errBox.textContent = `ไม่พบชื่อ "${rawQ}" ในระบบ กรุณาตรวจสอบชื่อ-สกุล`;
        return;
    }

    const allMyRows = staffScheduleRows.filter(r => {
        const staffArr = r.staff && r.staff.length ? r.staff : [r.p1, r.p2].filter(Boolean);
        return staffArr.some(p => normalizeName(p.name).includes(q));
    });

    // Normalize now to midnight so today's shifts are included (parseThaiBuddhistDate returns 00:00:00)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

    // Filter once — table and summary both use the same set so counts always match
    const upcomingRows = allMyRows.filter(r => {
        const rowDate = parseThaiBuddhistDate(r.date);
        return rowDate && rowDate >= now && rowDate <= threeMonthsLater;
    });

    let upcomingDay = 0, upcomingNight = 0;
    upcomingRows.forEach(r => {
        if (r.shift === 'day') upcomingDay++;
        else upcomingNight++;
    });

    renderStaffResult(matched.name, upcomingRows, upcomingDay, upcomingNight, upcomingRows.length, q);
    resultSection.style.display = 'block';
}

function parseThaiBuddhistDate(thaiDateStr) {
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

function renderStaffResult(name, rows, upcomingDay, upcomingNight, upcomingTotal, normalizedQ) {
    document.getElementById('result-name').textContent = name;
    document.getElementById('sum-total').textContent = upcomingTotal;
    document.getElementById('sum-day').textContent = upcomingDay;
    document.getElementById('sum-night').textContent = upcomingNight;

    const tbody = document.getElementById('staff-schedule-body');
    tbody.innerHTML = '';

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">ไม่มีตารางเวรที่พบ</td></tr>';
        return;
    }

    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = r.weekend
            ? (r.shift === 'day' ? 'row-weekend-day' : 'row-weekend-night')
            : 'row-weekday';

        const shiftBadge = r.shift === 'day'
            ? `<span class="shift-badge shift-day">☀️</span>`
            : `<span class="shift-badge shift-${r.shift === 'night' ? 'night' : 'weekday-night'}">🌙</span>`;

        const staffArr = r.staff && r.staff.length ? r.staff : [r.p1, r.p2].filter(Boolean);
        const partner = staffArr
            .filter(p => p && !normalizeName(p.name).includes(normalizedQ))
            .map(p => p.name)
            .join(', ') || '-';

        const inspectorName = r.insp ? r.insp.name : '-';

        tr.innerHTML = `
            <td style="white-space:nowrap;font-size:12px;text-align:center;">${r.date}</td>
            <td style="font-weight:700;color:${r.weekend ? '#c2410c' : '#1d4ed8'};text-align:center;">${r.day}</td>
            <td style="text-align:center;">${shiftBadge}</td>
            <td style="font-size:12px;color:#334155;">${partner}</td>
            <td style="font-size:12px;color:#0f172a;font-weight:600;text-align:center;">${inspectorName}</td>`;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadStaffData();

    if (!staffScheduleRows.length) {
        document.getElementById('no-schedule-msg').style.display = 'block';
        document.getElementById('staff-search-area').style.display = 'none';
    }

    buildAutocompleteDropdown();

    document.getElementById('btn-staff-search').addEventListener('click', searchMySchedule);
});
