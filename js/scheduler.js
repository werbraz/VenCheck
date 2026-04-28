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

    const perShift = state.staffPerShift || 2;
    const males = state.staffData.filter(s => s.gender === 'M');

    let totalDayShifts = 0, totalNightShifts = 0;
    let d = new Date(start);
    while (d <= end) {
        if (isWeekend(d)) { totalDayShifts++; totalNightShifts++; }
        else { totalNightShifts++; }
        d.setDate(d.getDate() + 1);
    }

    state.globalStats = {
        avgDay: state.staffData.length ? (totalDayShifts * perShift / state.staffData.length).toFixed(1) : 0,
        avgNight: males.length ? (totalNightShifts * perShift / males.length).toFixed(1) : 0
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
        // filtered = คนที่ไม่ได้เข้าเวรวันก่อนหน้า (preferred)
        const filtered = sorted.filter(p => (dayIndex - trackers.get(p).lastWorked) > 1);
        const eligible  = filtered.length >= perShift ? filtered : sorted;
        // ส่งกลับทั้ง eligible list และ full sorted list สำหรับ buddy lookup
        return { eligible, full: sorted };
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

    // เลือกพนักงานพร้อมจับคู่บัดดี้จริง
    // eligible = กลุ่มที่ถึงคิว, fullPool = กลุ่มทั้งหมด (สำหรับหาคู่บัดดี้)
    const pickWithBuddy = (eligible, fullPool, count) => {
        if (typeof getBuddyFor !== 'function' || !state.buddyPairs.length) {
            // ไม่มีระบบบัดดี้ — เลือกตามลำดับปกติ
            return eligible.slice(0, count);
        }

        const result = [];
        const used = new Set();

        // รอบที่ 1: ลองจัดคู่บัดดี้จาก eligible pool ก่อน
        for (let i = 0; i < eligible.length && result.length < count; i++) {
            const person = eligible[i];
            if (used.has(person.name)) continue;

            const buddyName = getBuddyFor(person.name);

            if (buddyName && result.length + 1 < count) {
                // มีคู่บัดดี้ — หาคู่จาก eligible ก่อน
                let buddyObj = eligible.find(p => p.name === buddyName && !used.has(p.name));

                if (!buddyObj) {
                    // ไม่เจอใน eligible → ลองหาจาก fullPool (ผ่อนผัน constraint)
                    buddyObj = fullPool.find(p => p.name === buddyName && !used.has(p.name));
                }

                if (buddyObj) {
                    // จับคู่สำเร็จ — เพิ่มทั้งคู่
                    result.push(person);
                    used.add(person.name);
                    result.push(buddyObj);
                    used.add(buddyObj.name);
                    continue;
                }
            }

            // ไม่มีคู่หรือหาคู่ไม่เจอ — เพิ่มคนนี้คนเดียว
            result.push(person);
            used.add(person.name);
        }

        // ถ้ายังไม่ครบจำนวน เติมจาก eligible ตามปกติ
        if (result.length < count) {
            for (let i = 0; i < eligible.length && result.length < count; i++) {
                if (!used.has(eligible[i].name)) {
                    result.push(eligible[i]);
                    used.add(eligible[i].name);
                }
            }
        }

        return result.slice(0, count);
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
            const { eligible: cDay, full: cDayFull } = getEligible(poolAll, dayIndex);
            const dayPicks = pickWithBuddy(cDay, cDayFull, perShift);
            const inspDay = getEligibleInspector(dayIndex)[0] || null;
            dayPicks.forEach(p => assign(trackers, p, dayIndex));
            if (inspDay) assign(insTrackers, inspDay, dayIndex);
            if (dayPicks.length) rows.push({
                date: dateStr, day: dayStr, shift: 'day',
                p1: dayPicks[0] || null, p2: dayPicks[1] || null,
                insp: inspDay, weekend: true
            });

            const { eligible: cNight, full: cNightFull } = getEligible(poolMales, dayIndex);
            const nightPicks = pickWithBuddy(cNight, cNightFull, perShift);
            const inspNight = getEligibleInspector(dayIndex)[0] || null;
            nightPicks.forEach(p => assign(trackers, p, dayIndex));
            if (inspNight) assign(insTrackers, inspNight, dayIndex);
            if (nightPicks.length) rows.push({
                date: dateStr, day: dayStr, shift: 'night',
                p1: nightPicks[0] || null, p2: nightPicks[1] || null,
                insp: inspNight, weekend: true
            });
        } else {
            const { eligible: cNight, full: cNightFull } = getEligible(poolMales, dayIndex);
            const nightPicks = pickWithBuddy(cNight, cNightFull, perShift);
            const inspNight = getEligibleInspector(dayIndex)[0] || null;
            nightPicks.forEach(p => assign(trackers, p, dayIndex));
            if (inspNight) assign(insTrackers, inspNight, dayIndex);
            if (nightPicks.length) rows.push({
                date: dateStr, day: dayStr, shift: 'weekday-night',
                p1: nightPicks[0] || null, p2: nightPicks[1] || null,
                insp: inspNight, weekend: false
            });
        }

        cur.setDate(cur.getDate() + 1);
        dayIndex++;
    }

    state.globalScheduleRows = rows;

    // Persist locally as fallback
    try {
        localStorage.setItem('vencheck_staffData', JSON.stringify(state.staffData));
        localStorage.setItem('vencheck_currentSchedule', JSON.stringify(rows));
    } catch (e) { /* quota exceeded — silent */ }

    // Sync to Supabase so staff.html can read from any device
    saveScheduleCloud(state.staffData, rows)
        .then(() => showToast('☁️ บันทึกไปยัง Cloud แล้ว'))
        .catch(e => console.warn('Supabase save failed:', e.message));

    renderTable(rows, start, end);

    const searchInput = document.getElementById('search-input');
    if (searchInput) { searchInput.value = ''; searchStaff(); }
}

