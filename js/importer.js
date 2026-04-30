// ===== FILE IMPORT (Multi-Format) =====

// Configure pdf.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── PDF Parser ──
async function parsePdfFile(file) {
    if (typeof pdfjsLib === 'undefined') {
        showToast('❌ ไลบรารี PDF.js ไม่พร้อมใช้งาน', 'error');
        return [];
    }
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        return parseTextData(fullText);
    } catch (err) {
        console.error('PDF parse error:', err);
        showToast('❌ ไม่สามารถอ่านไฟล์ PDF ได้', 'error');
        return [];
    }
}

// ── PDF Parser from ArrayBuffer (for URL fetch) ──
async function parsePdfFromArrayBuffer(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
        showToast('❌ ไลบรารี PDF.js ไม่พร้อมใช้งาน', 'error');
        return [];
    }
    try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        return parseTextData(fullText);
    } catch (err) {
        console.error('PDF parse error:', err);
        showToast('❌ ไม่สามารถอ่านไฟล์ PDF จาก URL ได้', 'error');
        return [];
    }
}

// ── DOCX Parser ──
async function parseDocxFile(file) {
    if (typeof mammoth === 'undefined') {
        showToast('❌ ไลบรารี Mammoth.js ไม่พร้อมใช้งาน', 'error');
        return [];
    }
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return parseTextData(result.value);
    } catch (err) {
        console.error('DOCX parse error:', err);
        showToast('❌ ไม่สามารถอ่านไฟล์ DOCX ได้', 'error');
        return [];
    }
}

// ── DOCX Parser from ArrayBuffer (for URL fetch) ──
async function parseDocxFromArrayBuffer(arrayBuffer) {
    if (typeof mammoth === 'undefined') {
        showToast('❌ ไลบรารี Mammoth.js ไม่พร้อมใช้งาน', 'error');
        return [];
    }
    try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return parseTextData(result.value);
    } catch (err) {
        console.error('DOCX parse error:', err);
        showToast('❌ ไม่สามารถอ่านไฟล์ DOCX จาก URL ได้', 'error');
        return [];
    }
}

