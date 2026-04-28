// ===== QUICK RANDOM ASSIGNMENT =====

function quickRandomAssign() {
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
    const end = new Date(ey, em, ed);
    if (start > end) {
        showToast('❌ วันที่เริ่มต้นต้องไม่เกินวันสิ้นสุด', 'error');
        return;
    }

    const perShift = state.staffPerShift || 2;
    const allStaff = shuffleArray([...state.staffData]);
    const males = shuffleArray(allStaff.filter(s => s.gender === 'M'));
    const inspectors = shuffleArray([...state.inspectorData]);

    let staffIdx = 0, maleIdx = 0, inspIdx = 0;

    // เลือกพนักงาน N คน โดยจัดคู่บัดดี้ถ้ามี
    const pickBuddy = (pool, n) => {
        const hasBuddy = typeof getBuddyFor === 'function' && state.buddyPairs.length > 0;
        const result = [];
        const used = new Set();

        for (let i = 0; i < pool.length && result.length < n; i++) {
            const person = pool[i];
            if (used.has(person.name)) continue;

            const buddyName = hasBuddy ? getBuddyFor(person.name) : null;
            if (buddyName && result.length + 1 < n) {
                // หาคู่บัดดี้จาก pool
                const buddyObj = pool.find(p => p.name === buddyName && !used.has(p.name));
                if (buddyObj) {
                    result.push(person);  used.add(person.name);
                    result.push(buddyObj); used.add(buddyObj.name);
                    continue;
                }
            }
            result.push(person);
            used.add(person.name);
        }
        // เติมถ้าไม่ครบ (วน pool)
        let fallback = 0;
        while (result.length < n && pool.length > 0) {
            const p = pool[fallback % pool.length];
            if (!used.has(p.name)) { result.push(p); used.add(p.name); }
            fallback++;
            if (fallback > pool.length * 2) break;
        }
        return result.slice(0, n);
    };

    const rows = [];
    const cur = new Date(start);
    // สุ่มลำดับทุกรอบ เพื่อให้ random จริง
    const rotatePool = (pool, idx) => {
        const offset = idx % pool.length;
        return [...pool.slice(offset), ...pool.slice(0, offset)];
    };

    let dayIdx = 0;
    while (cur <= end) {
        const dateStr = formatDateThai(cur);
        const dayStr = THAI_DAYS[cur.getDay()];
        const weekend = isWeekend(cur);

        if (weekend) {
            // Day shift — เลือกจาก allStaff (พร้อมบัดดี้)
            const dayPool = rotatePool(allStaff, staffIdx);
            const dayStaff = pickBuddy(dayPool, perShift);
            staffIdx += perShift;
            const inspDay = inspectors.length ? inspectors[inspIdx % inspectors.length] : null;
            if (inspDay) inspIdx++;
            rows.push({
                date: dateStr, day: dayStr, shift: 'day',
                p1: dayStaff[0] || null, p2: dayStaff[1] || null,
                insp: inspDay, weekend: true
            });

            // Night shift — เลือกจาก males (พร้อมบัดดี้)
            const nightPool = rotatePool(males, maleIdx);
            const nightStaff = pickBuddy(nightPool, perShift);
            maleIdx += perShift;
            const inspNight = inspectors.length ? inspectors[inspIdx % inspectors.length] : null;
            if (inspNight) inspIdx++;
            rows.push({
                date: dateStr, day: dayStr, shift: 'night',
                p1: nightStaff[0] || null, p2: nightStaff[1] || null,
                insp: inspNight, weekend: true
            });
        } else {
            // Weekday night — เลือกจาก males (พร้อมบัดดี้)
            const nightPool = rotatePool(males, maleIdx);
            const nightStaff = pickBuddy(nightPool, perShift);
            maleIdx += perShift;
            const inspNight = inspectors.length ? inspectors[inspIdx % inspectors.length] : null;
            if (inspNight) inspIdx++;
            rows.push({
                date: dateStr, day: dayStr, shift: 'weekday-night',
                p1: nightStaff[0] || null, p2: nightStaff[1] || null,
                insp: inspNight, weekend: false
            });
        }

        cur.setDate(cur.getDate() + 1);
        dayIdx++;
    }

    state.globalScheduleRows = rows;
    state.globalStats = {
        avgDay: state.staffData.length ? (rows.filter(r => r.shift === 'day').length * perShift / state.staffData.length).toFixed(1) : 0,
        avgNight: males.length ? (rows.filter(r => r.shift !== 'day').length * perShift / males.length).toFixed(1) : 0
    };

    // Save
    try {
        localStorage.setItem('vencheck_staffData', JSON.stringify(state.staffData));
        localStorage.setItem('vencheck_currentSchedule', JSON.stringify(rows));
    } catch (e) { /* quota */ }

    saveScheduleCloud(state.staffData, rows)
        .then(() => showToast('☁️ บันทึกไปยัง Cloud แล้ว'))
        .catch(e => console.warn('Supabase save failed:', e.message));

    renderTable(rows, start, end);
    showToast(`⚡ สุ่มแบบเร็วสำเร็จ ${rows.length} ผลัด`);
}
