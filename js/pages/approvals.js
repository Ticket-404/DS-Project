import {
    fetchAllScheduleRequests,
    fetchAllVacations,
    fetchAllSickDays,
    createScheduleSlot,
    deleteScheduleRequest,
    updateScheduleRequestStatus,
    updateVacationStatus,
    updateSickDayStatus,
} from "../supabase.js";

export const title = "Chronos | Approvals";

export const render = () => `
    <section>
        <section class="dashboard-barrier dashboard-barrier--top">
            <div class="history-header">
                <div>
                    <h1>Approvals</h1>
                    <p class="muted">Review and approve pending schedule, vacation, and sick-day requests.</p>
                </div>
            </div>
        </section>
        <section class="dashboard-barrier">
            <h2 class="history-title">Schedule requests</h2>
            <div class="table-wrap">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Week of</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Mode</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody data-approval-schedule>
                        <tr>
                            <td colspan="7">Loading schedule requests...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
        <section class="dashboard-barrier">
            <h2 class="history-title">Vacation requests</h2>
            <div class="table-wrap">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Days</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody data-approval-vacations>
                        <tr>
                            <td colspan="7">Loading vacation requests...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
        <section class="dashboard-barrier">
            <h2 class="history-title">Sick days</h2>
            <div class="table-wrap">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Days</th>
                            <th>Reason</th>
                            <th>Document</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody data-approval-sick>
                        <tr>
                            <td colspan="7">Loading sick-day requests...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </section>
`;

const renderStatus = (status) => (status ? String(status).trim() : "pending");
const renderStatusPill = (status) => {
    const normalized = renderStatus(status);
    const key = normalized.toLowerCase();
    const className =
        key === "approved"
            ? "status-pill status-pill--approved"
            : key === "denied"
              ? "status-pill status-pill--denied"
              : "status-pill status-pill--pending";
    return `<span class="${className}">${normalized}</span>`;
};
const renderEmployee = (row) =>
    row?.employee_name || row?.employee_email || row?.employee_id || "--";
const renderMode = (mode) => {
    if (!mode) return "--";
    return String(mode).replace(/_/g, " ");
};

const actionButtons = (type, id, status) => {
    if (status === "approved") {
        return `<span class="muted">Approved</span>`;
    }
    if (status === "denied") {
        return `<span class="muted">Denied</span>`;
    }
    return `
        <div class="schedule-approvals-row-actions">
            <button class="table-button" data-action="approve" data-type="${type}" data-id="${id}">
                Approve
            </button>
            <button class="table-button" data-action="deny" data-type="${type}" data-id="${id}">
                Deny
            </button>
        </div>
    `;
};

