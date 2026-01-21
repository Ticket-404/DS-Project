const SUPABASE_URL = "https://chwqgbhwtfgcvdtffsvv.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3FnYmh3dGZnY3ZkdGZmc3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjE1NzEsImV4cCI6MjA4NDQ5NzU3MX0.oPvqis-RrTEcTRI73A1YSjT1PbYAHovf5Y6xKUp4uaM";

let client = null;
let loadPromise = null;

const loadSupabase = () => {
    if (window.supabase) {
        return Promise.resolve(window.supabase);
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector("script[data-supabase-sdk]");
        if (existing) {
            existing.addEventListener("load", () => resolve(window.supabase));
            existing.addEventListener("error", () => reject(new Error("Failed to load Supabase SDK.")));
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.async = true;
        script.defer = true;
        script.dataset.supabaseSdk = "true";
        script.onload = () => resolve(window.supabase);
        script.onerror = () => reject(new Error("Failed to load Supabase SDK."));
        document.head.appendChild(script);
    });

    return loadPromise;
};

const getClient = async () => {
    if (client) return client;
    const supabase = await loadSupabase();
    if (!supabase) {
        throw new Error("Supabase SDK unavailable.");
    }
    client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
};
const USER_STORAGE_KEY = "chronos-user";

const normalizeUser = (user) => {
    if (!user) return null;
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        position: user.position,
        role: user.role,
        work_type: user.work_type,
        is_admin: Boolean(user.is_admin),
    };
};

export const getCurrentUser = () => {
    try {
        const stored = window.localStorage.getItem(USER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error("Failed to read stored user", error);
        return null;
    }
};

export const setCurrentUser = (user) => {
    const normalized = normalizeUser(user);
    if (!normalized) return;
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
};

export const clearCurrentUser = () => {
    window.localStorage.removeItem(USER_STORAGE_KEY);
};

export const signInWithPassword = async (email, password) => {
    const client = await getClient();
    const { data, error } = await client
        .from("accounts")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Invalid credentials.");
    }

    setCurrentUser(data);
    return normalizeUser(data);
};

export const fetchScheduleSlots = async (employeeId) => {
    const client = await getClient();
    const { data, error } = await client
        .from("schedule_slots")
        .select("*")
        .eq("employee_id", employeeId)
        .order("calendar_day", { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
};

export const fetchApprovedScheduleRequests = async (employeeId) => {
    const client = await getClient();
    const { data, error } = await client
        .from("schedule_requests")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .order("calendar_day", { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
};

export const fetchAllApprovedScheduleRequests = async () => {
    const client = await getClient();
    const { data, error } = await client
        .from("schedule_requests")
        .select("*")
        .eq("status", "approved")
        .order("calendar_day", { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
};

export const createScheduleSlot = async (payload) => {
    const client = await getClient();
    const { data, error } = await client.from("schedule_slots").insert(payload).select("*");
    if (error) {
        throw error;
    }
    return data || [];
};

export const fetchAllScheduleSlots = async () => {
    const client = await getClient();
    const { data, error } = await client
        .from("schedule_slots")
        .select("*")
        .order("calendar_day", { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
};

export const fetchScheduleRequests = async (employeeId) => {
    const client = await getClient();
    const { data, error } = await client
        .from("schedule_requests")
        .select("*")
        .eq("employee_id", employeeId)
        .order("calendar_day", { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
};

export const fetchAllScheduleRequests = async () => {
    const client = await getClient();
    const { data, error } = await client
        .from("schedule_requests")
        .select("*")
        .order("calendar_day", { ascending: true });
    if (error) {
        throw error;
    }
    return data || [];
};

export const createScheduleRequest = async (payload) => {
    const client = await getClient();
    const { data, error } = await client.from("schedule_requests").insert(payload).select("*");
    if (error) {
        throw error;
    }
    return data || [];
};

export const updateScheduleRequestStatus = async (id, status) => {
    const client = await getClient();
    const { data, error } = await client
        .from("schedule_requests")
        .update({ status })
        .eq("id", id)
        .select("*")
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data;
};

export const deleteScheduleRequest = async (id) => {
    const client = await getClient();
    const { error } = await client.from("schedule_requests").delete().eq("id", id);
    if (error) {
        throw error;
    }
};

export const fetchVacations = async (employeeId) => {
    const client = await getClient();
    const { data, error } = await client
        .from("vacations")
        .select("*")
        .eq("employee_id", employeeId)
        .order("date", { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
};

export const fetchAllVacations = async () => {
    const client = await getClient();
    const { data, error } = await client
        .from("vacations")
        .select("*")
        .order("date", { ascending: false });
    if (error) {
        throw error;
    }
    return data || [];
};

export const createVacation = async (payload) => {
    const client = await getClient();
    const { data, error } = await client.from("vacations").insert(payload).select("*");
    if (error) {
        throw error;
    }
    return data || [];
};

export const updateVacationStatus = async (id, status) => {
    const client = await getClient();
    const { data, error } = await client
        .from("vacations")
        .update({ status })
        .eq("id", id)
        .select("*")
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data;
};

export const fetchSickDays = async (employeeId) => {
    const client = await getClient();
    const { data, error } = await client
        .from("sick_days")
        .select("*")
        .eq("employee_id", employeeId)
        .order("date", { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
};

export const fetchAllSickDays = async () => {
    const client = await getClient();
    const { data, error } = await client
        .from("sick_days")
        .select("*")
        .order("date", { ascending: false });
    if (error) {
        throw error;
    }
    return data || [];
};

export const createSickDay = async (payload) => {
    const client = await getClient();
    const { data, error } = await client.from("sick_days").insert(payload).select("*");
    if (error) {
        throw error;
    }
    return data || [];
};

export const updateSickDayStatus = async (id, status) => {
    const client = await getClient();
    const { data, error } = await client
        .from("sick_days")
        .update({ status })
        .eq("id", id)
        .select("*")
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data;
};

export const uploadSickDocument = async (file, employeeId) => {
    if (!file) return null;
    const client = await getClient();
    const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
    const path = `sick-docs/${employeeId}/${Date.now()}-${safeName}`;

    const { error } = await client.storage.from("documents").upload(path, file, {
        upsert: true,
    });

    if (error) {
        throw error;
    }

    const { data } = client.storage.from("documents").getPublicUrl(path);
    return data?.publicUrl || null;
};
