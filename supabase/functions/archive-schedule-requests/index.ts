import { serve } from "https://deno.land/std@0.221.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET_NAME = "archived schedule requests";
const PREFIX = "schedule-requests";
const DELETE_ALL_SENTINEL = "00000000-0000-0000-0000-000000000000";

const csvEscape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const toCsv = (rows: Record<string, unknown>[]) => {
    const headers = [
        "id",
        "employee_id",
        "week_of",
        "calendar_day",
        "day_of_week",
        "start_end_time",
        "mode",
        "status",
        "created_at",
    ];
    const lines = [
        headers.join(","),
        ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
    ];
    return lines.join("\n");
};

serve(async () => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
        return new Response("Missing Supabase env vars.", { status: 500 });
    }

    const client = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await client.from("schedule_requests").select("*");

    if (error) {
        return new Response(`Read failed: ${error.message}`, { status: 500 });
    }

    if (!data || data.length === 0) {
        return new Response("No schedule requests to archive.", { status: 200 });
    }

    const csv = toCsv(data);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${PREFIX}/${stamp}-schedule-requests.csv`;

    const upload = await client.storage.from(BUCKET_NAME).upload(
        path,
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        { upsert: true, contentType: "text/csv" }
    );

    if (upload.error) {
        return new Response(`Upload failed: ${upload.error.message}`, { status: 500 });
    }

    const clear = await client
        .from("schedule_requests")
        .delete()
        .neq("id", DELETE_ALL_SENTINEL);

    if (clear.error) {
        return new Response(`Clear failed: ${clear.error.message}`, { status: 500 });
    }

    return new Response("Archived schedule requests.", { status: 200 });
});