export const onMount = async () => {
    const scheduleBody = document.querySelector("[data-approval-schedule]");
    const vacationBody = document.querySelector("[data-approval-vacations]");
    const sickBody = document.querySelector("[data-approval-sick]");

    if (!scheduleBody || !vacationBody || !sickBody) return;

    const loadAll = async () => {
        try {
            const cacheKey = "chronos-approvals";
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                const scheduleRows = parsed.schedule || [];
                const vacationRows = parsed.vacations || [];
                const sickRows = parsed.sick || [];
                scheduleBody.innerHTML = scheduleRows.length
                    ? scheduleRows
                          .map(
                              (row) => `
                    <tr>
                        <td>${renderEmployee(row)}</td>
                        <td>${row.week_of || "--"}</td>
                        <td>${row.calendar_day || "--"}</td>
                        <td>${row.start_end_time || "--"}</td>
                        <td>${renderMode(row.mode)}</td>
                        <td>${renderStatusPill(row.status)}</td>
                        <td>${actionButtons("schedule", row.id, row.status)}</td>
                    </tr>`
                          )
                          .join("")
                    : `<tr><td colspan="7">No schedule requests.</td></tr>`;

                vacationBody.innerHTML = vacationRows.length
                    ? vacationRows
                          .map(
                              (row) => `
                    <tr>
                        <td>${renderEmployee(row)}</td>
                        <td>${row.date || "--"}</td>
                        <td>${row.category || "--"}</td>
                        <td>${row.days || "--"}</td>
                        <td>${row.reason || "--"}</td>
                        <td>${renderStatusPill(row.status)}</td>
                        <td>${actionButtons("vacation", row.id, row.status)}</td>
                    </tr>`
                          )
                          .join("")
                    : `<tr><td colspan="7">No vacation requests.</td></tr>`;

                sickBody.innerHTML = sickRows.length
                    ? sickRows
                          .map(
                              (row) => `
                    <tr>
                        <td>${renderEmployee(row)}</td>
                        <td>${row.date || "--"}</td>
                        <td>${row.days || "--"}</td>
                        <td>${row.reason || "--"}</td>
                        <td>${row.document_url ? "Uploaded" : "--"}</td>
                        <td>${renderStatusPill(row.status)}</td>
                        <td>${actionButtons("sick", row.id, row.status)}</td>
                    </tr>`
                          )
                          .join("")
                    : `<tr><td colspan="7">No sick-day requests.</td></tr>`;
                return;
            }

            const [scheduleRows, vacationRows, sickRows] = await Promise.all([
                fetchAllScheduleRequests(),
                fetchAllVacations(),
                fetchAllSickDays(),
            ]);
            sessionStorage.setItem(
                cacheKey,
                JSON.stringify({ schedule: scheduleRows, vacations: vacationRows, sick: sickRows })
            );

            scheduleBody.innerHTML = scheduleRows.length
                ? scheduleRows
                      .map(
                          (row) => `
                    <tr>
                        <td>${renderEmployee(row)}</td>
                        <td>${row.week_of || "--"}</td>
                        <td>${row.calendar_day || "--"}</td>
                        <td>${row.start_end_time || "--"}</td>
                        <td>${renderMode(row.mode)}</td>
                        <td>${renderStatusPill(row.status)}</td>
                        <td>${actionButtons("schedule", row.id, row.status)}</td>
                    </tr>`
                      )
                      .join("")
                : `<tr><td colspan="7">No schedule requests.</td></tr>`;

            vacationBody.innerHTML = vacationRows.length
                ? vacationRows
                      .map(
                          (row) => `
                    <tr>
                        <td>${renderEmployee(row)}</td>
                        <td>${row.date || "--"}</td>
                        <td>${row.category || "--"}</td>
                        <td>${row.days || "--"}</td>
                        <td>${row.reason || "--"}</td>
                        <td>${renderStatusPill(row.status)}</td>
                        <td>${actionButtons("vacation", row.id, row.status)}</td>
                    </tr>`
                      )
                      .join("")
                : `<tr><td colspan="7">No vacation requests.</td></tr>`;

            sickBody.innerHTML = sickRows.length
                ? sickRows
                      .map(
                          (row) => `
                    <tr>
                        <td>${renderEmployee(row)}</td>
                        <td>${row.date || "--"}</td>
                        <td>${row.days || "--"}</td>
                        <td>${row.reason || "--"}</td>
                        <td>${row.document_url ? "Uploaded" : "--"}</td>
                        <td>${renderStatusPill(row.status)}</td>
                        <td>${actionButtons("sick", row.id, row.status)}</td>
                    </tr>`
                      )
                      .join("")
                : `<tr><td colspan="7">No sick-day requests.</td></tr>`;
        } catch (error) {
            scheduleBody.innerHTML = `<tr><td colspan="7">Unable to load schedule requests.</td></tr>`;
            vacationBody.innerHTML = `<tr><td colspan="7">Unable to load vacation requests.</td></tr>`;
            sickBody.innerHTML = `<tr><td colspan="7">Unable to load sick-day requests.</td></tr>`;
        }
    };

    const handleAction = async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.matches("[data-action]")) return;

        const action = target.dataset.action;
        const type = target.dataset.type;
        const id = target.dataset.id;
        if (!action || !type || !id) return;

        const status = action === "approve" ? "approved" : "denied";

        try {
            if (type === "schedule") {
                if (status === "approved") {
                    const row = await updateScheduleRequestStatus(id, status);
                    if (row) {
                        await createScheduleSlot({
                            employee_id: row.employee_id,
                            calendar_day: row.calendar_day,
                            day_of_week: row.day_of_week,
                            start_end_time: row.start_end_time,
                            mode: row.mode,
                        });
                        await deleteScheduleRequest(id);
                    }
                } else {
                    await updateScheduleRequestStatus(id, status);
                }
            } else if (type === "vacation") {
                await updateVacationStatus(id, status);
            } else if (type === "sick") {
                await updateSickDayStatus(id, status);
            }
            await loadAll();
        } catch (error) {
            console.error("Approval failed", error);
        }
    };

    scheduleBody.addEventListener("click", handleAction);
    vacationBody.addEventListener("click", handleAction);
    sickBody.addEventListener("click", handleAction);

    await loadAll();
};
