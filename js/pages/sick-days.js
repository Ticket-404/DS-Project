import {
    createSickDay,
    fetchSickDays,
    getCurrentUser,
    uploadSickDocument,
} from "../supabase.js";

export const title = "Chronos | Sick days";

export const render = () => `
    <section>
        <section class="dashboard-barrier dashboard-barrier--top">
            <div class="history-header vacations-hero">
                <div>
                    <h1>Sick days</h1>
                    <p class="muted">Submit sick leave with a doctor approval document.</p>
                </div>
                <div class="vacations-actions">
                    <a class="secondary-button" href="?page=profile">Back to profile</a>
                </div>
            </div>
        </section>
        <section class="dashboard-barrier dashboard-barrier--vacation">
            <section class="vacations-split">
                <article class="status-card vacations-card vacations-card--form">
                    <div class="vacations-card__header">
                        <div>
                            <h2>Request sick leave</h2>
                            <p class="vacations-note">Unlimited requests, manager approval required.</p>
                        </div>
                        <span class="status-pill status-pill--pending">Pending 0</span>
                    </div>
                    <form class="vacations-form" action="#" method="post" enctype="multipart/form-data" data-sick-form>
                        <div class="vacations-form__actions vacations-form__actions--top">
                            <span class="vacations-form__meta">Add multiple rows and submit together.</span>
                            <button type="button" class="secondary-button" data-add-sick-row>Add row</button>
                        </div>
                        <div class="vacations-multi" data-sick-rows></div>
                        <div class="vacations-form__actions">
                            <button type="submit" class="primary-button">Submit request</button>
                            <span class="vacations-form__meta">Doctor approval document required.</span>
                        </div>
                        <p class="form-error" data-sick-message></p>
                    </form>
                </article>
                <article class="status-card vacations-card">
                    <h2>Status overview</h2>
                    <p class="muted">Approved and denied requests are tracked here.</p>
                    <div class="vacations-pending">
                        <div>
                            <span class="status-pill status-pill--pending">Pending</span>
                            <p class="vacations-pending__value" data-sick-pending>0 days</p>
                        </div>
                        <div>
                            <span class="status-pill status-pill--approved">Approved</span>
                            <p class="vacations-pending__value" data-sick-approved>0 days</p>
                        </div>
                        <div>
                            <span class="status-pill status-pill--denied">Denied</span>
                            <p class="vacations-pending__value" data-sick-denied>0 days</p>
                        </div>
                    </div>
                    <p class="status-card__meta">Pending requests stay in review until verified.</p>
                </article>
            </section>
            <h2 class="history-title">Requests</h2>
            <div class="table-wrap">
                <table class="grid-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Reason</th>
                            <th>Document</th>
                        </tr>
                    </thead>
                    <tbody data-sick-body>
                        <tr>
                            <td colspan="5">Loading requests...</td>
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
            <td>${row.days || "--"}</td>
            <td>${row.status || "pending"}</td>
            <td>${row.reason || "--"}</td>
            <td>${row.document_url ? "Uploaded" : "--"}</td>
        </tr>`
              )
              .join("")
        : `<tr><td colspan="5">No requests found.</td></tr>`;

let sickRowId = 0;
const sickRowTemplate = () => {
    sickRowId += 1;
    const inputId = `sick-doc-${sickRowId}`;
    return `
        <div class="vacations-row" data-sick-row>
            <div class="vacations-form__grid">
                <label class="form-field">
                    Date
                    <input name="date" type="date" required />
                </label>
                <label class="form-field">
                    Days
                    <input name="days" type="number" min="1" step="1" required />
                </label>
                <label class="form-field">
                    Doctor document
                    <div class="file-upload">
                        <input
                            id="${inputId}"
                            name="document"
                            type="file"
                            accept="image/*,application/pdf"
                            class="file-input"
                            required
                        />
                        <label for="${inputId}" class="file-dropzone">
                            <span class="file-dropzone__title">Drop your document here</span>
                            <span class="file-dropzone__meta">
                                or click to browse (PDF or photo, max 10MB)
                            </span>
                        </label>
                    </div>
                </label>
            </div>
            <p class="vacations-form__hint">Upload a PDF or photo (max 10MB).</p>
            <label class="form-field">
                Reason
                <textarea name="reason" rows="3" required></textarea>
            </label>
            <div class="vacations-row__actions">
                <span class="vacations-form__meta">Document required.</span>
                <button type="button" class="table-button" data-remove-sick-row>Remove</button>
            </div>
        </div>
    `;
};

