// ===== SUPABASE CLIENT =====
// Depends on Supabase CDN UMD being loaded first (window.supabase)

const SUPABASE_URL     = 'https://isbpnwjbvcwhhhotihtj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYnBud2pidmN3aGhob3RpaHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjgwMzEsImV4cCI6MjA5MjQ0NDAzMX0.e9_5TPvinChl16oELRx7IM3ZYdu3LuS97nsWCjPC19g';

let supabaseClient = null;

if (typeof supabase !== 'undefined' && supabase.createClient) {
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
