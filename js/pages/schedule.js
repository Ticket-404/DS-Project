import { fetchApprovedScheduleRequests, fetchScheduleSlots, getCurrentUser } from "../supabase.js";

export const title = "Chronos | My schedule";

export const render = () => `
    <section>
        <section class="dashboard-barrier dashboard-barrier--top">
            <div class="history-header">
                <div>
                    <h1>My schedule</h1>
                    <p class="muted">Week: 19 Jan 2026 - 19 Jan 2026</p>
                </div>
            </div>
        </section>
        <section class="dashboard-barrier">
            <div class="table-wrap">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Start/End time</th>
                            <th>Mode</th>
                        </tr>
                    </thead>
                    <tbody data-schedule-body>
                        <tr>
                            <td colspan="4">Loading schedule...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p class="history-back">
                <a class="primary-button" href="?page=profile">Back to dashboard</a>
            </p>
        </section>
    </section>
`;

const formatDay = (isoDate) => {
    if (!isoDate) return "--";
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const formatWeekday = (isoDate) => {
    if (!isoDate) return "--";
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, { weekday: "long" });
};
const mergeSchedules = (slots, approvals) => {
    const merged = [];
    const seen = new Set();
    const addRow = (row) => {
        const key = `${row.calendar_day || ""}|${row.start_end_time || ""}|${row.mode || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(row);
    };
    slots.forEach(addRow);
    approvals.forEach(addRow);
    return merged;
};

export const onMount = async () => {
    const currentUser = getCurrentUser();
    const scheduleBody = document.querySelector("[data-schedule-body]");
    if (!currentUser || !scheduleBody) return;

    try {
        const cacheKey = `chronos-schedule:${currentUser.id}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const rows = JSON.parse(cached);
            scheduleBody.innerHTML = rows.length
                ? rows
                      .map(
                          (slot) => `
            <tr>
                <td>${formatDay(slot.calendar_day)}</td>
                <td>${formatWeekday(slot.calendar_day)}</td>
                <td>${slot.start_end_time || "--"}</td>
                <td>${slot.mode || "--"}</td>
            </tr>`
                      )
                      .join("")
                : `<tr><td colspan="4">No schedule entries found.</td></tr>`;
            return;
        }

        const [slots, approvals] = await Promise.all([
            fetchScheduleSlots(currentUser.id),
            fetchApprovedScheduleRequests(currentUser.id),
        ]);
        const combined = mergeSchedules(slots, approvals);
        sessionStorage.setItem(cacheKey, JSON.stringify(combined));
        scheduleBody.innerHTML = combined.length
            ? combined
                  .map(
                      (slot) => `
            <tr>
                <td>${formatDay(slot.calendar_day)}</td>
                <td>${formatWeekday(slot.calendar_day)}</td>
                <td>${slot.start_end_time || "--"}</td>
                <td>${slot.mode || "--"}</td>
            </tr>`
                  )
                  .join("")
            : `<tr><td colspan="4">No schedule entries found.</td></tr>`;
    } catch (error) {
        scheduleBody.innerHTML = `<tr><td colspan="4">Unable to load schedule.</td></tr>`;
    }
};

