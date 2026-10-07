// taurOS admin panel interactive logic and event listeners

// Global Admin Authentication Helpers
function getAdminToken() {
    return localStorage.getItem("taurus_admin_token");
}

function getAdminUser() {
    try {
        const u = localStorage.getItem("taurus_admin_user");
        return u ? JSON.parse(u) : null;
    } catch (e) {
        return null;
    }
}

// Resolve backend API URL (supports port 5000 directly, port 5500, as well as Live Server or file:///)
function getApiUrl(endpoint) {
    if (!endpoint) return '';
    const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (window.location.port === '5500' || window.location.port === '5000') {
        return clean;
    }
    if (window.location.protocol === 'file:' || window.location.port) {
        return `http://localhost:5000${clean}`;
    }
    return clean;
}
window.getApiUrl = getApiUrl;

function checkAdminAuth() {
    const isLoginPage = window.location.pathname.endsWith("login.html") || window.location.pathname.includes("login.html");
    const token = getAdminToken();
    const user = getAdminUser();

    if (!isLoginPage) {
        if (!token || !user || (user.role !== 'admin' && user.role !== 'staff')) {
            window.location.href = "login.html";
            return false;
        }

        // Populate top navigation profile elements if present
        const nameEl = document.querySelector(".admin_user_name");
        const roleEl = document.querySelector(".admin_user_role");
        const avatarEl = document.querySelector(".admin_profile_avatar");

        if (nameEl) nameEl.textContent = user.full_name || user.name || "Administrator";
        if (roleEl) roleEl.textContent = (user.role || "admin").toUpperCase();
        if (avatarEl) {
            const initial = (user.full_name || user.name || "A").trim().charAt(0).toUpperCase();
            avatarEl.textContent = initial;
        }
    }
    return true;
}

// wait for DOM to fully load
document.addEventListener("DOMContentLoaded", function () {
    checkAdminAuth();
    initSidebarToggle();
    initModals();
    initGlobalSearch();
    initToast();
    initClickOutsideDropdowns();
    loadGlobalNotifications();
});

// initialize mobile sidebar navigation drawer
function initSidebarToggle() {
    const toggleBtn = document.getElementById("sidebar_toggle_btn");
    const sidebar = document.getElementById("admin_sidebar");
    const backdrop = document.getElementById("sidebar_backdrop");

    if (toggleBtn && sidebar && backdrop) {
        toggleBtn.addEventListener("click", function () {
            sidebar.classList.toggle("sidebar_open");
            backdrop.classList.toggle("sidebar_open");
        });

        backdrop.addEventListener("click", function () {
            sidebar.classList.remove("sidebar_open");
            backdrop.classList.remove("sidebar_open");
        });
    }
}

// initialize modal triggers, backdrop clicks, and escape key listener
function initModals() {
    // close buttons
    const closeButtons = document.querySelectorAll(".modal_close_btn, .btn_modal_cancel");
    closeButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            const modal = btn.closest(".modal_backdrop");
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // click outside modal to dismiss
    const modalBackdrops = document.querySelectorAll(".modal_backdrop");
    modalBackdrops.forEach(backdrop => {
        backdrop.addEventListener("click", function (e) {
            if (e.target === backdrop) {
                closeModal(backdrop.id);
            }
        });
    });

    // escape key to close active modal
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            const openModalEl = document.querySelector(".modal_backdrop.modal_active");
            if (openModalEl) {
                closeModal(openModalEl.id);
            }
        }
    });
}

// open modal by element id
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("modal_active");
        document.body.style.overflow = "hidden";
        const firstInput = modal.querySelector("input, select, textarea");
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// close modal by element id
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("modal_active");
        document.body.style.overflow = "";
    }
}

// toast notification display function
function showToast(message, isSuccess = true) {
    let toast = document.getElementById("toast_notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast_notification";
        toast.className = "toast_notification";
        document.body.appendChild(toast);
    }

    const icon = isSuccess ? '<i class="fas fa-check-circle toast_icon_success"></i>' : '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toast.classList.add("toast_visible");

    setTimeout(() => {
        toast.classList.remove("toast_visible");
    }, 3200);
}

