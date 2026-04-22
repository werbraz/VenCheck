// ===== SCHEDULER =====

function generateSchedule() {
    if (!state.staffData.length) {
        showToast('❌ กรุณานำเข้ารายชื่อพนักงานก่อน', 'error');
        return;
    }

    const sy = parseInt(document.getElementById('start-y').value);
    const sm = parseInt(document.getElementById('start-m').value);
    const sd = parseInt(document.getElementById('start-d').value);
    const ey = parseInt(document.getElementById('end-y').value);
    const em = parseInt(document.getElementById('end-m').value);
    const ed = parseInt(document.getElementById('end-d').value);

    const start = new Date(sy, sm, sd);
    const end   = new Date(ey, em, ed);
    if (start > end) {
        showToast('❌ วันที่เริ่มต้นต้องไม่เกินวันสิ้นสุด', 'error');
        return;
    }

    const males = state.staffData.filter(s => s.gender === 'M');

    let totalDayShifts = 0, totalNightShifts = 0;
    let d = new Date(start);
    while (d <= end) {
        if (isWeekend(d)) { totalDayShifts++; totalNightShifts++; }
        else { totalNightShifts++; }
        d.setDate(d.getDate() + 1);
    }

    state.globalStats = {
        avgDay: state.staffData.length ? (totalDayShifts * 2 / state.staffData.length).toFixed(1) : 0,
        avgNight: males.length ? (totalNightShifts * 2 / males.length).toFixed(1) : 0
    };

    const trackers = new Map();
    state.staffData.forEach(p => trackers.set(p, { count: 0, lastWorked: -999 }));

    const getEligible = (pool, dayIndex) => {
        const sorted = [...pool].sort((a, b) => {
            const tA = trackers.get(a), tB = trackers.get(b);
            if (tA.count !== tB.count) return tA.count - tB.count;
            if (tA.lastWorked !== tB.lastWorked) return tA.lastWorked - tB.lastWorked;
            return Math.random() - 0.5;
        });
        const filtered = sorted.filter(p => (dayIndex - trackers.get(p).lastWorked) > 1);
        return filtered.length >= 2 ? filtered : sorted;
    };

    const insTrackers = new Map();
    state.inspectorData.forEach(p => insTrackers.set(p, { count: 0, lastWorked: -999 }));

    const getEligibleInspector = (dayIndex) => {
        if (!state.inspectorData.length) return [];
        const sorted = [...state.inspectorData].sort((a, b) => {
            const tA = insTrackers.get(a), tB = insTrackers.get(b);
            if (tA.count !== tB.count) return tA.count - tB.count;
            if (tA.lastWorked !== tB.lastWorked) return tA.lastWorked - tB.lastWorked;
            return Math.random() - 0.5;
        });
        const filtered = sorted.filter(p => (dayIndex - insTrackers.get(p).lastWorked) > 1);
        return filtered.length >= 1 ? filtered : sorted;
    };

    const assign = (tracker, person, dayIndex) => {
        tracker.get(person).count++;
        tracker.get(person).lastWorked = dayIndex;
    };

    const rows = [];
    const cur = new Date(start);
    const poolAll = shuffleArray([...state.staffData]);
    const poolMales = shuffleArray([...males]);
    let dayIndex = 0;

    while (cur <= end) {
        const dateStr = formatDateThai(cur);
        const dayStr  = THAI_DAYS[cur.getDay()];
        const weekend = isWeekend(cur);

        if (weekend) {
            const cDay = getEligible(poolAll, dayIndex);
            const d1 = cDay[0] || null;
            const d2 = cDay[1] || null;
            const inspDay = getEligibleInspector(dayIndex)[0] || null;
            if (d1) assign(trackers, d1, dayIndex);
            if (d2) assign(trackers, d2, dayIndex);
            if (inspDay) assign(insTrackers, inspDay, dayIndex);
            if (d1 || d2) rows.push({ date: dateStr, day: dayStr, shift: 'day', p1: d1, p2: d2, insp: inspDay, weekend: true });

            const cNight = getEligible(poolMales, dayIndex);
            const n1 = cNight[0] || null;
            const n2 = (cNight[1] && cNight[1] !== n1) ? cNight[1] : (cNight[2] || null);
            const inspNight = getEligibleInspector(dayIndex)[0] || null;
            if (n1) assign(trackers, n1, dayIndex);
            if (n2) assign(trackers, n2, dayIndex);
            if (inspNight) assign(insTrackers, inspNight, dayIndex);
            if (n1 || n2) rows.push({ date: dateStr, day: dayStr, shift: 'night', p1: n1, p2: n2, insp: inspNight, weekend: true });
        } else {
            const cNight = getEligible(poolMales, dayIndex);
            const n1 = cNight[0] || null;
            const n2 = (cNight[1] && cNight[1] !== n1) ? cNight[1] : (cNight[2] || null);
            const inspNight = getEligibleInspector(dayIndex)[0] || null;
            if (n1) assign(trackers, n1, dayIndex);
            if (n2) assign(trackers, n2, dayIndex);
            if (inspNight) assign(insTrackers, inspNight, dayIndex);
            if (n1 || n2) rows.push({ date: dateStr, day: dayStr, shift: 'weekday-night', p1: n1, p2: n2, insp: inspNight, weekend: false });
        }

        cur.setDate(cur.getDate() + 1);
        dayIndex++;
    }

    state.globalScheduleRows = rows;

    // Persist for staff.html to read
    try {
        localStorage.setItem('vencheck_staffData', JSON.stringify(state.staffData));
        localStorage.setItem('vencheck_currentSchedule', JSON.stringify(rows));
    } catch (e) { /* quota exceeded — silent */ }

    renderTable(rows, start, end);

    const searchInput = document.getElementById('search-input');
    if (searchInput) { searchInput.value = ''; searchStaff(); }
}
