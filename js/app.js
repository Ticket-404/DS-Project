import {
    render as renderProfile,
    title as titleProfile,
    onMount as onMountProfile,
    refresh as refreshProfile,
} from "./pages/profile.js";
import {
    render as renderSchedule,
    title as titleSchedule,
    onMount as onMountSchedule,
    refresh as refreshSchedule,
} from "./pages/schedule.js";
import {
    render as renderScheduleRequest,
    title as titleScheduleRequest,
    onMount as onMountScheduleRequest,
    refresh as refreshScheduleRequest,
} from "./pages/schedule-request.js";
import {
    render as renderVacations,
    title as titleVacations,
    onMount as onMountVacations,
    refresh as refreshVacations,
} from "./pages/vacations.js";
import {
    render as renderSickDays,
    title as titleSickDays,
    onMount as onMountSickDays,
    refresh as refreshSickDays,
} from "./pages/sick-days.js";
import { render as renderLogin, title as titleLogin, onMount as onMountLogin } from "./pages/login.js";
import {
    render as renderApprovals,
    title as titleApprovals,
    onMount as onMountApprovals,
    refresh as refreshApprovals,
} from "./pages/approvals.js";
import { clearCurrentUser, getCurrentUser } from "./supabase.js";

const routes = {
    profile: {
        title: titleProfile,
        render: renderProfile,
        onMount: onMountProfile,
        refresh: refreshProfile,
        requireAuth: true,
    },
    schedule: {
        title: titleSchedule,
        render: renderSchedule,
        onMount: onMountSchedule,
        refresh: refreshSchedule,
        requireAuth: true,
    },
    "schedule-request": {
        title: titleScheduleRequest,
        render: renderScheduleRequest,
        onMount: onMountScheduleRequest,
        refresh: refreshScheduleRequest,
        requireAuth: true,
    },
    vacations: {
        title: titleVacations,
        render: renderVacations,
        onMount: onMountVacations,
        refresh: refreshVacations,
        requireAuth: true,
    },
    "sick-days": {
        title: titleSickDays,
        render: renderSickDays,
        onMount: onMountSickDays,
        refresh: refreshSickDays,
        requireAuth: true,
    },
    approvals: {
        title: titleApprovals,
        render: renderApprovals,
        onMount: onMountApprovals,
        refresh: refreshApprovals,
        requireAuth: true,
    },
    login: { title: titleLogin, render: renderLogin, onMount: onMountLogin, requireAuth: false },
};

const routeCache = new Map();
let cachedUserId = null;

