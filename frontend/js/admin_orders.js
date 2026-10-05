/**
 * TaurOS Admin Panel - Orders Management Controller
 * Handles dynamic order fetching from GET /api/orders, status updates via PUT /api/orders/:id/status,
 * interactive search, tab filtering, and modal order inspection.
 */

let allOrders = [];
let activeTabFilter = 'all';
let currentSearchQuery = '';
let currentStatusFilter = 'all';
let currentOrderPage = 1;
const ITEMS_PER_PAGE = 8;
let selectedOrder = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial orders fetch
    loadAdminOrders();

    // 2. Tab filter listener
    const tabButtons = document.querySelectorAll("#order_tabs_bar .filter_tab_btn");
    tabButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            tabButtons.forEach(b => b.classList.remove("tab_active"));
            this.classList.add("tab_active");
            activeTabFilter = this.getAttribute("data-filter");
            currentOrderPage = 1;
            renderOrdersTable();
        });
    });

    // 3. Search input listener
    const searchInput = document.getElementById("order_search_input");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            currentSearchQuery = this.value.toLowerCase().trim();
            currentOrderPage = 1;
            renderOrdersTable();
        });
    }

    // 4. Status dropdown listener
    const statusFilter = document.getElementById("order_status_filter");
    if (statusFilter) {
        statusFilter.addEventListener("change", function () {
            currentStatusFilter = this.value.toLowerCase().trim();
            currentOrderPage = 1;
            renderOrdersTable();
        });
    }
});

// Fetch orders from backend API
async function loadAdminOrders() {
    const tbody = document.getElementById("orders_tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 36px; color: #64748b;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #b91c1c; margin-bottom: 12px; display: block;"></i>
                    Loading live orders from database...
                </td>
            </tr>
        `;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("/api/orders", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            if (typeof showToast === 'function') showToast("Session expired. Please sign in again.", false);
            if (typeof executeAdminLogout === 'function') executeAdminLogout();
            else window.location.href = "login.html";
            return;
        }

        const data = await res.json();
        if (res.ok && data.status === "success") {
            allOrders = data.data || [];
            updateTabBadges();
            renderOrdersTable();
        } else {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                            Failed to load orders: ${data.message || 'Unknown error'}
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Orders fetch error:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                        <i class="fas fa-plug-circle-xmark" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                        Server connection error. Please ensure backend is running.
                    </td>
                </tr>
            `;
        }
    }
}

// Update counter numbers in tab buttons
function updateTabBadges() {
    const allCount = allOrders.length;
    const onlineCount = allOrders.filter(o => (o.deliveryType || o.delivery_type) === 'delivery').length;
    const pickupCount = allOrders.filter(o => (o.deliveryType || o.delivery_type) === 'pickup').length;
    const pendingCount = allOrders.filter(o => (o.orderStatus || o.order_status) === 'pending' || (o.paymentStatus || o.payment_status) === 'pending').length;

    const tabs = document.querySelectorAll("#order_tabs_bar .filter_tab_btn");
    tabs.forEach(tab => {
        const filter = tab.getAttribute("data-filter");
        if (filter === "all") tab.textContent = `All Orders (${allCount})`;
        else if (filter === "online") tab.textContent = `Online Delivery (${onlineCount})`;
        else if (filter === "walk-in") tab.textContent = `In-Store Pickup (${pickupCount})`;
        else if (filter === "pending") tab.textContent = `Pending (${pendingCount})`;
    });
}

