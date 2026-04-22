// ===== PARSER =====

function parseLine(line, sep = ',') {
    const result = [];
    let cur = '';
    let inQ = false;
    for (let c of line) {
        if (c === '"') { inQ = !inQ; }
        else if (c === sep && !inQ) { result.push(cur.trim()); cur = ''; }
        else cur += c;
    }
    result.push(cur.trim());
    return result;
}

function parseTextData(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];

    let sep = ',';
    if (!lines[0].includes(',') && lines[0].includes('\t')) sep = '\t';

    let skip = 0;
    let map = { no: 0, name: 1, position: 2, type: 3, department: 4, note: 5 };
    const data = [];

    const searchLimit = Math.min(lines.length, 20);
    for (let i = 0; i < searchLimit; i++) {
        const row = parseLine(lines[i], sep);
        if (row.some(p => /ลำดับ|ที่|no|id/i.test(p))) {
            let tempMap = { no: -1, name: -1, position: -1, type: -1, department: -1, note: -1 };
            row.forEach((col, idx) => {
                if (/ลำดับ|ที่|no|id/i.test(col)) tempMap.no = idx;
                else if (/ชื่อ|name/i.test(col)) tempMap.name = idx;
                else if (/ตำแหน่ง|position/i.test(col)) tempMap.position = idx;
                else if (/ประเภท|หน้าที่|งาน|type/i.test(col)) tempMap.type = idx;
                else if (/สังกัด|แผนก|ฝ่าย|dept|department/i.test(col)) tempMap.department = idx;
                else if (/หมายเหตุ|note/i.test(col)) tempMap.note = idx;
            });
            if (tempMap.name !== -1) {
                map = { ...map, ...Object.fromEntries(Object.entries(tempMap).filter(([_, v]) => v !== -1)) };
                skip = i + 1;
                break;
            }
        }
        if (row[0] === '1') { skip = i; break; }
    }

    for (let i = skip; i < lines.length; i++) {
        const row = parseLine(lines[i], sep);
        if (row.length < 2) continue;
        const getField = (idx) => (idx !== -1 && idx < row.length) ? row[idx] : '-';
        const name = getField(map.name);
        if (!name || name === '-') continue;

        let g = 'M';
        if (name.includes('นาง') || name.includes('น.ส.') || name.includes('Miss')) g = 'F';

        data.push({
            name,
            position: getField(map.position),
            type: getField(map.type),
            department: getField(map.department),
            note: getField(map.note),
            gender: g
        });
    }
    return data;
}

function processImportedData(data, isInspectorContext) {
    if (data.length > 0) {
        if (isInspectorContext) {
            state.inspectorData = data.map(d => ({ name: d.name }));
            updateInspectorList();
            showToast(`✅ นำเข้าผู้ตรวจเวรสำเร็จ ${state.inspectorData.length} คน`);
        } else {
            state.staffData = data;
            updatePreview();
            showToast(`✅ นำเข้าผู้เข้าเวรสำเร็จ ${state.staffData.length} รายชื่อ`);
        }
    } else {
        showToast('❌ ไม่พบข้อมูลที่ถูกต้องในไฟล์นี้', 'error');
    }
}
