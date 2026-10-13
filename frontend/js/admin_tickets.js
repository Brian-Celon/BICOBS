/**
 * TaurOS Admin Panel - Customer Support Tickets Controller
 * Connects admin interface to live tickets API (GET /api/tickets, GET /api/tickets/:id/messages, POST /api/tickets/:id/messages, PUT /api/tickets/:id/status).
 */

let allTickets = [];
let filteredTickets = [];
let currentTicketTab = "all";
let currentTicketSearch = "";
let currentCategoryFilter = "all";

let currentTicketPage = 1;
const TICKET_PAGE_SIZE = 10;
let activeModalTicketId = null;

function getValidToken() {
    return (typeof getAdminToken === 'function' ? getAdminToken() : null) ||
        localStorage.getItem("taurus_admin_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("bicobs_token");
}

document.addEventListener("DOMContentLoaded", () => {
    loadSupportTickets();
    setupTicketEventListeners();
});

// Load live tickets from backend
async function loadSupportTickets() {
    const tbody = document.getElementById("tickets_tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #b91c1c; margin-bottom: 8px; display: block;"></i>
                    Loading customer support tickets...
                </td>
            </tr>
        `;
    }

    const token = getValidToken();
    if (!token) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 48px; color: #b45309;">
                        <i class="fas fa-lock" style="font-size: 28px; margin-bottom: 10px; display: block;"></i>
                        <strong style="color: #0f172a; display: block; font-size: 15px; margin-bottom: 6px;">Sign-In Required</strong>
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">Please sign in to the administrator portal to review customer inquiries.</p>
                        <a href="login.html" class="btn_primary" style="display: inline-flex; padding: 8px 20px;">
                            <i class="fas fa-sign-in-alt"></i> <span>Sign In to Admin</span>
                        </a>
                    </td>
                </tr>
            `;
        }
        return;
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl("/api/tickets") : "/api/tickets";
        let res;
        try {
            res = await fetch(apiUrl, {
                headers: { "Authorization": `Bearer ${token}` }
            });
        } catch (fetchErr) {
            const fallbackUrl = typeof getBackendFallbackUrl === 'function' ? getBackendFallbackUrl("/api/tickets") : "http://localhost:5000/api/tickets";
            if (apiUrl !== fallbackUrl) {
                res = await fetch(fallbackUrl, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
            } else {
                throw fetchErr;
            }
        }

        if (res.status === 401 || res.status === 403) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 48px; color: #b45309;">
                            <i class="fas fa-user-lock" style="font-size: 28px; margin-bottom: 10px; display: block;"></i>
                            <strong style="color: #0f172a; display: block; font-size: 15px; margin-bottom: 6px;">Session Expired or Unauthorized</strong>
                            <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">Please log in with an administrator account to access tickets.</p>
                            <a href="login.html" class="btn_primary" style="display: inline-flex; padding: 8px 20px;">
                                <i class="fas fa-sign-in-alt"></i> <span>Re-Authenticate</span>
                            </a>
                        </td>
                    </tr>
                `;
            }
            return;
        }

        if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        allTickets = data.data || [];
        updateTicketMetrics();
        applyTicketFilters();
    } catch (err) {
        console.error("[Admin Tickets] Error fetching tickets:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 48px; color: #dc2626;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                        Failed to load support tickets: ${escapeHtml(err.message)}
                    </td>
                </tr>
            `;
        }
    }
}

// Update top KPI cards
function updateTicketMetrics() {
    const total = allTickets.length;
    const openCount = allTickets.filter(t => (t.status || "").toLowerCase() === "open").length;
    const inProgressCount = allTickets.filter(t => (t.status || "").toLowerCase() === "in progress").length;
    const resolvedCount = allTickets.filter(t => ["resolved", "closed"].includes((t.status || "").toLowerCase())).length;

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl("kpi_total_tickets", total);
    setEl("kpi_open_tickets", openCount);
    setEl("kpi_inprogress_tickets", inProgressCount);
    setEl("kpi_resolved_tickets", resolvedCount);

    // Update tab labels
    const tabAll = document.getElementById("tab_all_tickets");
    if (tabAll) tabAll.textContent = `All Inquiries (${total})`;

    const tabs = document.querySelectorAll("#ticket_tabs_bar .filter_tab_btn");
    tabs.forEach(btn => {
        const status = btn.getAttribute("data-status-filter");
        if (status === "Open") btn.textContent = `Open (${openCount})`;
        else if (status === "In Progress") btn.textContent = `In Progress (${inProgressCount})`;
        else if (status === "Resolved") btn.textContent = `Resolved (${allTickets.filter(t => (t.status || "").toLowerCase() === "resolved").length})`;
        else if (status === "Closed") btn.textContent = `Closed (${allTickets.filter(t => (t.status || "").toLowerCase() === "closed").length})`;
    });
}

