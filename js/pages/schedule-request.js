import { createScheduleRequest, fetchScheduleRequests, getCurrentUser } from "../supabase.js";

export const title = "Chronos | Schedule request";

export const render = () => `
    <section class="admin-schedule-page">
        <section class="dashboard-barrier dashboard-barrier--top">
            <div class="history-header">
                <div>
                    <h1>Register schedule</h1>
                    <p class="muted">Submit your weekly schedule for approval.</p>
                </div>
                <div class="vacations-actions">
                    <a class="secondary-button" href="?page=profile">Back to profile</a>
                </div>
            </div>
        </section>
        <section class="dashboard-barrier">
            <article class="status-card vacations-card vacations-card--form">
                <form class="vacations-form admin-schedule-form" action="#" method="post" data-schedule-form>
                    <div class="admin-schedule-week admin-schedule-week--auto">
                        <div>
                            <p class="eyebrow">Week of</p>
                            <h2 data-week-of>--</h2>
                        </div>
                        <div class="admin-schedule-week__summary">
                            <p class="muted">Auto-set for Saturday/Sunday submissions.</p>
                        </div>
                    </div>
                    <div class="admin-schedule-toolbar">
                        <div>
                            <h2>Weekly slots</h2>
                            <p class="muted">Add as many rows as needed. Empty rows are ignored.</p>
                        </div>
                        <div class="admin-schedule-toolbar__actions">
                            <button type="button" class="secondary-button" data-add-row>Add row</button>
                        </div>
                    </div>
                    <div class="table-wrap admin-schedule-table">
                        <div class="schedule-card-list" data-schedule-rows></div>
                    </div>
                    <div class="vacations-form__actions">
                        <button type="submit" class="primary-button">Submit schedule</button>
                    </div>
                    <p class="form-error" data-schedule-message></p>
                </form>
            </article>
        </section>
        <section class="dashboard-barrier">
            <h2 class="history-title">Submitted requests</h2>
            <div class="table-wrap">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>Week of</th>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Start/End time</th>
                            <th>Mode</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody data-requests-body>
                        <tr>
                            <td colspan="6">Loading requests...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </section>
`;

const formatDay = (isoDate) => {
    if (!isoDate) return "--";
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const formatMode = (mode) => {
    if (!mode) return "--";
    return String(mode).replace(/_/g, " ");
};

const getWeekStartMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);

    if (day === 0) {
        monday.setDate(now.getDate() + 1);
    } else if (day === 6) {
        monday.setDate(now.getDate() + 2);
    } else {
        monday.setDate(now.getDate() - (day - 1));
    }

    return monday.toISOString().slice(0, 10);
};

const toCalendarDay = (weekOf, dayOfWeek) => {
    if (!weekOf || !dayOfWeek) return null;
    const base = new Date(weekOf);
    const offset = Number(dayOfWeek) - 1;
    if (Number.isNaN(offset)) return null;
    base.setDate(base.getDate() + offset);
    return base.toISOString().slice(0, 10);
};

const rowTemplate = () => `
    <div class="schedule-entry" data-schedule-row>
        <div class="schedule-entry__header">
            <h3>Schedule entry</h3>
            <button type="button" class="table-button" data-remove-row>Remove</button>
        </div>
        <div class="schedule-entry__grid">
            <label class="form-field">
                Day
                <select name="dayOfWeek">
                    <option value="">Select</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                </select>
            </label>
            <label class="form-field">
                Start time
                <input name="startTime" type="text" placeholder="10:00 AM" />
            </label>
            <label class="form-field">
                End time
                <input name="endTime" type="text" placeholder="7:00 PM" />
            </label>
            <label class="form-field">
                Mode
                <select name="mode">
                    <option value="">Select</option>
                    <option value="on_premise">On premise</option>
                    <option value="remote">Remote</option>
                </select>
            </label>
        </div>
    </div>
`;

const getDayLabel = (select) => select?.selectedOptions?.[0]?.textContent?.trim() || "";

const renderStatusPill = (status) => {
    const normalized = status ? String(status).trim().toLowerCase() : "pending";
    const className =
        normalized === "approved"
            ? "status-pill status-pill--approved"
            : normalized === "denied"
              ? "status-pill status-pill--denied"
              : "status-pill status-pill--pending";
    return `<span class="${className}">${normalized}</span>`;
};