// Filter and render table rows
function renderOrdersTable() {
    const tbody = document.getElementById("orders_tbody");
    if (!tbody) return;

    // Apply Tab Filter
    let filtered = allOrders.filter(order => {
        const type = (order.deliveryType || order.delivery_type || 'delivery').toLowerCase();
        const status = (order.orderStatus || order.order_status || 'pending').toLowerCase();
        const payStatus = (order.paymentStatus || order.payment_status || 'pending').toLowerCase();

        if (activeTabFilter === 'online') return type === 'delivery';
        if (activeTabFilter === 'walk-in') return type === 'pickup';
        if (activeTabFilter === 'pending') return status === 'pending' || payStatus === 'pending';
        return true;
    });

    // Apply Status Filter Dropdown
    if (currentStatusFilter && currentStatusFilter !== 'all') {
        filtered = filtered.filter(order => {
            const status = (order.orderStatus || order.order_status || '').toLowerCase();
            const payStatus = (order.paymentStatus || order.payment_status || '').toLowerCase();
            return status === currentStatusFilter || payStatus === currentStatusFilter;
        });
    }

    // Apply Search Query
    if (currentSearchQuery) {
        filtered = filtered.filter(order => {
            const num = (order.orderNumber || order.order_number || '').toLowerCase();
            const name = (order.customerName || order.customer_name || '').toLowerCase();
            const email = (order.customerEmail || order.customer_email || '').toLowerCase();
            const items = (order.orderItems || order.items || []).map(i => (i.name || i.product_name || '').toLowerCase()).join(' ');
            return num.includes(currentSearchQuery) || name.includes(currentSearchQuery) || email.includes(currentSearchQuery) || items.includes(currentSearchQuery);
        });
    }

    // Handle Empty Results
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px 16px; color: #64748b;">
                    <i class="fas fa-box-open" style="font-size: 32px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    <strong style="color: #334155; font-size: 15px; display: block; margin-bottom: 4px;">No orders found</strong>
                    <span style="font-size: 13px;">No orders matched your current filters or search term.</span>
                </td>
            </tr>
        `;
        updatePagination(0, 0);
        return;
    }

    // Pagination calculations
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (currentOrderPage > totalPages) currentOrderPage = totalPages;
    const startIndex = (currentOrderPage - 1) * ITEMS_PER_PAGE;
    const paginatedOrders = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Build Table Rows
    tbody.innerHTML = paginatedOrders.map(order => {
        const orderId = order.id || order._id;
        const orderNumber = order.orderNumber || order.order_number || `ORD-${orderId}`;
        const customerName = order.customerName || order.customer_name || 'Customer';
        const deliveryType = order.deliveryType || order.delivery_type || 'delivery';
        const typeLabel = deliveryType === 'delivery' ? 'Online Delivery' : 'Store Pickup';
        const paymentMethod = (order.paymentMethod || order.payment_method || 'Cash').toUpperCase();
        const orderStatus = order.orderStatus || order.order_status || 'pending';
        const paymentStatus = order.paymentStatus || order.payment_status || 'pending';
        const total = parseFloat(order.totalPrice || order.total_amount || 0);

        // Status badge styling
        const statusBadge = getStatusBadge(orderStatus, paymentStatus);

        return `
            <tr data-type="${deliveryType}" data-status="${orderStatus.toLowerCase()}" id="order_row_${orderId}">
                <td class="cell_order_id">
                    <strong>${orderNumber}</strong>
                    <div style="font-size: 11px; color: #94a3b8; font-weight: normal;">${formatDate(order.createdAt || order.created_at)}</div>
                </td>
                <td class="cell_customer_name">
                    <div style="font-weight: 600; color: #0f172a;">${customerName}</div>
                    <div style="font-size: 11px; color: #64748b;">${order.customerPhone || order.customer_phone || ''}</div>
                </td>
                <td>
                    <span style="font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; color: ${deliveryType === 'delivery' ? '#0284c7' : '#16a34a'};">
                        <i class="fas ${deliveryType === 'delivery' ? 'fa-truck' : 'fa-store'}"></i> ${typeLabel}
                    </span>
                </td>
                <td>
                    <span style="font-size: 12px; font-weight: 600; color: #334155;">${paymentMethod}</span>
                    <span style="display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; color: ${paymentStatus === 'paid' ? '#16a34a' : '#d97706'};">${paymentStatus}</span>
                </td>
                <td class="order_status_cell">${statusBadge}</td>
                <td class="cell_amount" style="font-weight: 700; color: #0f172a;">₱${total.toLocaleString()}</td>
                <td>
                    <button type="button" class="table_btn_view" onclick="openOrderModal('${orderId}')" style="cursor: pointer;">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    updatePagination(totalItems, totalPages);
}

