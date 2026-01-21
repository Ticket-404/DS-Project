import { createVacation, fetchVacations, getCurrentUser } from "../supabase.js";

export const title = "Chronos | Vacations";

export const render = () => `
    <section>
        <section class="dashboard-barrier dashboard-barrier--top">
            <div class="history-header vacations-hero">
                <div>
                    <h1>Vacation requests</h1>
                    <p class="muted">Track approved and pending requests for 2026.</p>
                </div>
                <div class="vacations-actions">
                    <a class="secondary-button" href="?page=profile">Back to profile</a>
                </div>
            </div>
            <section class="dashboard-grid vacation-balance">
                <article class="status-card">
                    <p class="status-card__label">Days off</p>
                    <p class="status-card__value">6</p>
                    <p class="status-card__meta">0 used of 6</p>
                </article>
                <article class="status-card">
                    <p class="status-card__label">Emergency days</p>
                    <p class="status-card__value">6</p>
                    <p class="status-card__meta">0 used of 6</p>
                </article>
                <article class="status-card">
                    <p class="status-card__label">Paid vacation</p>
                    <p class="status-card__value">24</p>
                    <p class="status-card__meta">0 used of 24</p>
                </article>
                <article class="status-card">
                    <p class="status-card__label">Unpaid vacation</p>
                    <p class="status-card__value">15</p>
                    <p class="status-card__meta">0 used of 15</p>
                </article>
            </section>
        </section>
        <section class="dashboard-barrier dashboard-barrier--vacation">
            <section class="vacations-split">
                <article class="status-card vacations-card vacations-card--form">
                    <div class="vacations-card__header">
                        <div>
                            <h2>Request time off</h2>
                            <p class="vacations-note">Submit a request and we will notify you once it is approved.</p>
                        </div>
                        <span class="status-pill status-pill--pending">Pending 0</span>
                    </div>
                    <form class="vacations-form" action="#" method="post" data-vacation-form>
                        <input type="hidden" name="intent" value="create" />
                        <div class="vacations-form__actions vacations-form__actions--top">
                            <span class="vacations-form__meta">Add multiple rows and submit together.</span>
                            <button type="button" class="secondary-button" data-add-vacation-row>Add row</button>
                        </div>
                        <div class="vacations-multi" data-vacation-rows></div>
                        <div class="vacations-form__actions">
                            <button type="submit" class="primary-button">Submit request</button>
                            <span class="vacations-form__meta">Manager approval required.</span>
                        </div>
                        <p class="form-error" data-vacation-message></p>
                    </form>
                </article>
                <article class="status-card vacations-card">
                    <h2>Pending approvals</h2>
                    <p class="muted">Pending requests stay in review until verified.</p>
                    <div class="vacations-pending">
                        <div>
                            <span class="status-pill status-pill--pending">Pending</span>
                            <p class="vacations-pending__value" data-vacation-pending>0 days</p>
                        </div>
                        <div>
                            <span class="status-pill status-pill--approved">Approved</span>
                            <p class="vacations-pending__value" data-vacation-approved>0 days</p>
                        </div>
                    </div>
                    <p class="status-card__meta">Only approved requests affect your remaining balance.</p>
                </article>
            </section>
            <h2 class="history-title">Requests</h2>
            <div class="table-wrap">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Reason</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody data-vacation-body>
                        <tr>
                            <td colspan="6">Loading requests...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </section>
`;

const renderRows = (rows) =>
    rows.length
        ? rows
              .map(
                  (row) => `
        <tr>
            <td>${row.date || "--"}</td>
            <td>${row.category || "--"}</td>
            <td>${row.days || "--"}</td>
            <td>${row.status || "pending"}</td>
            <td>${row.reason || "--"}</td>
            <td>--</td>
        </tr>`
              )
              .join("")
        : `<tr><td colspan="6">No requests found.</td></tr>`;