const stripIndexHtml = () => {
    if (!window.location.pathname.endsWith("/index.html")) return;
    const cleanPath = window.location.pathname.replace(/\/index\.html$/, "/");
    const nextUrl = `${cleanPath}${window.location.search}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
};

const contentEl = document.querySelector("[data-app-content]");
const mainEl = contentEl?.closest("main");
const navEl = document.querySelector(".app-shell__nav");
const defaultNavMarkup = navEl?.innerHTML || "";
const loginNavMarkup = defaultNavMarkup;
const userNameEl = document.querySelector(".app-shell__user-name");
const userLabelEl = document.querySelector(".app-shell__user-label");
const userBlockEl = document.querySelector(".app-shell__user");
const navWrapEl = document.querySelector("[data-app-nav]");
const adminLinkEl = document.querySelector("[data-admin-link]");
const logoutLink = document.querySelector("[data-route='login']");
const navToggleEl = document.querySelector(".app-shell__nav-toggle");
const navMenuEl = document.querySelector(".app-shell__menu");
const navBurgerEl = document.querySelector(".app-shell__burger");

const syncMobileNavAria = () => {
    if (!navBurgerEl || !navToggleEl) return;
    navBurgerEl.setAttribute("aria-expanded", navToggleEl.checked ? "true" : "false");
};

const closeMobileNav = () => {
    if (!navToggleEl) return;
    navToggleEl.checked = false;
    syncMobileNavAria();
};

const normalizeRoute = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") || "profile";
};

const applyLoginVisibility = (routeKey) => {
    const isLogin = routeKey === "login";
    if (navWrapEl) {
        navWrapEl.classList.toggle("is-hidden", isLogin);
    }
    if (userBlockEl) {
        userBlockEl.classList.toggle("is-hidden", isLogin);
    }
    if (navEl && isLogin) {
        navEl.innerHTML = loginNavMarkup;
    }
};

const updatePageParam = (routeKey, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", routeKey);
    if (replace) {
        window.history.replaceState(null, "", url.toString());
    } else {
        window.history.pushState(null, "", url.toString());
    }
};

const setActiveNav = (routeKey) => {
    if (!navEl) return;
    const links = navEl.querySelectorAll(".app-shell__link");
    links.forEach((link) => link.classList.remove("app-shell__link--active"));
    if (!routeKey) return;
    const activeLink = navEl.querySelector(`[data-route="${routeKey}"]`);
    if (activeLink) {
        activeLink.classList.add("app-shell__link--active");
    }
};

const updateUserHeader = (routeKey) => {
    const currentUser = getCurrentUser();
    if (!userNameEl || !userLabelEl) return;

    if (currentUser) {
        userLabelEl.textContent = "Signed in as";
        userNameEl.textContent = currentUser.name || currentUser.email || "Employee";
    } else {
        userLabelEl.textContent = "";
        userNameEl.textContent = "";
    }

    if (userBlockEl) {
        userBlockEl.classList.toggle("is-hidden", routeKey === "login");
    }

    if (navWrapEl) {
        const shouldShowNav = routeKey !== "login" && Boolean(currentUser);
        navWrapEl.classList.toggle("is-hidden", !shouldShowNav);
    }

    const adminLinkEl = document.querySelector("[data-admin-link]");
    if (adminLinkEl) {
        const isAdmin = currentUser?.is_admin === true || currentUser?.role === "admin";
        adminLinkEl.classList.toggle("is-hidden", !isAdmin);
    }
};

const renderRoute = async () => {
    if (!contentEl) return;
    closeMobileNav();

    const currentUser = getCurrentUser();
    let routeKey = normalizeRoute();
    if (!routes[routeKey]) {
        routeKey = "profile";
    }
    if (routes[routeKey].requireAuth && !currentUser) {
        routeKey = "login";
        updatePageParam("login", true);
    }
    if (routeKey === "approvals" && currentUser?.is_admin !== true && currentUser?.role !== "admin") {
        routeKey = "profile";
        updatePageParam("profile", true);
    }
    const route = routes[routeKey];
    const isLogin = routeKey === "login";

    applyLoginVisibility(routeKey);

    if (!new URLSearchParams(window.location.search).get("page")) {
        updatePageParam(routeKey, true);
    }

    document.title = route.title;
    if (navEl) {
        navEl.innerHTML = isLogin ? loginNavMarkup : defaultNavMarkup;
    }
    document.body.classList.toggle("is-login", isLogin);
    document.documentElement.classList.toggle("is-login", isLogin);

    const currentUserId = currentUser?.id || "anon";
    if (cachedUserId !== currentUserId) {
        routeCache.clear();
        cachedUserId = currentUserId;
    }

    const cacheKey = `${currentUserId}:${routeKey}`;
    if (routeCache.has(cacheKey)) {
        contentEl.replaceChildren(routeCache.get(cacheKey));
        setActiveNav(routeKey);
        updateUserHeader(routeKey);

        if (mainEl) {
            mainEl.classList.toggle("app-shell__main--wide", Boolean(route.wide));
            mainEl.classList.toggle("app-shell__main--login", isLogin);
        }
        if (typeof route.refresh === "function") {
            route.refresh();
        }
        return;
    }

    const routeContainer = document.createElement("div");
    routeContainer.dataset.route = routeKey;
    routeContainer.innerHTML = route.render();
    contentEl.replaceChildren(routeContainer);
    setActiveNav(routeKey);
    updateUserHeader(routeKey);

    if (mainEl) {
        mainEl.classList.toggle("app-shell__main--wide", Boolean(route.wide));
        mainEl.classList.toggle("app-shell__main--login", isLogin);
    }

    if (typeof route.onMount === "function") {
        await route.onMount();
    }
    if (typeof route.refresh === "function") {
        route.refresh();
    }

    routeCache.set(cacheKey, routeContainer);
};

stripIndexHtml();
applyLoginVisibility(normalizeRoute());
window.addEventListener("popstate", renderRoute);

if (navToggleEl) {
    navToggleEl.addEventListener("change", syncMobileNavAria);
    syncMobileNavAria();
}

if (logoutLink) {
    logoutLink.addEventListener("click", (event) => {
        if (!getCurrentUser()) return;
        event.preventDefault();
        clearCurrentUser();
        routeCache.clear();
        cachedUserId = null;
        updatePageParam("login");
    });
}

document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const link = target.closest("a[href]");
    if (!link) return;
    if (link.hasAttribute("download")) return;
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("?page=")) return;
    event.preventDefault();
    const params = new URLSearchParams(href.replace(/^\?/, ""));
    const nextRoute = params.get("page") || "profile";
    if (nextRoute === "login" && getCurrentUser()) {
        clearCurrentUser();
        routeCache.clear();
        cachedUserId = null;
    }
    updatePageParam(nextRoute);
    renderRoute();
    closeMobileNav();
});

document.addEventListener("click", (event) => {
    if (!navToggleEl?.checked) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (navMenuEl?.contains(target)) return;
    closeMobileNav();
});

renderRoute();