// Helper: Status badge HTML
function getStatusBadge(status, payStatus) {
    const s = (status || '').toLowerCase();
    if (s === 'completed') {
        return '<span class="status_pill status_completed"><i class="fas fa-check-circle"></i> Completed</span>';
    } else if (s === 'shipped') {
        return '<span class="status_pill" style="background: #e0e7ff; color: #4338ca;"><i class="fas fa-truck"></i> Shipped</span>';
    } else if (s === 'ready_for_pickup') {
        return '<span class="status_pill" style="background: #ede9fe; color: #6d28d9;"><i class="fas fa-box"></i> Ready for Pickup</span>';
    } else if (s === 'processing') {
        return '<span class="status_pill status_paid"><i class="fas fa-cog fa-spin"></i> Processing</span>';
    } else if (s === 'cancelled') {
        return '<span class="status_pill" style="background: #fee2e2; color: #dc2626;"><i class="fas fa-ban"></i> Cancelled</span>';
    } else {
        return '<span class="status_pill status_pending"><i class="fas fa-clock"></i> Pending</span>';
    }
}

// Format timestamp
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Update pagination display
function updatePagination(totalItems, totalPages) {
    const info = document.getElementById("orders_pagination_info");
    const controls = document.getElementById("orders_pagination_controls");
    if (!info || !controls) return;

    if (totalItems === 0) {
        info.textContent = "Showing 0 orders";
        controls.innerHTML = "";
        return;
    }

    const start = (currentOrderPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentOrderPage * ITEMS_PER_PAGE, totalItems);
    info.textContent = `Showing ${start}-${end} of ${totalItems} orders`;

    let html = `
        <button type="button" class="pagination_btn" ${currentOrderPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : `onclick="changeOrderPage(${currentOrderPage - 1})"`}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
        html += `
            <button type="button" class="pagination_btn ${p === currentOrderPage ? 'page_active' : ''}" onclick="changeOrderPage(${p})">${p}</button>
        `;
    }

    html += `
        <button type="button" class="pagination_btn" ${currentOrderPage === totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : `onclick="changeOrderPage(${currentOrderPage + 1})"`}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    controls.innerHTML = html;
}

function changeOrderPage(page) {
    currentOrderPage = page;
    renderOrdersTable();
}