// generic client-side table filter by search query
function filterTableBySearch(inputId, tableId) {
    const searchInput = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!searchInput || !table) return;

    searchInput.addEventListener("input", function () {
        const query = this.value.toLowerCase().trim();
        const rows = table.querySelectorAll("tbody tr");

        rows.forEach(row => {
            const rowText = row.textContent.toLowerCase();
            if (rowText.includes(query)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    });
}

// filter table rows by select dropdown value on specific column index
function filterTableBySelect(selectId, tableId, columnIndex) {
    const select = document.getElementById(selectId);
    const table = document.getElementById(tableId);
    if (!select || !table) return;

    select.addEventListener("change", function () {
        const selectedValue = this.value.toLowerCase().trim();
        const rows = table.querySelectorAll("tbody tr");

        rows.forEach(row => {
            if (selectedValue === "all" || selectedValue === "") {
                row.style.display = "";
                return;
            }
            const cell = row.querySelectorAll("td")[columnIndex];
            if (cell) {
                const cellText = cell.textContent.toLowerCase().trim();
                if (cellText.includes(selectedValue)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            }
        });
    });
}

// top navbar global search
function initGlobalSearch() {
    const topSearch = document.getElementById("top_search_input");
    if (topSearch) {
        topSearch.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && this.value.trim() !== "") {
                showToast(`Searching for "${this.value.trim()}" across the system...`);
            }
        });
    }
}

// toggle dropdown menu visibility
function toggleDropdown(menuId) {
    const targetMenu = document.getElementById(menuId);
    if (!targetMenu) return;

    // close other open dropdowns
    document.querySelectorAll(".dropdown_menu").forEach(menu => {
        if (menu.id !== menuId) {
            menu.classList.remove("dropdown_active");
        }
    });

    targetMenu.classList.toggle("dropdown_active");
}

// dismiss dropdowns on click outside
function initClickOutsideDropdowns() {
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".dropdown_menu_wrapper")) {
            document.querySelectorAll(".dropdown_menu").forEach(menu => {
                menu.classList.remove("dropdown_active");
            });
        }
    });
}

// load database notifications dynamically
async function loadGlobalNotifications() {
    const list = document.getElementById("notification_list") || document.getElementById("dash_notification_list");
    const dot = document.querySelector(".notification_badge_dot");
    if (!list) return;

    try {
        const res = await fetch(getApiUrl("/api/products"));
        const data = await res.json();
        const products = (data.status === "success" && data.data) ? data.data : [];

        const lowStock = products.filter(p => {
            const stock = Number(p.stock_quantity ?? p.stockQuantity ?? 0);
            return stock <= 5;
        });

        if (lowStock.length > 0) {
            list.innerHTML = lowStock.slice(0, 5).map(p => `
                <li class="notification_box_item" onclick="window.location.href='inventory.html'" style="cursor: pointer;">
                    <i class="fas fa-triangle-exclamation" style="color: #d97706; margin-top: 2px;"></i>
                    <div>
                        <strong>Low Stock Alert</strong>
                        <p style="color: #64748b; font-size: 11px;">${p.name || 'Product'} is down to ${p.stock_quantity ?? p.stockQuantity ?? 0} units</p>
                    </div>
                </li>
            `).join("");
            if (dot) dot.style.display = "inline-block";
        } else {
            list.innerHTML = "<li style='padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;'>No unread notifications</li>";
            if (dot) dot.style.display = "none";
        }
    } catch (e) {
        // Fallback silently
    }
}

// clear notifications from dropdown box
function clearNotifications() {
    const list = document.getElementById("notification_list") || document.getElementById("dash_notification_list");
    if (list) {
        list.innerHTML = "<li style='padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;'>No unread notifications</li>";
    }
    const dot = document.querySelector(".notification_badge_dot");
    if (dot) {
        dot.style.display = "none";
    }
    showToast("All notifications marked as read");
}
window.clearNotifications = clearNotifications;
window.clearDashboardNotifications = clearNotifications;

// open logout confirmation modal
function openLogoutModal() {
    // close dropdown menu if open
    document.querySelectorAll(".dropdown_menu").forEach(menu => {
        menu.classList.remove("dropdown_active");
    });
    openModal("logout_confirm_modal");
}

// clear all stored admin session data
function clearAdminSession() {
    try {
        localStorage.removeItem("taurus_admin_token");
        localStorage.removeItem("taurus_admin_user");
        localStorage.removeItem("taurus_admin_session");
        sessionStorage.removeItem("taurus_admin_session");
    } catch (e) {
        console.error(e);
    }
}

// execute admin sign out (user-initiated only)
function executeAdminLogout() {
    closeModal("logout_confirm_modal");
    clearAdminSession();
    showToast("Signed out successfully. Redirecting to login...", true);
    setTimeout(() => {
        window.location.href = "login.html?logged_out=true";
    }, 800);
}

