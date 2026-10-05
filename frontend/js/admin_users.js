/**
 * TaurOS Admin Panel - Users & Roles Controller
 * Loads real-time system users from GET /api/users, handles search,
 * role assignment (admin, staff, customer), user creation, and account removal.
 */

let systemUsers = [];
let filteredUsers = [];
let currentSearch = "";

document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
    setupUserSearch();
});

// Load live users from backend
async function loadUsers() {
    const tbody = document.getElementById("users_tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #b91c1c; margin-bottom: 8px; display: block;"></i>
                    Loading registered system accounts...
                </td>
            </tr>
        `;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const res = await fetch("/api/users", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            systemUsers = data.data || [];
            updateUserStats();
            applyUserFilters();
        } else {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 36px; color: #ef4444;">
                            Failed to load users: ${data.message || 'Unknown error'}
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Users load error:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 36px; color: #ef4444;">
                        Unable to connect to backend server.
                    </td>
                </tr>
            `;
        }
    }
}

// Compute & update User KPI Cards
function updateUserStats() {
    const total = systemUsers.length;
    let adminCount = 0;
    let staffCount = 0;
    let customerCount = 0;

    systemUsers.forEach(u => {
        const role = (u.role || "").toLowerCase();
        if (role === "admin") adminCount++;
        else if (role === "staff") staffCount++;
        else customerCount++;
    });

    // Support metric elements if present
    const elTotal = document.getElementById("stat_total_users");
    const elStaff = document.getElementById("stat_staff_count");
    const elCust = document.getElementById("stat_cust_count");
    if (elTotal) elTotal.textContent = total;
    if (elStaff) elStaff.textContent = staffCount;
    if (elCust) elCust.textContent = customerCount;
}

// Search listener
function setupUserSearch() {
    const searchInput = document.getElementById("user_search_input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            applyUserFilters();
        });
    }

    // Modal cancel buttons
    document.querySelectorAll("#add_user_modal .btn_modal_cancel, #add_user_modal .modal_close_btn, #edit_user_modal .btn_modal_cancel, #edit_user_modal .modal_close_btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (typeof closeModal === 'function') {
                closeModal("add_user_modal");
                closeModal("edit_user_modal");
            }
        });
    });
}