// ── Google Sheets URL Detection & Conversion ──
function convertGoogleSheetsUrl(url) {
    // Match patterns:
    // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
    const match = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        const sheetId = match[1];
        // Check if there's a gid parameter
        const gidMatch = url.match(/gid=(\d+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }
    return null;
}

function isGoogleSheetsUrl(url) {
    return /docs\.google\.com\/spreadsheets/.test(url);
}

// ── Detect file type from URL ──
function detectUrlFileType(url) {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    if (cleanUrl.endsWith('.pdf')) return 'pdf';
    if (cleanUrl.endsWith('.docx')) return 'docx';
    if (cleanUrl.endsWith('.xlsx') || cleanUrl.endsWith('.xls')) return 'excel';
    if (cleanUrl.endsWith('.csv')) return 'csv';
    if (cleanUrl.endsWith('.txt')) return 'txt';
    return 'text'; // default: try as text/csv
}

// ── Main File Handler (updated for PDF/DOCX) ──
async function handleFile(file, isInspector = false) {
    const isPdf = file.name.match(/\.pdf$/i);
    const isDocx = file.name.match(/\.docx$/i);
    const isExcel = file.name.match(/\.(xlsx|xls)$/i);
    const isText = file.type.match(/text\/(csv|plain)/) || file.name.match(/\.(csv|txt)$/i);

    if (!isExcel && !isText && !isPdf && !isDocx) {
        showToast('❌ รองรับ Excel, CSV, TXT, PDF และ DOCX', 'error');
        return;
    }

    // PDF handling
    if (isPdf) {
        showToast('⏳ กำลังอ่านไฟล์ PDF...');
        const data = await parsePdfFile(file);
        processImportedData(data, isInspector);
        return;
    }

    // DOCX handling
    if (isDocx) {
        showToast('⏳ กำลังอ่านไฟล์ DOCX...');
        const data = await parseDocxFile(file);
        processImportedData(data, isInspector);
        return;
    }

    // Excel handling (existing)
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

// ── URL Fetch (updated for Google Sheets, PDF, DOCX) ──
async function fetchFromUrl(isInspector = false) {
    const inputId = isInspector ? 'insp-url-input' : 'staff-url-input';
    const btnId = isInspector ? 'btn-insp-url-fetch' : 'btn-staff-url-fetch';
    const urlInput = document.getElementById(inputId);
    const fetchBtn = document.getElementById(btnId);
    const url = (urlInput.value || '').trim();

    if (!url) {
        showToast('❌ กรุณาใส่ลิงก์', 'error');
        return;
    }

    // UI loading state
    fetchBtn.classList.add('loading');
    fetchBtn.disabled = true;

    try {
        let fetchUrl = url;
        let isGSheets = false;

        // Google Sheets detection
        if (isGoogleSheetsUrl(url)) {
            const csvUrl = convertGoogleSheetsUrl(url);
            if (csvUrl) {
                fetchUrl = csvUrl;
                isGSheets = true;
                showToast('⏳ กำลังดึงข้อมูลจาก Google Sheets...');
            } else {
                showToast('❌ URL Google Sheets ไม่ถูกต้อง', 'error');
                return;
            }
        } else {
            showToast('⏳ กำลังดึงข้อมูล...');
        }

        const fileType = isGSheets ? 'csv' : detectUrlFileType(url);

        // For binary files (PDF, DOCX, Excel), fetch as ArrayBuffer
        if (fileType === 'pdf' || fileType === 'docx' || fileType === 'excel') {
            const res = await fetch(fetchUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();

            let data = [];
            if (fileType === 'pdf') {
                data = await parsePdfFromArrayBuffer(arrayBuffer);
            } else if (fileType === 'docx') {
                data = await parseDocxFromArrayBuffer(arrayBuffer);
            } else if (fileType === 'excel') {
                try {
                    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
                    workbook.SheetNames.forEach(name => {
                        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
                        const parsed = parseTextData(csv);
                        if (parsed.length > 0) data = data.concat(parsed);
                    });
                } catch (err) {
                    console.error(err);
                    showToast('❌ ไม่สามารถอ่านไฟล์ Excel จาก URL ได้', 'error');
                    return;
                }
            }
            processImportedData(data, isInspector);
        } else {
            // Text-based files (CSV, TXT, Google Sheets CSV)
            const res = await fetch(fetchUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            processImportedData(parseTextData(text), isInspector);
        }

        urlInput.value = '';
        if (isGSheets) {
            showToast('✅ ดึงข้อมูลจาก Google Sheets สำเร็จ');
        }

    } catch (err) {
        console.error('URL fetch error:', err);
        showToast('❌ ไม่สามารถดึงข้อมูลได้ (ตรวจสอบลิงก์และสิทธิ์การแชร์)', 'error');
    } finally {
        fetchBtn.classList.remove('loading');
        fetchBtn.disabled = false;
    }
}

// ── Tab Switcher Logic ──
function initImportTabs() {
    document.querySelectorAll('.import-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const group = tab.dataset.group;
            const targetId = tab.dataset.target;

            // Deactivate all tabs in same group
            document.querySelectorAll(`.import-tab[data-group="${group}"]`).forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');

            // Show/hide tab content
            // Find sibling tab contents in the same section
            const section = tab.closest('.glass, div[style]');
            if (!section) return;

            // Get all tab content ids for this group
            const allTabs = document.querySelectorAll(`.import-tab[data-group="${group}"]`);
            allTabs.forEach(t => {
                const contentEl = document.getElementById(t.dataset.target);
                if (contentEl) contentEl.classList.remove('active');
            });

            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
        });
    });
}

// ── Import Listeners ──
function initImportListeners() {
    // Tab switching
    initImportTabs();

    // ── Staff file drop-zone ──
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

    // ── Inspector file drop-zone ──
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

    // ── Staff URL fetch button ──
    const btnStaffUrl = document.getElementById('btn-staff-url-fetch');
    if (btnStaffUrl) {
        btnStaffUrl.addEventListener('click', () => fetchFromUrl(false));
    }
    const staffUrlInput = document.getElementById('staff-url-input');
    if (staffUrlInput) {
        staffUrlInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') fetchFromUrl(false);
        });
    }

    // ── Inspector URL fetch button ──
    const btnInspUrl = document.getElementById('btn-insp-url-fetch');
    if (btnInspUrl) {
        btnInspUrl.addEventListener('click', () => fetchFromUrl(true));
    }
    const inspUrlInput = document.getElementById('insp-url-input');
    if (inspUrlInput) {
        inspUrlInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') fetchFromUrl(true);
        });
    }
}