const vacationRowTemplate = () => `
    <div class="vacations-row" data-vacation-row>
        <div class="vacations-form__grid">
            <label class="form-field">
                Type
                <select name="category" required data-vacation-type>
                    <option value="">Select type</option>
                    <option value="days_off">Days off</option>
                    <option value="emergency_days">Emergency days</option>
                    <option value="paid_vacation">Paid vacation</option>
                    <option value="unpaid_vacation">Unpaid vacation</option>
                </select>
            </label>
            <label class="form-field is-hidden" data-field="single-date">
                Date
                <input name="date" type="date" />
            </label>
            <label class="form-field is-hidden" data-field="start-date">
                Start date
                <input name="startDate" type="date" />
            </label>
            <label class="form-field is-hidden" data-field="end-date">
                End date
                <input name="endDate" type="date" />
            </label>
            <label class="form-field is-hidden" data-field="days-count">
                Days
                <input name="days" type="number" min="1" step="1" />
            </label>
        </div>
        <label class="form-field">
            Reason
            <textarea name="reason" rows="3" required></textarea>
        </label>
        <div class="vacations-row__actions">
            <span class="vacations-form__hint" data-days-summary>Whole days only.</span>
            <button type="button" class="table-button" data-remove-vacation-row>Remove</button>
        </div>
    </div>
`;

const getDaysBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const ms = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
    return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
};

const updateRowFields = (row) => {
    const typeSelect = row.querySelector("[data-vacation-type]");
    const type = typeSelect ? String(typeSelect.value) : "";
    const singleDate = row.querySelector("[data-field='single-date']");
    const startDate = row.querySelector("[data-field='start-date']");
    const endDate = row.querySelector("[data-field='end-date']");
    const daysCount = row.querySelector("[data-field='days-count']");
    const summary = row.querySelector("[data-days-summary]");

    const toggle = (el, show) => {
        if (!el) return;
        el.classList.toggle("is-hidden", !show);
    };

    if (type === "paid_vacation" || type === "unpaid_vacation") {
        toggle(singleDate, false);
        toggle(daysCount, false);
        toggle(startDate, true);
        toggle(endDate, true);
        if (summary) summary.textContent = "Enter a date range.";
    } else if (type === "days_off") {
        toggle(singleDate, true);
        toggle(daysCount, false);
        toggle(startDate, false);
        toggle(endDate, false);
        if (summary) summary.textContent = "One day off per week.";
    } else if (type === "emergency_days") {
        toggle(singleDate, true);
        toggle(daysCount, true);
        toggle(startDate, false);
        toggle(endDate, false);
        if (summary) summary.textContent = "Enter total days.";
    } else {
        toggle(singleDate, false);
        toggle(daysCount, false);
        toggle(startDate, false);
        toggle(endDate, false);
        if (summary) summary.textContent = "Select a type to continue.";
    }
};