// Filter users list
function applyUserFilters() {
    filteredUsers = systemUsers.filter(u => {
        if (!currentSearch) return true;
        const name = (u.name || u.fullName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const role = (u.role || "").toLowerCase();
        return name.includes(currentSearch) || email.includes(currentSearch) || role.includes(currentSearch);
    });

    renderUsersTable();
}

// Render Table Rows
function renderUsersTable() {
    const tbody = document.getElementById("users_tbody");
    if (!tbody) return;

    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-users-slash" style="font-size: 32px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    No users match your search criteria.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredUsers.map(user => {
        const id = user.id;
        const name = escapeHtml(user.name || user.fullName || "User");
        const email = escapeHtml(user.email || "");
        const role = (user.role || "customer").toLowerCase();

        let roleBadge = '<span class="status_pill" style="background: #f1f5f9; color: #475569;">Customer</span>';
        if (role === "admin") {
            roleBadge = '<span class="status_pill" style="background: #fee2e2; color: #b91c1c; font-weight: 700;">Administrator</span>';
        } else if (role === "staff") {
            roleBadge = '<span class="status_pill" style="background: #e0f2fe; color: #0369a1; font-weight: 600;">Staff</span>';
        }

        const isVerified = user.isVerified;
        const verifiedBadge = isVerified
            ? '<span class="status_pill status_completed"><i class="fas fa-check-circle"></i> Verified</span>'
            : '<span class="status_pill status_pending"><i class="fas fa-clock"></i> Unverified</span>';

        const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }) : "N/A";

        return `
            <tr id="user_row_${id}">
                <td class="cell_customer_name user_name_val" style="font-weight: 600; color: #0f172a;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${role === 'admin' ? '#fee2e2' : '#e2e8f0'}; color: ${role === 'admin' ? '#b91c1c' : '#334155'}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <span>${name}</span>
                    </div>
                </td>
                <td class="user_email_val" style="font-size: 13px; color: #64748b;">${email}</td>
                <td class="user_role_val">${roleBadge}</td>
                <td class="user_status_val">${verifiedBadge}</td>
                <td style="font-size: 13px; color: #64748b;">${dateStr}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="table_action_link" onclick="openEditUserModal('${id}')" title="Edit User">
                            <i class="fas fa-pen-to-square"></i> Edit
                        </button>
                        ${role !== 'admin' ? `
                            <button type="button" class="btn_icon_action delete" onclick="deleteUserAccount('${id}', '${name}')" title="Delete User" style="color: #ef4444; border: 1px solid #fee2e2; background: #fff5f5; padding: 3px 6px; border-radius: 4px;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Add User (Staff / Admin)
async function handleCreateUser(e) {
    e.preventDefault();

    const name = (document.getElementById("new_user_name")?.value || "").trim();
    const email = (document.getElementById("new_user_email")?.value || "").trim();
    const role = (document.getElementById("new_user_role")?.value || "staff").toLowerCase();
    const password = document.getElementById("new_user_password")?.value;

    if (!name || !email || !password) {
        alert("Please fill in all required fields.");
        return;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const res = await fetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                email,
                role,
                password
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof closeModal === 'function') closeModal("add_user_modal");
            if (typeof showToast === 'function') showToast(`Account created for ${name}!`, true);
            e.target.reset();
            await loadUsers();
        } else {
            alert(data.message || "Failed to create user account");
        }
    } catch (err) {
        console.error("Create user error:", err);
        alert("Server error when creating user.");
    }
}

// Open Edit User Modal
function openEditUserModal(userId) {
    const user = systemUsers.find(u => String(u.id) === String(userId));
    if (!user) return;

    const rowIdInput = document.getElementById("edit_user_row_id");
    const nameInput = document.getElementById("edit_user_name");
    const emailInput = document.getElementById("edit_user_email");
    const roleSelect = document.getElementById("edit_user_role");

    if (rowIdInput) rowIdInput.value = user.id;
    if (nameInput) nameInput.value = user.name || user.fullName || "";
    if (emailInput) emailInput.value = user.email || "";
    if (roleSelect) {
        const curRole = (user.role || "").toLowerCase();
        roleSelect.value = curRole === "admin" ? "admin" : (curRole === "staff" ? "staff" : "customer");
    }

    if (typeof openModal === 'function') openModal("edit_user_modal");
}

// Save Edited User
async function handleSaveEditedUser(e) {
    e.preventDefault();

    const id = document.getElementById("edit_user_row_id")?.value;
    const name = (document.getElementById("edit_user_name")?.value || "").trim();
    const email = (document.getElementById("edit_user_email")?.value || "").trim();
    const role = (document.getElementById("edit_user_role")?.value || "customer").toLowerCase();

    if (!id || !name || !email) {
        alert("Name and email are required.");
        return;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const res = await fetch(`/api/users/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                email,
                role
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof closeModal === 'function') closeModal("edit_user_modal");
            if (typeof showToast === 'function') showToast(`User "${name}" updated!`, true);
            await loadUsers();
        } else {
            alert(data.message || "Failed to update user");
        }
    } catch (err) {
        console.error("Update user error:", err);
        alert("Server error when updating user.");
    }
}

// Delete User Account
async function deleteUserAccount(userId, userName) {
    const confirmDelete = confirm(`Are you sure you want to permanently delete user account "${userName}"?`);
    if (!confirmDelete) return;

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof showToast === 'function') showToast(`User account deleted.`, true);
            await loadUsers();
        } else {
            alert(data.message || "Failed to delete user account");
        }
    } catch (err) {
        console.error("Delete user error:", err);
        alert("Server error when deleting user.");
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
