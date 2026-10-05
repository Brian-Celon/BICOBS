/**
 * TaurOS Admin Panel - Bicycle Repairs & Service Controller
 * Connects repairs queue to real PostgreSQL backend (GET /api/repairs, POST /api/repairs, PUT /api/repairs/:id).
 * Handles search, status tabs, mechanic assignment, ticket creation, and status progression.
 */

let repairTickets = [];
let filteredRepairs = [];
let currentRepairTab = "all";
let currentRepairSearch = "";
let currentStatusFilter = "all";
let currentMechanicFilter = "all";

let currentRepairPage = 1;
const REPAIR_PAGE_SIZE = 10;

document.addEventListener("DOMContentLoaded", () => {
    loadRepairs();
    setupRepairEventListeners();
});

// Load live repair tickets from backend
async function loadRepairs() {
    const tbody = document.getElementById("repairs_tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #b91c1c; margin-bottom: 8px; display: block;"></i>
                    Loading bike service and repair queue...
                </td>
            </tr>
        `;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const res = await fetch("/api/repairs", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            repairTickets = data.data || [];
            updateRepairTabCounters();
            applyRepairFilters();
        } else {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                            Failed to load repairs: ${data.message || 'Unknown error'}
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Repairs load error:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                        Unable to connect to backend server.
                    </td>
                </tr>
            `;
        }
    }
}

// Update counters on top filter tabs
function updateRepairTabCounters() {
    const total = repairTickets.length;
    const inProgress = repairTickets.filter(r => (r.status || "").toLowerCase() === "in-progress").length;
    const waiting = repairTickets.filter(r => (r.status || "").toLowerCase() === "waiting").length;
    const completed = repairTickets.filter(r => (r.status || "").toLowerCase() === "completed").length;

    const tabAll = document.getElementById("tab_all_repairs");
    if (tabAll) tabAll.textContent = `All Repairs (${total})`;

    const btnProgress = document.querySelector('.filter_tab_btn[data-status-filter="in-progress"]');
    if (btnProgress) btnProgress.textContent = `In Progress (${inProgress})`;

    const btnWaiting = document.querySelector('.filter_tab_btn[data-status-filter="waiting"]');
    if (btnWaiting) btnWaiting.textContent = `Waiting (${waiting})`;

    const btnCompleted = document.querySelector('.filter_tab_btn[data-status-filter="completed"]');
    if (btnCompleted) btnCompleted.textContent = `Completed (${completed})`;
}

// Event listeners setup
function setupRepairEventListeners() {
    // Search input
    const searchInput = document.getElementById("repair_search_input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentRepairSearch = e.target.value.toLowerCase().trim();
            currentRepairPage = 1;
            applyRepairFilters();
        });
    }

    // Status select
    const statusSelect = document.getElementById("repair_status_select");
    if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
            currentStatusFilter = e.target.value;
            currentRepairPage = 1;
            applyRepairFilters();
        });
    }

    // Mechanic select
    const mechSelect = document.getElementById("repair_mechanic_select");
    if (mechSelect) {
        mechSelect.addEventListener("change", (e) => {
            currentMechanicFilter = e.target.value;
            currentRepairPage = 1;
            applyRepairFilters();
        });
    }

    // Tabs bar
    document.querySelectorAll("#repair_tabs_bar .filter_tab_btn").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll("#repair_tabs_bar .filter_tab_btn").forEach(b => b.classList.remove("tab_active"));
            this.classList.add("tab_active");
            currentRepairTab = this.getAttribute("data-status-filter") || "all";
            currentRepairPage = 1;
            applyRepairFilters();
        });
    });

    // Modal cancel buttons
    document.querySelectorAll(".btn_modal_cancel, .modal_close_btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (typeof closeModal === 'function') {
                closeModal("new_repair_modal");
                closeModal("repair_detail_modal");
            }
        });
    });
}