export const onMount = async () => {
    const currentUser = getCurrentUser();
    const form = document.querySelector("[data-vacation-form]");
    const messageEl = document.querySelector("[data-vacation-message]");
    const body = document.querySelector("[data-vacation-body]");
    const pendingEl = document.querySelector("[data-vacation-pending]");
    const approvedEl = document.querySelector("[data-vacation-approved]");
    const rowsContainer = document.querySelector("[data-vacation-rows]");
    const addRowButton = document.querySelector("[data-add-vacation-row]");

    if (!currentUser || !form || !body || !rowsContainer || !addRowButton) return;

    const addRow = () => {
        rowsContainer.insertAdjacentHTML("beforeend", vacationRowTemplate());
        const row = rowsContainer.lastElementChild;
        if (row) {
            const typeSelect = row.querySelector("[data-vacation-type]");
            if (typeSelect) {
                typeSelect.addEventListener("change", () => updateRowFields(row));
            }
            const startInput = row.querySelector("input[name='startDate']");
            const endInput = row.querySelector("input[name='endDate']");
            const updateSummary = () => {
                const summary = row.querySelector("[data-days-summary]");
                const start = startInput ? startInput.value : "";
                const end = endInput ? endInput.value : "";
                if (summary && start && end) {
                    const days = getDaysBetween(start, end);
                    summary.textContent = days > 0 ? `Total days: ${days}` : "Enter a valid range.";
                }
            };
            if (startInput) startInput.addEventListener("change", updateSummary);
            if (endInput) endInput.addEventListener("change", updateSummary);
            updateRowFields(row);
        }
        updateRowControls();
    };

    const updateRowControls = () => {
        const rows = Array.from(rowsContainer.querySelectorAll("[data-vacation-row]"));
        rows.forEach((row) => {
            const removeBtn = row.querySelector("[data-remove-vacation-row]");
            if (removeBtn) {
                removeBtn.disabled = rows.length === 1;
            }
        });
    };

    rowsContainer.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches("[data-remove-vacation-row]")) {
            target.closest("[data-vacation-row]")?.remove();
            updateRowControls();
        }
    });

    addRowButton.addEventListener("click", () => addRow());
    addRow();

    const loadVacations = async () => {
        try {
            const cacheKey = `chronos-vacations:${currentUser.id}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const rows = JSON.parse(cached);
                body.innerHTML = renderRows(rows);
                const pending = rows.filter((row) => row.status === "pending");
                const approved = rows.filter((row) => row.status === "approved");
                const pendingDays = pending.reduce((sum, row) => sum + Number(row.days || 0), 0);
                const approvedDays = approved.reduce((sum, row) => sum + Number(row.days || 0), 0);
                if (pendingEl) pendingEl.textContent = `${pendingDays} days`;
                if (approvedEl) approvedEl.textContent = `${approvedDays} days`;
                return;
            }

            const rows = await fetchVacations(currentUser.id);
            sessionStorage.setItem(cacheKey, JSON.stringify(rows));
            body.innerHTML = renderRows(rows);
            const pending = rows.filter((row) => row.status === "pending");
            const approved = rows.filter((row) => row.status === "approved");
            const pendingDays = pending.reduce((sum, row) => sum + Number(row.days || 0), 0);
            const approvedDays = approved.reduce((sum, row) => sum + Number(row.days || 0), 0);
            if (pendingEl) pendingEl.textContent = `${pendingDays} days`;
            if (approvedEl) approvedEl.textContent = `${approvedDays} days`;
        } catch (error) {
            body.innerHTML = `<tr><td colspan="6">Unable to load requests.</td></tr>`;
        }
    };

    await loadVacations();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (messageEl) messageEl.textContent = "";

        const rows = Array.from(rowsContainer.querySelectorAll("[data-vacation-row]"));
        const payloads = rows
            .map((row) => {
                const dateInput = row.querySelector("input[name='date']");
                const startInput = row.querySelector("input[name='startDate']");
                const endInput = row.querySelector("input[name='endDate']");
                const categorySelect = row.querySelector("select[name='category']");
                const daysInput = row.querySelector("input[name='days']");
                const reasonInput = row.querySelector("textarea[name='reason']");

                const date = dateInput ? String(dateInput.value).trim() : "";
                const startDate = startInput ? String(startInput.value).trim() : "";
                const endDate = endInput ? String(endInput.value).trim() : "";
                const category = categorySelect ? String(categorySelect.value).trim() : "";
                const days = daysInput ? Number(daysInput.value || 0) : 0;
                const reason = reasonInput ? String(reasonInput.value).trim() : "";

                if (!date && !startDate && !endDate && !category && !days && !reason) {
                    return null;
                }

                if (!category || !reason) {
                    return { error: "Fill out all vacation fields." };
                }

                if (category === "paid_vacation" || category === "unpaid_vacation") {
                    if (!startDate || !endDate) {
                        return { error: "Add a start and end date." };
                    }
                    const totalDays = getDaysBetween(startDate, endDate);
                    if (totalDays <= 0) {
                        return { error: "End date must be after start date." };
                    }
                    return {
                        employee_id: currentUser.id,
                        date: startDate,
                        category,
                        days: totalDays,
                        reason: `${reason} (Range: ${startDate} to ${endDate})`,
                        status: "pending",
                    };
                }

                if (category === "days_off") {
                    if (!date) {
                        return { error: "Choose a date for days off." };
                    }
                    return {
                        employee_id: currentUser.id,
                        date,
                        category,
                        days: 1,
                        reason,
                        status: "pending",
                    };
                }

                if (category === "emergency_days") {
                    if (!date || !days) {
                        return { error: "Add a date and number of days." };
                    }
                    return {
                        employee_id: currentUser.id,
                        date,
                        category,
                        days,
                        reason,
                        status: "pending",
                    };
                }

                return { error: "Select a valid vacation type." };
            })
            .filter(Boolean);

        if (!payloads.length) {
            if (messageEl) messageEl.textContent = "Add at least one vacation row.";
            return;
        }

        const invalid = payloads.find((row) => row?.error);
        if (invalid?.error) {
            if (messageEl) messageEl.textContent = invalid.error;
            return;
        }

        try {
            await createVacation(payloads);
            form.reset();
            rowsContainer.innerHTML = "";
            addRow();
            await loadVacations();
        } catch (error) {
            if (messageEl) messageEl.textContent = error?.message || "Unable to submit request.";
        }
    });
};