// stale/invalid token (e.g. account removed or token expired) - not a user sign out
function handleAdminSessionExpired() {
    clearAdminSession();
    window.location.href = "login.html?session_expired=true";
}

// handle save settings action with feedback
function handleSaveSettings(event, sectionName = "Store settings") {
    if (event) event.preventDefault();
    showToast(`${sectionName} saved successfully!`);
}

// placeholder action triggers for quick actions
function handleQuickAction(actionName) {
    showToast(`${actionName} modal opened`);
}

// Global safe HTML escaping
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Standard Taurus Bike Store SKU Code Generator
 * Format: TBS-[DEPT]-[NAME_OR_CODE]-[NUMBER]
 * e.g., TBS-BIC-2021PINE-001, TBS-BIC-TRK-742, TBS-SPA-SHIM-814, TBS-ACC-SEER-084
 */
function generateAutoSKU(category, productName) {
    const cat = (category || '').toLowerCase().trim();
    let dept = 'GEN';

    if (['bicycles', 'built_bikes', 'mountain_bikes', 'road_bikes', 'gravel_bikes', 'bmx_urban', 'folding_commuter'].includes(cat)) {
        dept = 'BIC';
    } else if (['frame', 'frames', 'fork', 'handle_bar', 'stem', 'chain', 'upgrade_kit', 'gears', 'pedals', 'brakes', 'components', 'drivetrain'].includes(cat)) {
        dept = 'SPA';
    } else if (['tires', 'rims', 'rims_tires', 'hubs', 'wheelset'].includes(cat)) {
        dept = 'WHL';
    } else if (['saddle', 'handlebars_saddles', 'handle_grip', 'accessories', 'grips'].includes(cat)) {
        dept = 'ACC';
    } else if (['apparel', 'shoes', 'clothing', 'helmet'].includes(cat)) {
        dept = 'APP';
    }

    let nameCode = 'PRD';
    if (productName && typeof productName === 'string') {
        const cleaned = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleaned.length >= 3) {
            nameCode = cleaned.substring(0, Math.min(cleaned.length, 6));
        } else if (cleaned.length > 0) {
            nameCode = cleaned.padEnd(3, 'X');
        }
    }

    const randNum = Math.floor(100 + Math.random() * 900);
    return `TBS-${dept}-${nameCode}-${randNum}`;
}
window.generateAutoSKU = generateAutoSKU;

/**
 * Attach live auto-SKU generation listeners to form fields
 * Updates SKU as the admin selects category or types product title
 */
function attachAutoSKUGenerator(config) {
    const { nameInputId, catInputId, skuInputId, regenBtnId } = config;
    const nameInput = document.getElementById(nameInputId);
    const catInput = document.getElementById(catInputId);
    const skuInput = document.getElementById(skuInputId);
    const regenBtn = regenBtnId ? document.getElementById(regenBtnId) : null;

    if (!skuInput) return null;

    let isManuallyEdited = false;

    function updateSKU(force = false) {
        if (!force && isManuallyEdited && skuInput.value.trim() !== '') return;
        const nameVal = nameInput ? nameInput.value : '';
        const catVal = catInput ? catInput.value : '';
        skuInput.value = generateAutoSKU(catVal, nameVal);
    }

    if (nameInput) {
        nameInput.addEventListener('input', () => {
            if (!isManuallyEdited || skuInput.value.trim() === '') {
                updateSKU(false);
            }
        });
    }

    if (catInput) {
        catInput.addEventListener('change', () => {
            if (!isManuallyEdited || skuInput.value.trim() === '') {
                updateSKU(false);
            }
        });
    }

    skuInput.addEventListener('input', () => {
        isManuallyEdited = skuInput.value.trim().length > 0;
    });

    if (regenBtn) {
        regenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isManuallyEdited = false;
            updateSKU(true);
            skuInput.focus();
            skuInput.select();
            if (typeof showToast === 'function') {
                showToast(`Generated new SKU: ${skuInput.value}`, true);
            }
        });
    }

    skuInput._refreshAutoSKU = function(force = false) {
        if (force || !skuInput.value || skuInput.value.trim() === '') {
            isManuallyEdited = false;
            updateSKU(true);
        }
    };

    return skuInput._refreshAutoSKU;
}
window.attachAutoSKUGenerator = attachAutoSKUGenerator;

