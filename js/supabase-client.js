// ===== SUPABASE CLIENT =====
// Depends on Supabase CDN UMD being loaded first (window.supabase)

const SUPABASE_URL      = window.VENCHECK_CONFIG?.supabaseUrl     || '';
const SUPABASE_ANON_KEY = window.VENCHECK_CONFIG?.supabaseAnonKey || '';

let supabaseClient = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('VenCheck: js/config.js missing or incomplete — cloud sync disabled');
} else if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.warn('VenCheck: Supabase CDN not available — cloud sync disabled');
}

// Upsert schedule data to row id=1 in the "schedules" table
async function saveScheduleCloud(staffData, scheduleRows) {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const payload = JSON.stringify({ staffData, currentSchedule: scheduleRows });
    const { error } = await supabaseClient
        .from('schedules')
        .upsert({ id: 1, data: payload }, { onConflict: 'id' });
    if (error) throw error;
}

// Fetch schedule data from row id=1; returns { staffData, currentSchedule } or null
async function loadScheduleCloud() {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const { data, error } = await supabaseClient
        .from('schedules')
        .select('data')
        .eq('id', 1)
        .single();
    if (error) throw error;
    return data ? JSON.parse(data.data) : null;
}