// Apply multi-factor filtering
function applyRepairFilters() {
    filteredRepairs = repairTickets.filter(item => {
        const status = (item.status || "").toLowerCase();
        const mechanic = (item.mechanicName || "").toLowerCase();
        const customer = (item.customerName || "").toLowerCase();
        const ticket = (item.ticketNumber || "").toLowerCase();
        const bike = (item.bikeModel || "").toLowerCase();

        // 1. Tab filter
        if (currentRepairTab !== "all" && status !== currentRepairTab) {
            return false;
        }

        // 2. Select status filter
        if (currentStatusFilter !== "all" && status !== currentStatusFilter.toLowerCase()) {
            return false;
        }

        // 3. Mechanic filter
        if (currentMechanicFilter !== "all" && !mechanic.includes(currentMechanicFilter.toLowerCase())) {
            return false;
        }

        // 4. Search query
        if (currentRepairSearch) {
            if (!customer.includes(currentRepairSearch) &&
                !ticket.includes(currentRepairSearch) &&
                !bike.includes(currentRepairSearch) &&
                !mechanic.includes(currentRepairSearch)) {
                return false;
            }
        }

        return true;
    });

    renderRepairsTable();
    renderRepairsPagination();
}

// Render Table Rows
function renderRepairsTable() {
    const tbody = document.getElementById("repairs_tbody");
    if (!tbody) return;

    if (filteredRepairs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-wrench" style="font-size: 32px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    No repair tickets match the selected filters.
                </td>
            </tr>
        `;
        return;
    }

    const startIdx = (currentRepairPage - 1) * REPAIR_PAGE_SIZE;
    const endIdx = startIdx + REPAIR_PAGE_SIZE;
    const pageItems = filteredRepairs.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems.map(item => {
        const id = item.id;
        const ticketNo = escapeHtml(item.ticketNumber || `#R00${id}`);
        const customer = escapeHtml(item.customerName || "Customer");
        const bike = escapeHtml(item.bikeModel || "Bicycle");
        const mechanic = escapeHtml(item.mechanicName || "Reynaldo");
        const finish = escapeHtml(item.estimatedFinish || "Today");
        const status = (item.status || "in-progress").toLowerCase();

        let statusBadge = '<span class="status_pill status_in_progress">In-Progress</span>';
        if (status === "completed") {
            statusBadge = '<span class="status_pill status_completed">Completed</span>';
        } else if (status === "waiting") {
            statusBadge = '<span class="status_pill status_waiting">Waiting</span>';
        }

        return `
            <tr id="repair_row_${id}">
                <td class="cell_order_id" style="font-weight: 700; color: #0f172a;">${ticketNo}</td>
                <td class="cell_customer_name rep_customer_val" style="font-weight: 600;">${customer}</td>
                <td class="rep_bike_val">${bike}</td>
                <td class="rep_mech_val">
                    <span style="display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-user-gear" style="color: #64748b; font-size: 11px;"></i>
                        ${mechanic}
                    </span>
                </td>
                <td class="rep_status_cell">${statusBadge}</td>
                <td class="rep_finish_val" style="font-size: 13px; color: #64748b;">${finish}</td>
                <td>
                    <button type="button" class="table_action_link" onclick="openRepairDetailModal('${id}')">
                        <i class="fas fa-sliders" style="margin-right: 4px;"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Render pagination
function renderRepairsPagination() {
    const total = filteredRepairs.length;
    const totalPages = Math.ceil(total / REPAIR_PAGE_SIZE) || 1;

    const startIdx = total === 0 ? 0 : (currentRepairPage - 1) * REPAIR_PAGE_SIZE + 1;
    const endIdx = Math.min(currentRepairPage * REPAIR_PAGE_SIZE, total);

    const infoEl = document.getElementById("repairs_pagination_info");
    if (infoEl) {
        infoEl.textContent = `Showing ${startIdx}-${endIdx} of ${total} repairs`;
    }

    const controls = document.getElementById("repairs_pagination_controls");
    if (!controls) return;

    let html = `
        <button type="button" class="pagination_btn" aria-label="Previous page" onclick="changeRepairPage(${currentRepairPage - 1})" ${currentRepairPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= currentRepairPage - 1 && p <= currentRepairPage + 1)) {
            html += `
                <button type="button" class="pagination_btn ${p === currentRepairPage ? 'page_active' : ''}" data-page="${p}" onclick="changeRepairPage(${p})">
                    ${p}
                </button>
            `;
        } else if (p === currentRepairPage - 2 || p === currentRepairPage + 2) {
            html += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
        }
    }

    html += `
        <button type="button" class="pagination_btn" aria-label="Next page" onclick="changeRepairPage(${currentRepairPage + 1})" ${currentRepairPage >= totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    controls.innerHTML = html;
}

function changeRepairPage(page) {
    const totalPages = Math.ceil(filteredRepairs.length / REPAIR_PAGE_SIZE) || 1;
    if (page < 1 || page > totalPages) return;
    currentRepairPage = page;
    renderRepairsTable();
    renderRepairsPagination();
}

// Open Repair Detail Modal
function openRepairDetailModal(repairId) {
    const item = repairTickets.find(r => String(r.id) === String(repairId));
    if (!item) return;

    const rowIdInput = document.getElementById("modal_repair_row_id");
    if (rowIdInput) rowIdInput.value = item.id;

    const titleEl = document.getElementById("repair_modal_title");
    if (titleEl) titleEl.textContent = "Repair Ticket: " + (item.ticketNumber || `#R00${item.id}`);

    const custEl = document.getElementById("modal_repair_customer");
    if (custEl) custEl.textContent = item.customerName || "Customer";

    const bikeEl = document.getElementById("modal_repair_bike");
    if (bikeEl) bikeEl.textContent = item.bikeModel || "Bicycle";

    const mechEl = document.getElementById("modal_repair_mech");
    if (mechEl) mechEl.textContent = item.mechanicName || "Reynaldo";

    const finishEl = document.getElementById("modal_repair_finish");
    if (finishEl) finishEl.textContent = item.estimatedFinish || "Today";

    const notesEl = document.getElementById("modal_repair_notes");
    if (notesEl) notesEl.textContent = item.problemDescription || "General service and maintenance.";

    const statusSelect = document.getElementById("modal_update_repair_status");
    if (statusSelect) {
        const s = (item.status || "in-progress").toLowerCase();
        if (s === "completed") statusSelect.value = "Completed";
        else if (s === "waiting") statusSelect.value = "Waiting";
        else statusSelect.value = "In-Progress";
    }

    if (typeof openModal === 'function') {
        openModal("repair_detail_modal");
    }
}

