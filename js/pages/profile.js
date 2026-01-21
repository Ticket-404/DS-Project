
import {
    fetchAllApprovedScheduleRequests,
    fetchAllScheduleSlots,
    fetchApprovedScheduleRequests,
    fetchScheduleSlots,
    fetchVacations,
    getCurrentUser,
} from "../supabase.js";

export const title = "Chronos | Dashboard";

export const render = () => `
    <section class="dashboard-barrier dashboard-barrier--top">
        <header class="dash-header">
            <div>
                <p class="eyebrow">Hybrid Staff HQ</p>
                <h1 data-user-name>Employee</h1>
                <p class="muted" data-user-meta>Position &bull; day &bull; date</p>
            </div>
            <div class="dash-header__aside">
                <div class="clock-card" aria-live="polite">
                    <span class="clock-card__label">Tbilisi Time</span>
                    <span class="clock-card__time" data-clock-time>--:--</span>
                    <span class="clock-card__date" data-clock-date>--</span>
                </div>
                <div class="chip-row">
                    <span class="chip" data-work-type>Schedule: --</span>
                    <span class="chip chip--ok">WiFi lock disabled</span>
                </div>
            </div>
        </header>
    </section>
    <section class="dashboard-barrier">
        <section class="history-header">
            <div>
                <h2>This week's schedule</h2>
                <p class="muted" data-week-range>Week: --</p>
            </div>
            <a class="secondary-button" href="?page=schedule">View schedule</a>
        </section>
        <div class="table-wrap">
                <table class="grid-table">
                    <thead data-weekly-head>
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
    </section>
    <section class="dashboard-barrier dashboard-barrier--vacation">
        <section class="history-header">
            <div>
                <h2>Vacation balance</h2>
                <p class="muted">Approved requests for 2026.</p>
            </div>
            <a class="secondary-button" href="?page=vacations">Request time off</a>
        </section>
        <section class="dashboard-grid vacation-balance">
            <article class="status-card">
                <p class="status-card__label">Days off</p>
                <p class="status-card__value">6</p>
                <p class="status-card__meta" data-days-off>0 used of 6</p>
            </article>
            <article class="status-card">
                <p class="status-card__label">Emergency days</p>
                <p class="status-card__value">6</p>
                <p class="status-card__meta" data-emergency-days>0 used of 6</p>
            </article>
            <article class="status-card">
                <p class="status-card__label">Paid vacation</p>
                <p class="status-card__value">24</p>
                <p class="status-card__meta" data-paid-vacation>0 used of 24</p>
            </article>
            <article class="status-card">
                <p class="status-card__label">Unpaid vacation</p>
                <p class="status-card__value">15</p>
                <p class="status-card__meta" data-unpaid-vacation>0 used of 15</p>
            </article>
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
const formatWeekRange = (slots) => {
    if (!slots.length) return "--";
    const dates = slots.map((slot) => slot.calendar_day).filter(Boolean);
    if (!dates.length) return "--";
    const sorted = dates.slice().sort();
    const first = formatDay(sorted[0]);
    const last = formatDay(sorted[sorted.length - 1]);
    return `${first} - ${last}`;
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

const isTeamRole = (role) => role === "IT" || role === "Developer";

export const onMount = async () => {
    const currentUser = getCurrentUser();
    const nameEl = document.querySelector("[data-user-name]");
    const metaEl = document.querySelector("[data-user-meta]");
    const workTypeEl = document.querySelector("[data-work-type]");
    const scheduleBody = document.querySelector("[data-schedule-body]");
    const weekRangeEl = document.querySelector("[data-week-range]");
    const clockTime = document.querySelector("[data-clock-time]");
    const clockDate = document.querySelector("[data-clock-date]");

    if (nameEl && currentUser) {
        nameEl.textContent = currentUser.name || "Employee";
    }

    if (metaEl && currentUser) {
        const position = currentUser.position || "Position";
        const now = new Date();
        const dayName = now.toLocaleDateString(undefined, { weekday: "long" });
        const today = now.toISOString().slice(0, 10);
        metaEl.textContent = `${position} \u2022 ${dayName} \u2022 ${today}`;
    }

    if (workTypeEl && currentUser) {
        const workType = currentUser.work_type || "schedule";
        workTypeEl.textContent = `Schedule: ${workType}`;
    }

    if (clockTime && clockDate) {
        const timeFormatter = new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Tbilisi",
        });
        const dateFormatter = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Tbilisi",
        });

        const updateClock = () => {
            const now = new Date();
            clockTime.textContent = timeFormatter.format(now);
            clockDate.textContent = dateFormatter.format(now);
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    if (!currentUser || !scheduleBody) return;

    const showAll = currentUser.is_admin === true || isTeamRole(currentUser.role);
    const cacheKey = `chronos-weekly-schedule:${currentUser.id}:${showAll ? "all" : "self"}`;
    const readCache = () => {
        try {
            const cached = sessionStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            return null;
        }
    };
    const writeCache = (rows) => {
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(rows));
        } catch (error) {
            // Ignore cache write errors.
        }
    };

    try {
        const weeklyHead = document.querySelector("[data-weekly-head]");
        if (weeklyHead) {
            weeklyHead.innerHTML = showAll
                ? `<tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Start/End time</th>
                        <th>Mode</th>
                    </tr>`
                : `<tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Start/End time</th>
                        <th>Mode</th>
                    </tr>`;
        }

        const cachedRows = readCache();
        if (cachedRows && cachedRows.length) {
            const visibleRows = showAll
                ? cachedRows.filter((row) => row.employee_id !== currentUser.id)
                : cachedRows;
            scheduleBody.innerHTML = visibleRows
                ? visibleRows
                      .map(
                          (slot) => `
                <tr>
                    ${
                        showAll
                            ? `<td>${slot.employee_name || slot.employee_email || slot.employee_id || "--"}</td>`
                            : ""
                    }
                    <td>${formatDay(slot.calendar_day)}</td>
                    <td>${formatWeekday(slot.calendar_day)}</td>
                    <td>${slot.start_end_time || "--"}</td>
                    <td>${slot.mode || "--"}</td>
                </tr>`
                      )
                      .join("")
                : `<tr><td colspan="${showAll ? 5 : 4}">No schedule entries found.</td></tr>`;

            if (weekRangeEl) {
                const rangeSource = visibleRows.length ? visibleRows : cachedRows;
                weekRangeEl.textContent = `Week: ${formatWeekRange(rangeSource)}`;
            }
            return;
        }

        const [slots, approvals] = showAll
            ? await Promise.all([fetchAllScheduleSlots(), fetchAllApprovedScheduleRequests()])
            : await Promise.all([
                  fetchScheduleSlots(currentUser.id),
                  fetchApprovedScheduleRequests(currentUser.id),
              ]);
        const combined = mergeSchedules(slots, approvals);
        writeCache(combined);
        const visibleRows = showAll
            ? combined.filter((row) => row.employee_id !== currentUser.id)
            : combined;
        scheduleBody.innerHTML = visibleRows.length
            ? visibleRows
                  .map(
                      (slot) => `
                <tr>
                    ${
                        showAll
                            ? `<td>${slot.employee_name || slot.employee_email || slot.employee_id || "--"}</td>`
                            : ""
                    }
                    <td>${formatDay(slot.calendar_day)}</td>
                    <td>${formatWeekday(slot.calendar_day)}</td>
                    <td>${slot.start_end_time || "--"}</td>
                    <td>${slot.mode || "--"}</td>
                </tr>`
                  )
                  .join("")
            : `<tr><td colspan="${showAll ? 5 : 4}">No schedule entries found.</td></tr>`;

        if (weekRangeEl) {
            const rangeSource = visibleRows.length ? visibleRows : combined;
            weekRangeEl.textContent = `Week: ${formatWeekRange(rangeSource)}`;
        }
    } catch (error) {
        scheduleBody.innerHTML = `<tr><td colspan="4">Unable to load schedule.</td></tr>`;
    }

    try {
        const vacations = await fetchVacations(currentUser.id);
        const approved = vacations.filter((row) => row.status === "approved");
        const usedByType = approved.reduce(
            (acc, row) => {
                const key = row.category || "unknown";
                acc[key] = (acc[key] || 0) + Number(row.days || 0);
                return acc;
            },
            {
                days_off: 0,
                emergency_days: 0,
                paid_vacation: 0,
                unpaid_vacation: 0,
            }
        );
        const daysOffEl = document.querySelector("[data-days-off]");
        const emergencyEl = document.querySelector("[data-emergency-days]");
        const paidEl = document.querySelector("[data-paid-vacation]");
        const unpaidEl = document.querySelector("[data-unpaid-vacation]");

        if (daysOffEl) daysOffEl.textContent = `${usedByType.days_off} used of 6`;
        if (emergencyEl) emergencyEl.textContent = `${usedByType.emergency_days} used of 6`;
        if (paidEl) paidEl.textContent = `${usedByType.paid_vacation} used of 24`;
        if (unpaidEl) unpaidEl.textContent = `${usedByType.unpaid_vacation} used of 15`;
    } catch (error) {
        // Keep existing values if summary fails.
    }
};