// Setup listeners
function setupTicketEventListeners() {
    // Tabs
    const tabs = document.querySelectorAll("#ticket_tabs_bar .filter_tab_btn");
    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            tabs.forEach(b => b.classList.remove("tab_active"));
            btn.classList.add("tab_active");
            currentTicketTab = btn.getAttribute("data-status-filter") || "all";
            currentTicketPage = 1;
            applyTicketFilters();
        });
    });

    // Search input
    const searchInput = document.getElementById("ticket_search_input");
    if (searchInput) {
        let timeout;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                currentTicketSearch = (e.target.value || "").trim().toLowerCase();
                currentTicketPage = 1;
                applyTicketFilters();
            }, 250);
        });
    }

    // Top search bar sync
    const topSearch = document.getElementById("top_search_input");
    if (topSearch) {
        topSearch.addEventListener("input", (e) => {
            if (searchInput) searchInput.value = e.target.value;
            currentTicketSearch = (e.target.value || "").trim().toLowerCase();
            currentTicketPage = 1;
            applyTicketFilters();
        });
    }

    // Category filter
    const catSelect = document.getElementById("ticket_category_filter");
    if (catSelect) {
        catSelect.addEventListener("change", (e) => {
            currentCategoryFilter = e.target.value;
            currentTicketPage = 1;
            applyTicketFilters();
        });
    }
}

// Filter and paginate
function applyTicketFilters() {
    filteredTickets = allTickets.filter(t => {
        const status = (t.status || "").toLowerCase();
        const tab = currentTicketTab.toLowerCase();

        // Tab match
        if (tab !== "all") {
            if (status !== tab) return false;
        }

        // Category match
        if (currentCategoryFilter !== "all") {
            if ((t.category || "").toLowerCase().trim() !== currentCategoryFilter.toLowerCase().trim()) return false;
        }

        // Search match
        if (currentTicketSearch) {
            const num = (t.ticketNumber || "").toLowerCase();
            const cust = (t.customerName || "").toLowerCase();
            const email = (t.customerEmail || "").toLowerCase();
            const subj = (t.subject || "").toLowerCase();
            if (!num.includes(currentTicketSearch) &&
                !cust.includes(currentTicketSearch) &&
                !email.includes(currentTicketSearch) &&
                !subj.includes(currentTicketSearch)) {
                return false;
            }
        }

        return true;
    });

    renderTicketsTable();
}

