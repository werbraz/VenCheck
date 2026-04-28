// ===== SHARED STATE =====
const state = {
    staffData: [],
    inspectorData: [],
    globalScheduleRows: [],
    globalStats: { avgDay: 0, avgNight: 0 },
    currentPage: 1,
    staffPerShift: 2,
    shiftCategories: [
        { id: 'day', label: 'กลางวัน', icon: '☀️' },
        { id: 'night', label: 'กลางคืน', icon: '🌙' }
    ],
    buddyPairs: []
};
