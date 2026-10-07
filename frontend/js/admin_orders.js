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
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl("/api/orders") : "/api/orders";
        const res = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            if (typeof handleAdminSessionExpired === 'function') handleAdminSessionExpired();
            else window.location.href = "login.html?session_expired=true";
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
    const pendingCount = allOrders.filter(o => (o.orderStatus || o.order_status) === 'pending' || (o.orderStatus || o.order_status) === 'payment_confirmation' || (o.paymentStatus || o.payment_status) === 'pending').length;

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
        if (activeTabFilter === 'pending') return status === 'pending' || status === 'payment_confirmation' || payStatus === 'pending';
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
                    <div class="table_actions_cell">
                        ${(paymentStatus !== 'paid' && orderStatus.toLowerCase() !== 'declined' && orderStatus.toLowerCase() !== 'cancelled') ? `
                            <button type="button" class="table_btn_verify" onclick="verifyOrderPayment('${orderId}')" title="Approve payment (moves to Processing)">
                                <i class="fas fa-check-circle"></i> Approve
                            </button>
                            <button type="button" class="table_btn_decline" onclick="declineOrderPayment('${orderId}')" title="Decline payment if not received">
                                <i class="fas fa-times-circle"></i> Decline
                            </button>
                        ` : ''}
                        ${(paymentStatus === 'paid' && (orderStatus === 'ready_for_delivery' || orderStatus === 'ready_for_pickup' || orderStatus === 'shipped')) ? `
                            <button type="button" class="table_btn_complete" onclick="quickCompleteOrder('${orderId}')" title="Complete Order">
                                <i class="fas fa-check"></i> Complete
                            </button>
                        ` : ''}
                        <button type="button" class="table_btn_view" onclick="openOrderModal('${orderId}')" title="View Order & Actions">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
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
    } else if (s === 'ready_for_delivery') {
        return '<span class="status_pill" style="background: #e0f2fe; color: #0284c7; font-weight: 600;"><i class="fas fa-shipping-fast"></i> Ready for Delivery</span>';
    } else if (s === 'shipped' || s === 'out_for_delivery') {
        return '<span class="status_pill" style="background: #e0e7ff; color: #4338ca;"><i class="fas fa-truck"></i> Shipped</span>';
    } else if (s === 'ready_for_pickup') {
        return '<span class="status_pill" style="background: #ede9fe; color: #7c3aed; font-weight: 600;"><i class="fas fa-box"></i> Ready for Pickup</span>';
    } else if (s === 'processing') {
        return '<span class="status_pill status_paid"><i class="fas fa-cog fa-spin"></i> Processing</span>';
    } else if (s === 'payment_confirmation') {
        return '<span class="status_pill" style="background: #fef3c7; color: #b45309; font-weight: 600;"><i class="fas fa-receipt"></i> Payment Confirmation</span>';
    } else if (s === 'declined') {
        return '<span class="status_pill" style="background: #fee2e2; color: #dc2626; font-weight: 700;"><i class="fas fa-times-circle"></i> Declined</span>';
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
    const deliveryType = (selectedOrder.deliveryType || selectedOrder.delivery_type || 'delivery').toLowerCase();
    const address = selectedOrder.deliveryAddress || selectedOrder.delivery_address || 'Pick up at store';
    const paymentMethod = (selectedOrder.paymentMethod || selectedOrder.payment_method || 'Cash').toUpperCase();
    const paymentStatus = (selectedOrder.paymentStatus || selectedOrder.payment_status || 'pending').toLowerCase();
    const orderStatus = (selectedOrder.orderStatus || selectedOrder.order_status || 'pending').toLowerCase();
    const subtotal = parseFloat(selectedOrder.subtotal || 0);
    const shipping = parseFloat(selectedOrder.shippingFee || selectedOrder.shipping_fee || 0);
    const total = parseFloat(selectedOrder.totalPrice || selectedOrder.total_amount || 0);

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

    // Render Status Badge in Order Actions Header
    const statusBadgeEl = document.getElementById("modal_current_status_badge");
    if (statusBadgeEl) {
        statusBadgeEl.innerHTML = getStatusBadge(orderStatus, paymentStatus);
    }

    // Render Payment Verification Box
    const verifyBoxEl = document.getElementById("modal_payment_verification_box");
    if (verifyBoxEl) {
        if (orderStatus === 'declined') {
            const reason = selectedOrder.declineReason || selectedOrder.decline_reason || 'Payment has not been received';
            verifyBoxEl.innerHTML = `
                <div class="order_verify_card" style="background:#fee2e2; border-color:#fecaca;">
                    <div class="order_verify_info">
                        <i class="fas fa-times-circle order_verify_icon" style="color:#dc2626;"></i>
                        <div>
                            <div class="order_verify_title" style="color:#991b1b;">Order Declined</div>
                            <div class="order_verify_sub" style="color:#b91c1c;">Payment was declined: <strong>${escapeHtml(reason)}</strong></div>
                        </div>
                    </div>
                    <span class="status_pill" style="background:#dc2626; color:#ffffff; font-weight:700;"><i class="fas fa-times"></i> Declined</span>
                </div>
            `;
        } else if (paymentStatus === 'paid') {
            verifyBoxEl.innerHTML = `
                <div class="order_verify_card">
                    <div class="order_verify_info">
                        <i class="fas fa-check-circle order_verify_icon"></i>
                        <div>
                            <div class="order_verify_title">Payment Confirmed</div>
                            <div class="order_verify_sub">Customer payment of ₱${total.toLocaleString()} has been confirmed & verified.</div>
                        </div>
                    </div>
                    <span class="status_pill status_completed"><i class="fas fa-check"></i> Paid</span>
                </div>
            `;
        } else {
            verifyBoxEl.innerHTML = `
                <div class="order_verify_card is_pending">
                    <div class="order_verify_info">
                        <i class="fas fa-receipt order_verify_icon"></i>
                        <div>
                            <div class="order_verify_title">Payment Verification Required</div>
                            <div class="order_verify_sub">Verify if customer payment of ₱${total.toLocaleString()} was received via ${paymentMethod}. If received, click Approve (moves to Processing). If not, click Decline.</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="btn_verify_payment" id="btn_modal_verify_${orderId}" onclick="verifyOrderPayment('${orderId}')" title="Approve Payment - moves to Processing stage">
                            <i class="fas fa-check-circle"></i> Approve Payment
                        </button>
                        <button type="button" class="btn_decline_payment" id="btn_modal_decline_${orderId}" onclick="declineOrderPayment('${orderId}')" title="Decline Payment if not received">
                            <i class="fas fa-times-circle"></i> Decline Payment
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Render Order Action Buttons (Replacing dropdown)
    renderModalOrderActions(orderId, deliveryType, orderStatus, paymentStatus);

    if (typeof openModal === 'function') openModal("order_detail_modal");
}

// Render the action buttons grid inside modal based on delivery type & status
function renderModalOrderActions(orderId, deliveryType, orderStatus, paymentStatus) {
    const actionsContainer = document.getElementById("modal_order_actions");
    if (!actionsContainer) return;

    const isDelivery = deliveryType === 'delivery';
    const isPickup = deliveryType === 'pickup';
    const isCompleted = orderStatus === 'completed';
    const isCancelled = orderStatus === 'cancelled';
    const isDeclined = orderStatus === 'declined';
    const isPaid = paymentStatus === 'paid';

    if (isDeclined) {
        const reason = selectedOrder?.declineReason || selectedOrder?.decline_reason || 'Payment has not been received';
        actionsContainer.innerHTML = `
            <div style="grid-column: span 2; background: #fee2e2; border: 1.5px solid #fecaca; border-radius: 8px; padding: 14px; text-align: center; color: #991b1b;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                    <i class="fas fa-times-circle" style="color: #dc2626;"></i> Order Declined
                </div>
                <div style="font-size: 12.5px; color: #b91c1c;">
                    Reason: <strong>${escapeHtml(reason)}</strong>. Product inventory has been restored.
                </div>
            </div>
        `;
        return;
    }

    let paymentActionButtons = '';
    if (!isPaid && !isCancelled) {
        paymentActionButtons = `
            <!-- Payment Action: Approve Payment -->
            <button type="button" 
                    class="order_action_btn btn_action_approve"
                    onclick="verifyOrderPayment('${orderId}')"
                    title="Approve payment has been received (moves order to Processing stage)">
                <span class="action_btn_main"><i class="fas fa-check-circle"></i> Approve Payment</span>
                <span class="action_tag_hint" style="color: #16a34a;">(Moves to Processing stage)</span>
            </button>

            <!-- Payment Action: Decline Payment -->
            <button type="button" 
                    class="order_action_btn btn_action_decline"
                    onclick="declineOrderPayment('${orderId}')"
                    title="Decline payment if not received">
                <span class="action_btn_main"><i class="fas fa-times-circle"></i> Decline Payment</span>
                <span class="action_tag_hint" style="color: #dc2626;">(Payment not received)</span>
            </button>
        `;
    }

    actionsContainer.innerHTML = `
        ${paymentActionButtons}

        <!-- Action 1: Ready for Delivery (Active for delivery, strictly DISABLED for pickup) -->
        <button type="button" 
                class="order_action_btn btn_delivery_ready ${orderStatus === 'ready_for_delivery' ? 'is_active' : ''} ${(!isDelivery || !isPaid) ? 'is_disabled' : ''}"
                ${(!isDelivery || !isPaid || isCompleted || isCancelled) ? 'disabled' : `onclick="updateOrderStatusDirect('${orderId}', 'ready_for_delivery')"`}
                title="${!isPaid ? 'Payment must be approved first' : (!isDelivery ? 'Disabled: In-Store Pickup order' : 'Mark Ready for Delivery')}">
            <span class="action_btn_main"><i class="fas fa-shipping-fast"></i> Ready for Delivery</span>
            ${!isPaid ? '<span class="action_tag_hint">(Requires Approved Payment)</span>' : (!isDelivery ? '<span class="action_tag_hint">(Disabled: Pickup order)</span>' : (orderStatus === 'ready_for_delivery' ? '<span class="action_tag_hint" style="color: #0284c7;">(Current Status)</span>' : ''))}
        </button>

        <!-- Action 2: Ready for Pickup (Active for pickup, strictly DISABLED for delivery) -->
        <button type="button" 
                class="order_action_btn btn_pickup_ready ${orderStatus === 'ready_for_pickup' ? 'is_active' : ''} ${(isDelivery || !isPaid) ? 'is_disabled' : ''}"
                ${(isDelivery || !isPaid || isCompleted || isCancelled) ? 'disabled' : `onclick="updateOrderStatusDirect('${orderId}', 'ready_for_pickup')"`}
                title="${!isPaid ? 'Payment must be approved first' : (isDelivery ? 'Disabled: Delivery order' : 'Mark Ready for Pickup')}">
            <span class="action_btn_main"><i class="fas fa-box"></i> Ready for Pickup</span>
            ${!isPaid ? '<span class="action_tag_hint">(Requires Approved Payment)</span>' : (isDelivery ? '<span class="action_tag_hint">(Disabled: Delivery order)</span>' : (orderStatus === 'ready_for_pickup' ? '<span class="action_tag_hint" style="color: #7c3aed;">(Current Status)</span>' : ''))}
        </button>

        <!-- Action 3: Shipped / Out for Delivery (Active for delivery, DISABLED for pickup) -->
        <button type="button" 
                class="order_action_btn ${orderStatus === 'shipped' ? 'is_active' : ''} ${(!isDelivery || !isPaid) ? 'is_disabled' : ''}"
                ${(!isDelivery || !isPaid || isCompleted || isCancelled) ? 'disabled' : `onclick="updateOrderStatusDirect('${orderId}', 'shipped')"`}
                title="${!isPaid ? 'Payment must be approved first' : (!isDelivery ? 'Disabled for Pickup order' : 'Mark Out for Delivery')}">
            <span class="action_btn_main"><i class="fas fa-truck"></i> Out for Delivery</span>
            ${!isPaid ? '<span class="action_tag_hint">(Requires Approved Payment)</span>' : (!isDelivery ? '<span class="action_tag_hint">(Disabled: Pickup order)</span>' : (orderStatus === 'shipped' ? '<span class="action_tag_hint" style="color: #4338ca;">(Current Status)</span>' : ''))}
        </button>

        <!-- Action 4: Mark Completed -->
        <button type="button" 
                class="order_action_btn btn_complete ${orderStatus === 'completed' ? 'is_active' : ''} ${!isPaid ? 'is_disabled' : ''}"
                ${(!isPaid || isCancelled) ? 'disabled' : `onclick="updateOrderStatusDirect('${orderId}', 'completed')"`}
                title="${!isPaid ? 'Payment must be approved first' : 'Mark order completed'}">
            <span class="action_btn_main"><i class="fas fa-check-circle"></i> Mark Completed</span>
            ${!isPaid ? '<span class="action_tag_hint">(Requires Approved Payment)</span>' : (orderStatus === 'completed' ? '<span class="action_tag_hint" style="color: #16a34a;">(Completed)</span>' : '')}
        </button>

        <!-- Action 5: Cancel Order (Span 2 columns if grid) -->
        <button type="button" 
                class="order_action_btn btn_action_danger ${orderStatus === 'cancelled' ? 'is_active' : ''}"
                style="grid-column: span 2;"
                ${(isCompleted || isCancelled) ? 'disabled' : `onclick="cancelOrderDirect('${orderId}')"`}>
            <span class="action_btn_main"><i class="fas fa-ban"></i> Cancel Order (Restore Stock)</span>
            ${orderStatus === 'cancelled' ? '<span class="action_tag_hint" style="color: #dc2626;">(Cancelled)</span>' : ''}
        </button>
    `;
}

// 1. Payment Confirmation: Admin approves payment received -> moves to Processing stage
async function verifyOrderPayment(orderId) {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    const modalBtn = document.getElementById(`btn_modal_verify_${orderId}`);
    if (modalBtn) {
        modalBtn.disabled = true;
        modalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/orders/${orderId}/verify-payment`) : `/api/orders/${orderId}/verify-payment`;
        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Payment approved! Order moved to Processing stage.', true);
            }
            await loadAdminOrders();
            // If modal is open, refresh its content
            if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(orderId)) {
                openOrderModal(orderId);
            }
        } else {
            alert(data.message || 'Failed to approve payment');
            if (modalBtn) {
                modalBtn.disabled = false;
                modalBtn.innerHTML = '<i class="fas fa-check-circle"></i> Approve Payment';
            }
        }
    } catch (err) {
        console.error("Payment approval error:", err);
        alert('Server communication error while approving payment.');
        if (modalBtn) {
            modalBtn.disabled = false;
            modalBtn.innerHTML = '<i class="fas fa-check-circle"></i> Approve Payment';
        }
    }
}
window.verifyOrderPayment = verifyOrderPayment;

