// ===== FILE IMPORT =====

function handleFile(file, isInspector = false) {
    const isExcel = file.name.match(/\.(xlsx|xls)$/i);
    const isText = file.type.match(/text\/(csv|plain)/) || file.name.match(/\.(csv|txt)$/i);

    if (!isExcel && !isText) {
        showToast('❌ รองรับเฉพาะ Excel, CSV และ TXT', 'error');
        return;
    }

    const reader = new FileReader();

    if (isExcel) {
        reader.onload = e => {
            try {
                const dataArray = new Uint8Array(e.target.result);
                const workbook = XLSX.read(dataArray, { type: 'array' });
                let combinedData = [];
                workbook.SheetNames.forEach(name => {
                    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
                    const parsed = parseTextData(csv);
                    if (parsed.length > 0) combinedData = combinedData.concat(parsed);
                });
                if (workbook.SheetNames.length > 1) {
                    showToast(`📂 พบ ${workbook.SheetNames.length} แผ่นงาน: รวมรายชื่อทั้งหมดแล้ว`);
                }
                processImportedData(combinedData, isInspector);
            } catch (err) {
                console.error(err);
                showToast('❌ ไม่สามารถอ่านไฟล์ Excel ได้', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        reader.onload = e => processImportedData(parseTextData(e.target.result), isInspector);
        reader.readAsText(file, 'UTF-8');
    }

    reader.onerror = () => showToast('❌ ไม่สามารถอ่านไฟล์ได้', 'error');
}

async function fetchFromUrl() {
    const urlInput = document.getElementById('url-input');
    const url = urlInput.value.trim();
    if (!url) { showToast('❌ กรุณาใส่ลิงก์', 'error'); return; }
    showToast('⏳ กำลังดึงข้อมูล...');
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        const text = await res.text();
        processImportedData(parseTextData(text), false);
        urlInput.value = '';
    } catch {
        showToast('❌ ไม่สามารถดึงข้อมูลได้ (ตรวจสอบลิงก์และสิทธิ์การแชร์)', 'error');
    }
}

function initImportListeners() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], false);
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files[0]) handleFile(e.target.files[0], false);
        e.target.value = '';
    });

    const inspDropZone = document.getElementById('insp-drop-zone');
    const inspFileInput = document.getElementById('insp-file-input');
    inspDropZone.addEventListener('click', () => inspFileInput.click());
    inspDropZone.addEventListener('dragover', e => { e.preventDefault(); inspDropZone.classList.add('dragover'); });
    inspDropZone.addEventListener('dragleave', () => inspDropZone.classList.remove('dragover'));
    inspDropZone.addEventListener('drop', e => {
        e.preventDefault(); inspDropZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], true);
    });
    inspFileInput.addEventListener('change', e => {
        if (e.target.files[0]) handleFile(e.target.files[0], true);
        e.target.value = '';
    });
}
