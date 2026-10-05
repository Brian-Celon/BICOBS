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

// clear notifications from dropdown box
function clearNotifications() {
    const list = document.getElementById("notification_list");
    if (list) {
        list.innerHTML = "<li style='padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;'>No unread notifications</li>";
    }
    const dot = document.querySelector(".notification_badge_dot");
    if (dot) {
        dot.style.display = "none";
    }
    showToast("All notifications marked as read");
}

// open logout confirmation modal
function openLogoutModal() {
    // close dropdown menu if open
    document.querySelectorAll(".dropdown_menu").forEach(menu => {
        menu.classList.remove("dropdown_active");
    });
    openModal("logout_confirm_modal");
}

// execute admin sign out
function executeAdminLogout() {
    closeModal("logout_confirm_modal");
    try {
        localStorage.removeItem("taurus_admin_token");
        localStorage.removeItem("taurus_admin_user");
        localStorage.removeItem("taurus_admin_session");
        sessionStorage.removeItem("taurus_admin_session");
    } catch (e) {
        console.error(e);
    }
    showToast("Signed out successfully. Redirecting to login...", true);
    setTimeout(() => {
        window.location.href = "login.html?logged_out=true";
    }, 800);
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