// 2. Decline Payment: Admin declines payment -> marks as Declined with reason 'Payment has not been received'
async function declineOrderPayment(orderId) {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    const confirmDecline = confirm("Decline this order because payment has not been received?\n\nThis will mark the order as Declined for the customer and restore product inventory.");
    if (!confirmDecline) return;

    const modalBtn = document.getElementById(`btn_modal_decline_${orderId}`);
    if (modalBtn) {
        modalBtn.disabled = true;
        modalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Declining...';
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/orders/${orderId}/decline-payment`) : `/api/orders/${orderId}/decline-payment`;
        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: 'Payment has not been received' })
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Payment declined. Status updated to Declined.', true);
            }
            await loadAdminOrders();
            if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(orderId)) {
                openOrderModal(orderId);
            }
        } else {
            alert(data.message || 'Failed to decline order');
            if (modalBtn) {
                modalBtn.disabled = false;
                modalBtn.innerHTML = '<i class="fas fa-times-circle"></i> Decline Payment';
            }
        }
    } catch (err) {
        console.error("Payment decline error:", err);
        alert('Server communication error while declining payment.');
        if (modalBtn) {
            modalBtn.disabled = false;
            modalBtn.innerHTML = '<i class="fas fa-times-circle"></i> Decline Payment';
        }
    }
}
window.declineOrderPayment = declineOrderPayment;

// 2. Direct Status Update via Action Buttons
async function updateOrderStatusDirect(orderId, newStatus) {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/orders/${orderId}/status`) : `/api/orders/${orderId}/status`;
        const res = await fetch(apiUrl, {
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
            const label = newStatus.replace(/_/g, ' ');
            if (typeof showToast === 'function') {
                showToast(`Order status updated to "${label}"!`, true);
            }
            await loadAdminOrders();
            if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(orderId)) {
                openOrderModal(orderId);
            }
        } else {
            alert(data.message || 'Failed to update order status');
        }
    } catch (err) {
        console.error("Order status update error:", err);
        alert('Server communication error.');
    }
}

// 3. Quick Complete Order from Table
async function quickCompleteOrder(orderId) {
    await updateOrderStatusDirect(orderId, 'completed');
}

// 4. Cancel Order with stock restoration confirmation
async function cancelOrderDirect(orderId) {
    const confirmed = confirm("Are you sure you want to cancel this order? This will automatically restore deducted product inventory in PostgreSQL.");
    if (!confirmed) return;

    await updateOrderStatusDirect(orderId, 'cancelled');
}