// Open Order Details Modal
function openOrderModal(orderId) {
    selectedOrder = allOrders.find(o => String(o.id || o._id) === String(orderId));
    if (!selectedOrder) return;

    const orderNumber = selectedOrder.orderNumber || selectedOrder.order_number || `ORD-${orderId}`;
    const invoiceNum = selectedOrder.invoiceNumber || selectedOrder.invoice_number || 'N/A';
    const customerName = selectedOrder.customerName || selectedOrder.customer_name || 'Customer';
    const customerEmail = selectedOrder.customerEmail || selectedOrder.customer_email || 'N/A';
    const customerPhone = selectedOrder.customerPhone || selectedOrder.customer_phone || 'N/A';
    const deliveryType = selectedOrder.deliveryType || selectedOrder.delivery_type || 'delivery';
    const address = selectedOrder.deliveryAddress || selectedOrder.delivery_address || 'Pick up at store';
    const paymentMethod = (selectedOrder.paymentMethod || selectedOrder.payment_method || 'Cash').toUpperCase();
    const paymentStatus = selectedOrder.paymentStatus || selectedOrder.payment_status || 'pending';
    const orderStatus = selectedOrder.orderStatus || selectedOrder.order_status || 'pending';
    const subtotal = parseFloat(selectedOrder.subtotal || 0);
    const shipping = parseFloat(selectedOrder.shippingFee || selectedOrder.shipping_fee || 0);
    const total = parseFloat(selectedOrder.totalPrice || selectedOrder.total_amount || 0);
    const notes = selectedOrder.notes || '';

    // Populate modal elements
    const rowIdInput = document.getElementById("modal_order_row_id");
    if (rowIdInput) rowIdInput.value = orderId;

    const titleEl = document.getElementById("order_modal_title");
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-clipboard-list" style="color: #b91c1c; margin-right: 8px;"></i>Order Details: ${orderNumber}`;

    const custEl = document.getElementById("modal_order_customer");
    if (custEl) custEl.textContent = `${customerName} (${customerPhone})`;

    const typeEl = document.getElementById("modal_order_type");
    if (typeEl) typeEl.textContent = deliveryType === 'delivery' ? `Delivery: ${address}` : 'In-Store Pickup (Taurus Bike Shop, Marilao)';

    const payEl = document.getElementById("modal_order_payment");
    if (payEl) payEl.innerHTML = `${paymentMethod} &bull; <span style="text-transform: uppercase; font-size: 11px; font-weight: 700; color: ${paymentStatus === 'paid' ? '#16a34a' : '#d97706'};">${paymentStatus}</span> (Invoice: ${invoiceNum})`;

    const totalEl = document.getElementById("modal_order_total");
    if (totalEl) totalEl.textContent = `₱${total.toLocaleString()}`;

    // Itemized table list
    const items = selectedOrder.orderItems || selectedOrder.items || [];
    const itemsEl = document.getElementById("modal_order_items");
    if (itemsEl) {
        if (items.length === 0) {
            itemsEl.innerHTML = `<span style="color: #94a3b8; font-style: italic;">No item details available</span>`;
        } else {
            itemsEl.innerHTML = `
                <div style="max-height: 180px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; text-align: left;">
                                <th style="padding: 6px 0;">Item</th>
                                <th style="padding: 6px 8px; text-align: center;">Qty</th>
                                <th style="padding: 6px 8px; text-align: right;">Price</th>
                                <th style="padding: 6px 0; text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(it => {
                                const name = it.name || it.product_name || 'Product';
                                const qty = it.quantity || 1;
                                const unitPrice = parseFloat(it.price || it.unit_price || 0);
                                const lineSubtotal = parseFloat(it.subtotal || (unitPrice * qty));
                                return `
                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${name}</td>
                                        <td style="padding: 8px; text-align: center; color: #475569;">x${qty}</td>
                                        <td style="padding: 8px; text-align: right; color: #475569;">₱${unitPrice.toLocaleString()}</td>
                                        <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a;">₱${lineSubtotal.toLocaleString()}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                                <td colspan="3" style="padding-top: 8px; text-align: right;">Shipping / Fulfillment Fee:</td>
                                <td style="padding-top: 8px; text-align: right; font-weight: 600; color: #0f172a;">₱${shipping.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }
    }

    // Set Status dropdown to current order status
    const statusSelect = document.getElementById("modal_fulfillment_status");
    if (statusSelect) {
        statusSelect.value = orderStatus;
    }

    if (typeof openModal === 'function') openModal("order_detail_modal");
}

// Save Fulfillment Status to Backend API
async function saveFulfillmentStatus() {
    if (!selectedOrder) return;
    const orderId = selectedOrder.id || selectedOrder._id;
    const statusSelect = document.getElementById("modal_fulfillment_status");
    const newStatus = statusSelect?.value || 'pending';
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");

    if (newStatus === 'cancelled') {
        const confirmCancel = confirm("Are you sure you want to cancel this order? This will automatically restore the deducted product inventory in PostgreSQL.");
        if (!confirmCancel) return;
    }

    const saveBtn = document.querySelector("#order_detail_modal .modal_footer .btn_primary");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                order_status: newStatus
            })
        });

        const data = await res.json();

        if (res.ok && data.status === 'success') {
            if (typeof closeModal === 'function') closeModal("order_detail_modal");
            if (typeof showToast === 'function') showToast(`Order status updated to "${newStatus}"!`, true);
            await loadAdminOrders();
        } else {
            alert(data.message || 'Failed to update order status');
        }
    } catch (err) {
        console.error("Order status update error:", err);
        alert('Server communication error. Check server logs.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Update';
        }
    }
}