// Render table rows
function renderTicketsTable() {
    const tbody = document.getElementById("tickets_tbody");
    if (!tbody) return;

    if (filteredTickets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 48px; color: #64748b;">
                    <div style="font-size: 32px; color: #94a3b8; margin-bottom: 8px;"><i class="fas fa-inbox"></i></div>
                    <strong style="color: #1e293b; display: block; margin-bottom: 4px;">No support tickets found</strong>
                    <span>No customer inquiries match the current filter or search criteria.</span>
                </td>
            </tr>
        `;
        updatePaginationBar(0);
        return;
    }

    const total = filteredTickets.length;
    const startIndex = (currentTicketPage - 1) * TICKET_PAGE_SIZE;
    const paged = filteredTickets.slice(startIndex, startIndex + TICKET_PAGE_SIZE);

    tbody.innerHTML = paged.map(t => {
        const sLower = (t.status || "open").toLowerCase();
        let statusBadge = "";
        if (sLower === "open") {
            statusBadge = `<span class="status_pill status_pending">Open</span>`;
        } else if (sLower === "in progress") {
            statusBadge = `<span class="status_pill status_in_progress">In Progress</span>`;
        } else if (sLower === "resolved") {
            statusBadge = `<span class="status_pill status_completed">Resolved</span>`;
        } else {
            statusBadge = `<span class="status_pill status_cancelled">Closed</span>`;
        }

        const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }) : "—";

        const msgCount = t.messageCount || 1;

        return `
            <tr>
                <td><span class="ticket_no_pill">${escapeHtml(t.ticketNumber)}</span></td>
                <td>
                    <strong style="color: #1e293b; display: block; font-size: 13px;">${escapeHtml(t.customerName || "Customer")}</strong>
                    <span style="font-size: 12px; color: #64748b;">${escapeHtml(t.customerEmail || "No email")}</span>
                </td>
                <td>
                    <span class="ticket_category_tag">
                        ${escapeHtml(t.category)}
                    </span>
                </td>
                <td style="max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: #0f172a;" title="${escapeHtml(t.subject)}">
                    ${escapeHtml(t.subject)}
                </td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: center;">
                    <span style="font-weight: 700; color: #475569; font-size: 12px;"><i class="fas fa-comment-dots" style="color: #94a3b8; font-size: 11px; margin-right: 3px;"></i> ${msgCount}</span>
                </td>
                <td style="font-size: 12px; color: #64748b; white-space: nowrap;">${dateStr}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button type="button" class="table_action_link" onclick="openTicketModal(${t.id})" style="font-weight: 600;">
                        <i class="fas fa-comments"></i> <span>View & Reply</span>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    updatePaginationBar(total);
}

// Standard TaurOS Pagination Bar
function updatePaginationBar(total) {
    const info = document.getElementById("tickets_pagination_info") || document.getElementById("ticket_pagination_info");
    const controls = document.getElementById("tickets_pagination_controls") || document.getElementById("ticket_pagination_controls");
    if (!info || !controls) return;

    if (total === 0) {
        info.textContent = "Showing 0 tickets";
        controls.innerHTML = "";
        return;
    }

    const totalPages = Math.ceil(total / TICKET_PAGE_SIZE) || 1;
    const start = (currentTicketPage - 1) * TICKET_PAGE_SIZE + 1;
    const end = Math.min(currentTicketPage * TICKET_PAGE_SIZE, total);
    info.textContent = `Showing ${start}–${end} of ${total} tickets`;

    let html = `
        <button type="button" class="pagination_btn" ${currentTicketPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : `onclick="changeTicketPage(${currentTicketPage - 1})"`}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
        html += `
            <button type="button" class="pagination_btn ${p === currentTicketPage ? 'page_active' : ''}" onclick="changeTicketPage(${p})">${p}</button>
        `;
    }

    html += `
        <button type="button" class="pagination_btn" ${currentTicketPage === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : `onclick="changeTicketPage(${currentTicketPage + 1})"`}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    controls.innerHTML = html;
}

function changeTicketPage(page) {
    currentTicketPage = page;
    renderTicketsTable();
}

function prevTicketPage() {
    if (currentTicketPage > 1) {
        currentTicketPage--;
        renderTicketsTable();
    }
}

function nextTicketPage() {
    const max = Math.ceil(filteredTickets.length / TICKET_PAGE_SIZE);
    if (currentTicketPage < max) {
        currentTicketPage++;
        renderTicketsTable();
    }
}

// Open modal and load full conversation
async function openTicketModal(ticketId) {
    activeModalTicketId = ticketId;
    if (typeof openModal === "function") {
        openModal("admin_ticket_modal");
    } else {
        const m = document.getElementById("admin_ticket_modal");
        if (m) m.classList.add("modal_active");
    }

    const titleEl = document.getElementById("modal_ticket_title");
    const subtitleEl = document.getElementById("modal_ticket_subtitle");
    const custName = document.getElementById("modal_cust_name");
    const custEmail = document.getElementById("modal_cust_email");
    const custCat = document.getElementById("modal_cust_category");
    const custCreated = document.getElementById("modal_cust_created");
    const statusSelect = document.getElementById("modal_status_select");
    const chatBox = document.getElementById("modal_chat_messages_box");

    if (chatBox) {
        chatBox.innerHTML = `
            <div style="text-align: center; padding: 32px; color: #64748b;">
                <i class="fas fa-spinner fa-spin" style="font-size: 20px; color: #b91c1c; margin-bottom: 8px; display: block;"></i>
                Loading ticket messages...
            </div>
        `;
    }

    const token = getValidToken();
    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/tickets/${ticketId}/messages`) : `/api/tickets/${ticketId}/messages`;
        let res;
        try {
            res = await fetch(apiUrl, {
                headers: { "Authorization": `Bearer ${token}` }
            });
        } catch (fetchErr) {
            const fallbackUrl = typeof getBackendFallbackUrl === 'function' ? getBackendFallbackUrl(`/api/tickets/${ticketId}/messages`) : `http://localhost:5000/api/tickets/${ticketId}/messages`;
            res = await fetch(fallbackUrl, {
                headers: { "Authorization": `Bearer ${token}` }
            });
        }

        const data = await res.json();
        const ticket = data.data?.ticket || {};
        const messages = data.data?.messages || [];

        if (titleEl) titleEl.textContent = `${ticket.ticketNumber || '#TCK'}: ${ticket.subject || 'Support Ticket'}`;
        if (subtitleEl) subtitleEl.textContent = `Category: ${ticket.category || 'General'} • Status: ${ticket.status || 'Open'}`;
        if (custName) custName.textContent = ticket.customerName || (allTickets.find(x => x.id === ticketId)?.customerName) || 'Customer';
        if (custEmail) custEmail.textContent = ticket.customerEmail || (allTickets.find(x => x.id === ticketId)?.customerEmail) || 'No email provided';
        if (custCat) custCat.textContent = ticket.category || 'General';
        if (custCreated) {
            custCreated.textContent = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("en-US", {
                month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
            }) : '—';
        }
        if (statusSelect && ticket.status) {
            statusSelect.value = ticket.status;
        }
        const counterEl = document.getElementById("modal_message_counter");
        if (counterEl) {
            counterEl.textContent = messages.length ? `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}` : '';
        }

        renderChatMessages(messages);
    } catch (err) {
        console.error("[Admin Tickets] Error loading conversation:", err);
        if (chatBox) {
            chatBox.innerHTML = `
                <div style="text-align: center; color: #dc2626; padding: 24px;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load conversation: ${escapeHtml(err.message)}
                </div>
            `;
        }
    }
}

