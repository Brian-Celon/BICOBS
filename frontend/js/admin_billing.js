/**
 * TaurOS Admin Panel - Billing & Transaction Records Controller
 * Loads real-time invoices from GET /api/billing, calculates financial KPIs,
 * provides live search, status filtering, receipt generation, and payment verification.
 */

let billingRecords = [];
let filteredBilling = [];
let currentBillingPage = 1;
const BILLING_PAGE_SIZE = 10;

let currentBillingSearch = "";
let currentBillingStatus = "all";

document.addEventListener("DOMContentLoaded", () => {
    loadBillingRecords();
    setupBillingListeners();
});

// Load live billing invoices from backend
async function loadBillingRecords() {
    const tbody = document.querySelector("#billing_table tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #b91c1c; margin-bottom: 8px; display: block;"></i>
                    Loading financial transaction records...
                </td>
            </tr>
        `;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                        Authentication required. Please sign in as admin.
                    </td>
                </tr>
            `;
        }
        return;
    }

    try {
        const res = await fetch("/api/billing", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await res.json();

        if (res.ok && data.status === "success") {
            billingRecords = data.data || [];
            updateBillingStats(data.totalRevenue);
            applyBillingFilters();
        } else {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                            Failed to load invoices: ${data.message || 'Unknown error'}
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Billing load error:", err);
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

// Compute & update KPI stat cards
function updateBillingStats(totalRev) {
    const totalCount = billingRecords.length;
    let paidCount = 0;
    let pendingCount = 0;
    let computedRevenue = 0;

    billingRecords.forEach(b => {
        const isPaid = (b.paymentStatus || "").toLowerCase() === "paid";
        const amt = parseFloat(b.totalAmount || 0);
        if (isPaid) {
            paidCount++;
            computedRevenue += amt;
        } else {
            pendingCount++;
        }
    });

    const finalRevenue = typeof totalRev === 'number' ? totalRev : computedRevenue;

    const elSales = document.getElementById("billing_stat_sales");
    const elUnits = document.getElementById("billing_stat_units");
    const elOrders = document.getElementById("billing_stat_orders");
    const elRepairs = document.getElementById("billing_stat_repairs");

    if (elSales) elSales.textContent = `₱${finalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (elUnits) elUnits.textContent = totalCount;
    if (elOrders) elOrders.textContent = paidCount;
    if (elRepairs) elRepairs.textContent = pendingCount;
}

// Setup search & filter listeners
function setupBillingListeners() {
    const searchInput = document.getElementById("billing_search_input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentBillingSearch = e.target.value.toLowerCase().trim();
            currentBillingPage = 1;
            applyBillingFilters();
        });
    }

    // Modal close handlers
    document.querySelectorAll("#receipt_modal .btn_modal_cancel, #receipt_modal .modal_close_btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (typeof closeModal === 'function') closeModal("receipt_modal");
        });
    });
}

// Filter and paginate invoices
function applyBillingFilters() {
    filteredBilling = billingRecords.filter(item => {
        // Search query
        if (currentBillingSearch) {
            const invoiceNo = (item.invoiceNumber || "").toLowerCase();
            const customer = (item.customerName || "").toLowerCase();
            const email = (item.customerEmail || "").toLowerCase();
            const phone = (item.customerPhone || "").toLowerCase();
            const method = (item.paymentMethod || "").toLowerCase();

            if (!invoiceNo.includes(currentBillingSearch) &&
                !customer.includes(currentBillingSearch) &&
                !email.includes(currentBillingSearch) &&
                !phone.includes(currentBillingSearch) &&
                !method.includes(currentBillingSearch)) {
                return false;
            }
        }

        // Status filter
        if (currentBillingStatus && currentBillingStatus !== "all") {
            const status = (item.paymentStatus || "").toLowerCase();
            if (status !== currentBillingStatus.toLowerCase()) return false;
        }

        return true;
    });

    renderBillingTable();
    renderBillingPagination();
}

// Render Table Rows
function renderBillingTable() {
    const tbody = document.querySelector("#billing_table tbody");
    if (!tbody) return;

    if (filteredBilling.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-file-invoice" style="font-size: 32px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    No billing records found.
                </td>
            </tr>
        `;
        return;
    }

    const startIdx = (currentBillingPage - 1) * BILLING_PAGE_SIZE;
    const endIdx = startIdx + BILLING_PAGE_SIZE;
    const pageItems = filteredBilling.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems.map(item => {
        const id = item.id || item._id;
        const invoiceNo = item.invoiceNumber || `INV-${id}`;
        const customer = escapeHtml(item.customerName || "Customer");
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }) : "N/A";

        const paymentMethod = (item.paymentMethod || "cash").toUpperCase();
        let methodIcon = '<i class="fas fa-money-bill-wave" style="color: #16a34a; margin-right: 6px;"></i>';
        if (paymentMethod.includes("GCASH")) {
            methodIcon = '<i class="fas fa-mobile-alt" style="color: #0284c7; margin-right: 6px;"></i>';
        } else if (paymentMethod.includes("CARD") || paymentMethod.includes("BPI")) {
            methodIcon = '<i class="fas fa-credit-card" style="color: #b91c1c; margin-right: 6px;"></i>';
        }

        const status = (item.paymentStatus || "pending").toLowerCase();
        let statusBadge = '<span class="status_pill status_pending">Pending</span>';
        if (status === "paid") {
            statusBadge = '<span class="status_pill status_completed">Paid</span>';
        } else if (status === "refunded" || status === "failed") {
            statusBadge = '<span class="status_pill status_cancelled">Refunded</span>';
        }

        const amount = parseFloat(item.totalAmount || 0);

        return `
            <tr id="billing_row_${id}">
                <td style="font-size: 13px; color: #64748b;">${dateStr}</td>
                <td class="cell_order_id" style="font-weight: 700; color: #0f172a;">${invoiceNo}</td>
                <td class="cell_customer_name">
                    <div style="font-weight: 600; color: #0f172a;">${customer}</div>
                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(item.customerEmail || '')}</div>
                </td>
                <td>${methodIcon} ${paymentMethod}</td>
                <td>${statusBadge}</td>
                <td class="cell_amount" style="font-weight: 700;">₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="table_action_link" onclick="openInvoiceReceiptModal('${invoiceNo}')">
                            <i class="fas fa-receipt" style="margin-right: 4px;"></i> View
                        </button>
                        ${status === 'pending' ? `
                            <button type="button" class="btn_icon_action" onclick="verifyInvoicePayment('${id}', '${invoiceNo}')" title="Mark as Paid" style="color: #16a34a; border: 1px solid #bbf7d0; background: #f0fdf4; padding: 3px 8px; font-size: 11px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-check"></i> <span>Paid</span>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Render pagination
function renderBillingPagination() {
    const total = filteredBilling.length;
    const totalPages = Math.ceil(total / BILLING_PAGE_SIZE) || 1;

    const startIdx = total === 0 ? 0 : (currentBillingPage - 1) * BILLING_PAGE_SIZE + 1;
    const endIdx = Math.min(currentBillingPage * BILLING_PAGE_SIZE, total);

    const infoEl = document.getElementById("billing_pagination_info");
    if (infoEl) {
        infoEl.textContent = `Showing ${startIdx}-${endIdx} of ${total} transactions`;
    }

    const controls = document.getElementById("billing_pagination_controls");
    if (!controls) return;

    let html = `
        <button type="button" class="pagination_btn" aria-label="Previous page" onclick="changeBillingPage(${currentBillingPage - 1})" ${currentBillingPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= currentBillingPage - 1 && p <= currentBillingPage + 1)) {
            html += `
                <button type="button" class="pagination_btn ${p === currentBillingPage ? 'page_active' : ''}" data-page="${p}" onclick="changeBillingPage(${p})">
                    ${p}
                </button>
            `;
        } else if (p === currentBillingPage - 2 || p === currentBillingPage + 2) {
            html += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
        }
    }

    html += `
        <button type="button" class="pagination_btn" aria-label="Next page" onclick="changeBillingPage(${currentBillingPage + 1})" ${currentBillingPage >= totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    controls.innerHTML = html;
}

function changeBillingPage(page) {
    const totalPages = Math.ceil(filteredBilling.length / BILLING_PAGE_SIZE) || 1;
    if (page < 1 || page > totalPages) return;
    currentBillingPage = page;
    renderBillingTable();
    renderBillingPagination();
}

// Mark Invoice as Paid
async function verifyInvoicePayment(billingId, invoiceNo) {
    const confirmed = confirm(`Confirm payment received for invoice ${invoiceNo}?`);
    if (!confirmed) return;

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const res = await fetch(`/api/billing/${billingId}/payment`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                paymentStatus: "paid"
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof showToast === 'function') {
                showToast(`Invoice ${invoiceNo} marked as Paid!`, true);
            }
            await loadBillingRecords();
        } else {
            alert(data.message || "Failed to update payment status");
        }
    } catch (err) {
        console.error("Payment verify error:", err);
        alert("Server error when updating payment status.");
    }
}

// Open Receipt Modal with full invoice details
function openInvoiceReceiptModal(invoiceNumber) {
    const bill = billingRecords.find(b => b.invoiceNumber === invoiceNumber);
    if (!bill) return;

    const dateStr = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }) : "N/A";

    const txnNoEl = document.getElementById("receipt_txn_no");
    if (txnNoEl) txnNoEl.textContent = bill.invoiceNumber;

    const dateEl = document.getElementById("receipt_date");
    if (dateEl) dateEl.textContent = dateStr;

    const custEl = document.getElementById("receipt_customer");
    if (custEl) custEl.textContent = `${bill.customerName} (${bill.customerPhone || bill.customerEmail || ''})`;

    const payEl = document.getElementById("receipt_payment");
    if (payEl) payEl.textContent = `${(bill.paymentMethod || 'cash').toUpperCase()} [${(bill.paymentStatus || 'pending').toUpperCase()}]`;

    const subtotal = parseFloat(bill.subtotal || 0);
    const shipping = parseFloat(bill.shippingFee || bill.deliveryFee || 0);
    const total = parseFloat(bill.totalAmount || 0);

    const itemsEl = document.getElementById("receipt_items");
    if (itemsEl) {
        itemsEl.innerHTML = `
            <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Order Reference:</span>
                    <strong>Order #${bill.orderId || bill.order}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
                    <span>Subtotal:</span>
                    <span>₱${subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
                    <span>Delivery / Shipping Fee:</span>
                    <span>₱${shipping.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        `;
    }

    const amtEl = document.getElementById("receipt_amount");
    if (amtEl) amtEl.textContent = `₱${total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (typeof openModal === 'function') {
        openModal("receipt_modal");
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