export const onMount = async () => {
    const currentUser = getCurrentUser();
    const form = document.querySelector("[data-sick-form]");
    const messageEl = document.querySelector("[data-sick-message]");
    const body = document.querySelector("[data-sick-body]");
    const pendingEl = document.querySelector("[data-sick-pending]");
    const approvedEl = document.querySelector("[data-sick-approved]");
    const deniedEl = document.querySelector("[data-sick-denied]");
    const rowsContainer = document.querySelector("[data-sick-rows]");
    const addRowButton = document.querySelector("[data-add-sick-row]");

    if (!currentUser || !form || !body || !rowsContainer || !addRowButton) return;

    const addRow = () => {
        rowsContainer.insertAdjacentHTML("beforeend", sickRowTemplate());
        updateRowControls();
    };

    const updateRowControls = () => {
        const rows = Array.from(rowsContainer.querySelectorAll("[data-sick-row]"));
        rows.forEach((row) => {
            const removeBtn = row.querySelector("[data-remove-sick-row]");
            if (removeBtn) {
                removeBtn.disabled = rows.length === 1;
            }
        });
    };

    rowsContainer.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches("[data-remove-sick-row]")) {
            target.closest("[data-sick-row]")?.remove();
            updateRowControls();
        }
    });

    addRowButton.addEventListener("click", () => addRow());
    addRow();

    const loadSickDays = async () => {
        let cachedRows = null;
        const cacheKey = `chronos-sick-days:${currentUser.id}`;

        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                cachedRows = JSON.parse(cached);
                body.innerHTML = renderRows(cachedRows);
                const pending = cachedRows.filter((row) => row.status === "pending");
                const approved = cachedRows.filter((row) => row.status === "approved");
                const denied = cachedRows.filter((row) => row.status === "denied");
                const pendingDays = pending.reduce((sum, row) => sum + Number(row.days || 0), 0);
                const approvedDays = approved.reduce((sum, row) => sum + Number(row.days || 0), 0);
                const deniedDays = denied.reduce((sum, row) => sum + Number(row.days || 0), 0);
                if (pendingEl) pendingEl.textContent = `${pendingDays} days`;
                if (approvedEl) approvedEl.textContent = `${approvedDays} days`;
                if (deniedEl) deniedEl.textContent = `${deniedDays} days`;
            }
        } catch (error) {
            cachedRows = null;
        }

        try {
            const rows = await fetchSickDays(currentUser.id);
            sessionStorage.setItem(cacheKey, JSON.stringify(rows));
            body.innerHTML = renderRows(rows);
            const pending = rows.filter((row) => row.status === "pending");
            const approved = rows.filter((row) => row.status === "approved");
            const denied = rows.filter((row) => row.status === "denied");
            const pendingDays = pending.reduce((sum, row) => sum + Number(row.days || 0), 0);
            const approvedDays = approved.reduce((sum, row) => sum + Number(row.days || 0), 0);
            const deniedDays = denied.reduce((sum, row) => sum + Number(row.days || 0), 0);
            if (pendingEl) pendingEl.textContent = `${pendingDays} days`;
            if (approvedEl) approvedEl.textContent = `${approvedDays} days`;
            if (deniedEl) deniedEl.textContent = `${deniedDays} days`;
        } catch (error) {
            if (!cachedRows) {
                body.innerHTML = `<tr><td colspan="5">Unable to load requests.</td></tr>`;
            }
        }
    };

    await loadSickDays();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (messageEl) messageEl.textContent = "";

        const rows = Array.from(rowsContainer.querySelectorAll("[data-sick-row]"));
        const payloads = [];

        for (const row of rows) {
            const dateInput = row.querySelector("input[name='date']");
            const daysInput = row.querySelector("input[name='days']");
            const reasonInput = row.querySelector("textarea[name='reason']");
            const fileInput = row.querySelector("input[name='document']");

            const date = dateInput ? String(dateInput.value).trim() : "";
            const days = daysInput ? Number(daysInput.value || 0) : 0;
            const reason = reasonInput ? String(reasonInput.value).trim() : "";
            const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;

            if (!date && !days && !reason && !file) {
                continue;
            }

            if (!date || !days || !reason || !file) {
                if (messageEl) messageEl.textContent = "Fill out all sick day fields.";
                return;
            }

            let documentUrl = null;
            try {
                documentUrl = await uploadSickDocument(file, currentUser.id);
            } catch (error) {
                if (messageEl) messageEl.textContent = "Upload failed. Check storage bucket.";
                return;
            }

            payloads.push({
                employee_id: currentUser.id,
                date,
                days,
                reason,
                document_url: documentUrl,
                status: "pending",
            });
        }

        if (!payloads.length) {
            if (messageEl) messageEl.textContent = "Add at least one sick day row.";
            return;
        }

        try {
            await createSickDay(payloads);
            form.reset();
            rowsContainer.innerHTML = "";
            addRow();
            await loadSickDays();
        } catch (error) {
            if (messageEl) messageEl.textContent = error?.message || "Unable to submit request.";
        }
    });
};

export const refresh = async () => {
    const currentUser = getCurrentUser();
    const body = document.querySelector("[data-sick-body]");
    const pendingEl = document.querySelector("[data-sick-pending]");
    const approvedEl = document.querySelector("[data-sick-approved]");
    const deniedEl = document.querySelector("[data-sick-denied]");
    if (!currentUser || !body) return;

    try {
        const cacheKey = `chronos-sick-days:${currentUser.id}`;
        const rows = await fetchSickDays(currentUser.id);
        sessionStorage.setItem(cacheKey, JSON.stringify(rows));
        body.innerHTML = renderRows(rows);
        const pending = rows.filter((row) => row.status === "pending");
        const approved = rows.filter((row) => row.status === "approved");
        const denied = rows.filter((row) => row.status === "denied");
        const pendingDays = pending.reduce((sum, row) => sum + Number(row.days || 0), 0);
        const approvedDays = approved.reduce((sum, row) => sum + Number(row.days || 0), 0);
        const deniedDays = denied.reduce((sum, row) => sum + Number(row.days || 0), 0);
        if (pendingEl) pendingEl.textContent = `${pendingDays} days`;
        if (approvedEl) approvedEl.textContent = `${approvedDays} days`;
        if (deniedEl) deniedEl.textContent = `${deniedDays} days`;
    } catch (error) {
        // Ignore refresh errors.
    }
};
