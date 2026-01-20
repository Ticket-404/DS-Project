import { signInWithPassword } from "../supabase.js";

export const title = "Chronos | Login";

export const render = () => `
    <section class="form-card login-grid">
        <div class="hero-panel">
            <p class="eyebrow">Hybrid Staff HQ</p>
            <h1>Welcome back.</h1>
            <p class="hero-copy">
                Sign in to log hours, submit late reasons, and stay aligned with office Wi-Fi requirements.
            </p>
            <ul class="hero-list">
                <li>Asia/Tbilisi timestamps for every shift.</li>
                <li>Office days require approved Wi-Fi ranges.</li>
            </ul>
        </div>
        <div class="auth-panel">
            <form class="auth-form" action="#" method="post" data-login-form novalidate>
                <label class="form-field">
                    Email
                    <input type="email" name="email" placeholder="" />
                </label>
                <p class="form-error" data-login-message></p>
                <label class="form-field">
                    Password
                    <input type="password" name="password" placeholder="" />
                </label>
                <button type="submit" class="primary-button">Sign in with password</button>
            </form>
            <div class="magic-link-panel">
                <h2>Need a magic link?</h2>
                <p class="hero-copy">Request a passwordless login link that expires after one hour.</p>
                <form class="auth-form" action="#" method="post" data-magic-form novalidate>
                    <label class="form-field">
                        Email
                        <input type="email" name="magicEmail" placeholder="" />
                    </label>
                    <button type="submit" class="secondary-button">Send magic link</button>
                    <p class="form-error" data-magic-message></p>
                </form>
                <p class="forgot-link">Need more help? <a href="?page=profile">Reset your password</a></p>
            </div>
        </div>
    </section>
`;

export const onMount = () => {
    const form = document.querySelector("[data-login-form]");
    const messageEl = document.querySelector("[data-login-message]");
    const magicForm = document.querySelector("[data-magic-form]");
    const magicMessageEl = document.querySelector("[data-magic-message]");

    const showMessage = (el, message) => {
        if (!el) return;
        el.textContent = message || "";
        if (message) {
            el.removeAttribute("hidden");
        } else {
            el.setAttribute("hidden", "");
        }
    };

    const ensureErrorEl = (form, fieldName) => {
        if (!form) return null;
        const fieldInput = form.querySelector(`input[name="${fieldName}"]`);
        if (!fieldInput) return null;
        const fieldLabel = fieldInput.closest(".form-field");
        if (!fieldLabel) return null;
        let errorEl = fieldLabel.nextElementSibling;
        if (!errorEl || !errorEl.classList.contains("form-error")) {
            errorEl = document.createElement("p");
            errorEl.className = "form-error";
            fieldLabel.insertAdjacentElement("afterend", errorEl);
        }
        return errorEl;
    };

    const clearError = (form, fieldName) => {
        const errorEl = ensureErrorEl(form, fieldName);
        if (errorEl) errorEl.textContent = "";
    };

    const setError = (form, fieldName, message) => {
        const errorEl = ensureErrorEl(form, fieldName);
        if (errorEl) errorEl.textContent = message;
    };

    if (magicForm) {
        magicForm.addEventListener("submit", (event) => {
            event.preventDefault();
            showMessage(messageEl, "");
            showMessage(magicMessageEl, "");

            const formData = new FormData(magicForm);
            const email =
                String(formData.get("magicEmail") || "").trim() ||
                String(formData.get("email") || "").trim();

            if (!email) {
                showMessage(magicMessageEl, "Please enter your email.");
                return;
            }

            showMessage(magicMessageEl, "Magic link is disabled for custom accounts.");
        });
    }

    if (!form) return;
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage(messageEl, "");

        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "").trim();

        if (!email && !password) {
            showMessage(messageEl, "Please enter your email and password.");
            return;
        }
        if (!email) {
            showMessage(messageEl, "Please enter your email.");
            return;
        }
        if (!password) {
            showMessage(messageEl, "Please enter your password.");
            return;
        }

        try {
            await signInWithPassword(email, password);
            window.location.href = "index.html?page=profile";
        } catch (error) {
            showMessage(messageEl, error?.message || "Login failed.");
        }
    });
};

if (document.querySelector("[data-login-form]")) {
    onMount();
}