const renderRows = (rows) =>
    rows.length
        ? rows
              .map(
                  (row) => `
        <tr>
            <td>${row.week_of || "--"}</td>
            <td>${formatDay(row.calendar_day)}</td>
            <td>${row.day_of_week || "--"}</td>
            <td>${row.start_end_time || "--"}</td>
            <td>${formatMode(row.mode)}</td>
            <td>${renderStatusPill(row.status)}</td>
        </tr>`
              )
              .join("")
        : `<tr><td colspan="6">No requests found.</td></tr>`;

export const onMount = async () => {
    const currentUser = getCurrentUser();
    const form = document.querySelector("[data-schedule-form]");
    const messageEl = document.querySelector("[data-schedule-message]");
    const body = document.querySelector("[data-requests-body]");
    const rowsBody = document.querySelector("[data-schedule-rows]");
    const addRowButton = document.querySelector("[data-add-row]");
    const weekOfEl = document.querySelector("[data-week-of]");

    if (!currentUser || !form || !body || !rowsBody || !addRowButton) return;

    const weekOf = getWeekStartMonday();
    if (weekOfEl) {
        weekOfEl.textContent = formatDay(weekOf);
    }

    const addRow = () => {
        rowsBody.insertAdjacentHTML("beforeend", rowTemplate());
        updateRowControls();
    };

    const updateRowControls = () => {
        const rows = Array.from(rowsBody.querySelectorAll("[data-schedule-row]"));
        rows.forEach((row, index) => {
            const removeBtn = row.querySelector("[data-remove-row]");
            if (removeBtn) {
                removeBtn.disabled = rows.length === 1;
                removeBtn.dataset.index = String(index);
            }
        });
    };

    rowsBody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches("[data-remove-row]")) {
            target.closest("[data-schedule-row]")?.remove();
            updateRowControls();
        }
    });

    addRowButton.addEventListener("click", () => addRow());
    addRow();

    const loadRequests = async () => {
        try {
            const cacheKey = `chronos-schedule-requests:${currentUser.id}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const rows = JSON.parse(cached);
                body.innerHTML = renderRows(rows);
                return;
            }

            const rows = await fetchScheduleRequests(currentUser.id);
            sessionStorage.setItem(cacheKey, JSON.stringify(rows));
            body.innerHTML = renderRows(rows);
        } catch (error) {
            body.innerHTML = `<tr><td colspan="6">Unable to load requests.</td></tr>`;
        }
    };

    await loadRequests();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (messageEl) messageEl.textContent = "";

        const rows = Array.from(rowsBody.querySelectorAll("[data-schedule-row]"));
        const payloads = rows
            .map((row) => {
                const daySelect = row.querySelector("select[name='dayOfWeek']");
                const modeSelect = row.querySelector("select[name='mode']");
                const startInput = row.querySelector("input[name='startTime']");
                const endInput = row.querySelector("input[name='endTime']");

                const dayOfWeek = daySelect ? String(daySelect.value).trim() : "";
                const mode = modeSelect ? String(modeSelect.value).trim() : "";
                const startTime = startInput ? String(startInput.value).trim() : "";
                const endTime = endInput ? String(endInput.value).trim() : "";
                const dayLabel = getDayLabel(daySelect);

                if (!dayOfWeek && !mode && !startTime && !endTime) {
                    return null;
                }

                if (!dayOfWeek || !mode || !startTime || !endTime) {
                    return { error: "Fill out all schedule fields." };
                }

                const calendarDay = toCalendarDay(weekOf, dayOfWeek);
                if (!calendarDay) {
                    return { error: "Invalid schedule date." };
                }

                return {
                    employee_id: currentUser.id,
                    week_of: weekOf,
                    calendar_day: calendarDay,
                    day_of_week: dayLabel || dayOfWeek,
                    start_end_time: `${startTime}-${endTime}`,
                    mode,
                    status: "pending",
                };
            })
            .filter(Boolean);

        if (!payloads.length) {
            if (messageEl) messageEl.textContent = "Add at least one schedule row.";
            return;
        }

        const invalid = payloads.find((row) => row?.error);
        if (invalid?.error) {
            if (messageEl) messageEl.textContent = invalid.error;
            return;
        }

        try {
            await createScheduleRequest(payloads);
            form.reset();
            rowsBody.innerHTML = "";
            addRow();
            await loadRequests();
        } catch (error) {
            if (messageEl) messageEl.textContent = error?.message || "Unable to submit schedule.";
        }
    });
};