// Save Updated Repair Ticket
async function saveRepairStatus() {
    const id = document.getElementById("modal_repair_row_id")?.value;
    const rawStatus = document.getElementById("modal_update_repair_status")?.value;
    if (!id || !rawStatus) return;

    let newStatus = "in-progress";
    if (rawStatus === "Completed") newStatus = "completed";
    else if (rawStatus === "Waiting") newStatus = "waiting";

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    const saveBtn = document.querySelector("#repair_detail_modal .btn_primary");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const res = await fetch(`/api/repairs/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            const item = repairTickets.find(r => String(r.id) === String(id));
            if (item) item.status = newStatus;

            updateRepairTabCounters();
            applyRepairFilters();
            if (typeof closeModal === 'function') closeModal("repair_detail_modal");
            if (typeof showToast === 'function') showToast("Repair ticket status updated!", true);
        } else {
            alert(data.message || "Failed to update repair status");
        }
    } catch (err) {
        console.error("Update repair error:", err);
        alert("Server error when updating repair status.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Update Ticket';
        }
    }
}

// Create New Repair Ticket
async function handleCreateRepair(event) {
    event.preventDefault();

    const customer = (document.getElementById("new_repair_customer")?.value || "").trim();
    const bike = (document.getElementById("new_repair_bike")?.value || "").trim();
    const mechanic = document.getElementById("new_repair_mechanic")?.value || "Reynaldo";
    const notes = (document.getElementById("new_repair_notes")?.value || "").trim();
    const finish = (document.getElementById("new_repair_est")?.value || "").trim();

    if (!customer || !bike) {
        alert("Customer name and bike model are required.");
        return;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    const submitBtn = event.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Ticket...';
    }

    try {
        const res = await fetch("/api/repairs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                customerName: customer,
                bikeModel: bike,
                mechanicName: mechanic,
                problemDescription: notes,
                estimatedFinish: finish || "Today",
                serviceType: "Bike Service"
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof closeModal === 'function') closeModal("new_repair_modal");
            if (typeof showToast === 'function') showToast(`Ticket ${data.data?.ticketNumber || ''} created for ${customer}!`, true);
            event.target.reset();
            await loadRepairs();
        } else {
            alert(data.message || "Failed to create repair ticket");
        }
    } catch (err) {
        console.error("Create repair error:", err);
        alert("Server error when creating repair ticket.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Ticket';
        }
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