// Render message bubbles in modal
function renderChatMessages(messages) {
    const chatBox = document.getElementById("modal_chat_messages_box");
    if (!chatBox) return;

    if (!messages || messages.length === 0) {
        chatBox.innerHTML = `
            <div class="ticket_chat_empty">
                <i class="fas fa-comment-slash ticket_chat_empty_icon"></i>
                <span style="font-weight: 600; font-size: 13px;">No messages recorded in this inquiry yet.</span>
            </div>
        `;
        return;
    }

    chatBox.innerHTML = messages.map(m => {
        const isSupport = m.senderType === "support" || m.senderType === "admin";
        const sender = isSupport ? "Taurus Support Rep (Staff)" : (m.senderName || "Customer");
        const timeStr = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "";

        const bubbleClass = isSupport ? "ticket_chat_bubble chat_bubble_support" : "ticket_chat_bubble chat_bubble_user";

        return `
            <div class="${bubbleClass}">
                <div class="chat_bubble_header">
                    <span><i class="fas fa-${isSupport ? 'user-shield' : 'user'}"></i> ${escapeHtml(sender)}</span>
                    <span style="opacity: 0.85;">${dateStr} ${timeStr}</span>
                </div>
                <div style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(m.message)}</div>
            </div>
        `;
    }).join("");

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Send reply as admin
async function sendAdminTicketReply(e) {
    if (e) e.preventDefault();
    if (!activeModalTicketId) return;

    const input = document.getElementById("modal_reply_input");
    const text = input ? input.value.trim() : "";
    if (!text) return;

    const submitBtn = document.getElementById("btn_send_reply");
    const originalText = submitBtn ? submitBtn.innerHTML : "Send Reply";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }

    const token = getValidToken();
    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/tickets/${activeModalTicketId}/messages`) : `/api/tickets/${activeModalTicketId}/messages`;
        let res;
        try {
            res = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ message: text })
            });
        } catch (fetchErr) {
            const fallbackUrl = typeof getBackendFallbackUrl === 'function' ? getBackendFallbackUrl(`/api/tickets/${activeModalTicketId}/messages`) : `http://localhost:5000/api/tickets/${activeModalTicketId}/messages`;
            res = await fetch(fallbackUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ message: text })
            });
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to send message");
        }

        if (input) input.value = "";
        if (typeof showToast === "function") showToast("Reply sent to customer!", true);

        // Reload conversation
        await openTicketModal(activeModalTicketId);

        // Reload table in background to update status / message count
        loadSupportTickets();
    } catch (err) {
        console.error("[Admin Tickets] Error sending reply:", err);
        alert(err.message || "Failed to send message");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// Update ticket status
async function updateTicketStatusFromModal() {
    if (!activeModalTicketId) return;
    const select = document.getElementById("modal_status_select");
    const newStatus = select ? select.value : "Open";

    const btn = document.getElementById("btn_update_status");
    if (btn) btn.disabled = true;

    const token = getValidToken();
    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/tickets/${activeModalTicketId}/status`) : `/api/tickets/${activeModalTicketId}/status`;
        let res;
        try {
            res = await fetch(apiUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (fetchErr) {
            const fallbackUrl = typeof getBackendFallbackUrl === 'function' ? getBackendFallbackUrl(`/api/tickets/${activeModalTicketId}/status`) : `http://localhost:5000/api/tickets/${activeModalTicketId}/status`;
            res = await fetch(fallbackUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to update status");
        }

        if (typeof showToast === "function") showToast(`Ticket status updated to ${newStatus}!`, true);
        const sub = document.getElementById("modal_ticket_subtitle");
        if (sub) sub.textContent = `Status updated to: ${newStatus}`;

        // Reload table
        loadSupportTickets();
    } catch (err) {
        console.error("[Admin Tickets] Error updating status:", err);
        alert(err.message || "Failed to update ticket status");
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Escape HTML helper
function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
