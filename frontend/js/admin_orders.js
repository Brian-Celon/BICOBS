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
    // 1. Initial orders fetch & live synchronization
    loadAdminOrders();
    startLiveOrderSync();

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
                <td class="order_status_cell">
                    ${statusBadge}
                    ${orderStatus.toLowerCase() === 'declined' ? `
                        <div style="font-size: 11px; color: #991b1b; margin-top: 3px; font-weight: 500;">
                            <i class="fas fa-info-circle"></i> ${escapeHtml(order.declineReason || order.decline_reason || 'Payment has not been received')}
                        </div>
                    ` : ''}
                </td>
                <td class="cell_amount" style="font-weight: 700; color: #0f172a;">₱${total.toLocaleString()}</td>
                <td>
                    <div class="table_actions_cell">
                        ${(paymentStatus !== 'paid' && orderStatus.toLowerCase() !== 'declined' && orderStatus.toLowerCase() !== 'cancelled') ? `
                            <button type="button" class="table_btn_verify" onclick="verifyOrderPayment('${orderId}')" title="Confirm payment">
                                <i class="fas fa-check-circle"></i> Confirm Payment
                            </button>
                            <button type="button" class="table_btn_decline" onclick="declineOrderPayment('${orderId}')" title="Reject payment (returns stock)">
                                <i class="fas fa-times-circle"></i> Reject
                            </button>
                        ` : ''}
                        ${(paymentStatus === 'paid' && (orderStatus === 'ready_for_deliver' || orderStatus === 'ready_for_delivery' || orderStatus === 'out_for_delivery' || orderStatus === 'shipped' || orderStatus === 'ready_for_pickup')) ? `
                            <button type="button" class="table_btn_complete" onclick="handleAdminMarkCompleted('${orderId}')" title="Complete Order">
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
    } else if (s === 'ready_for_deliver' || s === 'ready_for_delivery') {
        return '<span class="status_pill" style="background: #e0f2fe; color: #0284c7; font-weight: 600;"><i class="fas fa-shipping-fast"></i> Ready for Deliver</span>';
    } else if (s === 'out_for_delivery' || s === 'shipped') {
        return '<span class="status_pill" style="background: #e0e7ff; color: #4338ca; font-weight: 600;"><i class="fas fa-truck"></i> Out for Delivery</span>';
    } else if (s === 'ready_for_pickup') {
        return '<span class="status_pill" style="background: #ede9fe; color: #7c3aed; font-weight: 600;"><i class="fas fa-box"></i> Ready for Pickup</span>';
    } else if (s === 'payment_confirmed') {
        return '<span class="status_pill" style="background: #dcfce7; color: #15803d; font-weight: 700;"><i class="fas fa-check-circle"></i> Payment Confirmed</span>';
    } else if (s === 'processing') {
        return '<span class="status_pill status_paid"><i class="fas fa-cog fa-spin"></i> Processing</span>';
    } else if (s === 'payment_confirmation') {
        return '<span class="status_pill" style="background: #fef3c7; color: #b45309; font-weight: 600;"><i class="fas fa-receipt"></i> Payment Confirmation</span>';
    } else if (s === 'declined' || s === 'rejected') {
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
    const proofImg = selectedOrder.paymentProof || selectedOrder.payment_proof || '';
    const refNum = selectedOrder.paymentReference || selectedOrder.payment_reference || selectedOrder.referenceNumber || '';

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

    // Check if order is from Point of Sale (POS)
    const isPosOrder = (orderNumber && orderNumber.toUpperCase().includes('POS'))
      || (selectedOrder.notes && (selectedOrder.notes.includes('Counter Checkout') || selectedOrder.notes.includes('Cashier:') || selectedOrder.notes.includes('Shift:')));

    // 1. Render Proof of Payment Screenshot & Reference Section
    const proofSectionEl = document.getElementById("modal_payment_proof_section");
    const proofBodyEl = document.getElementById("modal_payment_proof_body");
    const refBadgeEl = document.getElementById("modal_payment_proof_ref_badge");
    const bannerEl = document.getElementById("modal_customer_confirmation_banner");

    if (isPosOrder) {
        // POS orders do not need proof of payment, nor web delivery confirmation
        if (proofSectionEl) proofSectionEl.style.display = 'none';
        if (bannerEl) bannerEl.innerHTML = '';
    } else {
        if (proofSectionEl) proofSectionEl.style.display = 'block';

        if (refBadgeEl) {
            if (refNum && refNum !== 'PROOF_UPLOADED' && refNum !== 'CASH_ON_PICKUP') {
                refBadgeEl.textContent = `Ref: ${refNum}`;
                refBadgeEl.style.display = 'inline-block';
            } else if (proofImg) {
                refBadgeEl.textContent = 'Proof Attached';
                refBadgeEl.style.display = 'inline-block';
            } else {
                refBadgeEl.textContent = 'Ref: Not provided';
                refBadgeEl.style.display = 'inline-block';
            }
        }

        if (proofBodyEl) {
            if (proofImg) {
                proofBodyEl.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div style="position: relative; max-width: 100%; cursor: pointer;" onclick="openPaymentProofLightbox('${orderId}')" title="Click to view full screenshot">
                            <img src="${proofImg}" alt="Payment Proof" style="max-height: 180px; max-width: 100%; border-radius: 6px; border: 1.5px solid #cbd5e1; object-fit: contain; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                <i class="fas fa-search-plus"></i> View Full Screenshot
                            </span>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; flex-wrap: wrap; justify-content: center;">
                            <button type="button" class="btn_secondary" onclick="openPaymentProofLightbox('${orderId}')" style="font-size: 11.5px; padding: 5px 14px; font-weight: 600;">
                                <i class="fas fa-eye"></i> Enlarge Screenshot
                            </button>
                        </div>
                    </div>
                `;
            } else {
                proofBodyEl.innerHTML = `
                    <div style="padding: 16px; border: 1.5px dashed #cbd5e1; border-radius: 6px; text-align: center; background: #f8fafc;">
                        <i class="fas fa-receipt" style="font-size: 28px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
                        <span style="font-size: 12.5px; color: #64748b; font-weight: 500; display: block;">No proof of payment screenshot uploaded yet by customer</span>
                    </div>
                `;
            }
        }
    }

    // 2. Itemized table list
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

    // 3. Render Customer Confirmation Status Banner (Only for non-POS web orders)
    if (bannerEl && !isPosOrder) {
        const isCustomerConfirmed = !!(selectedOrder.customerConfirmed || selectedOrder.customer_confirmed);
        const confirmedAt = selectedOrder.customerConfirmedAt || selectedOrder.customer_confirmed_at;

        if (isCustomerConfirmed) {
            bannerEl.innerHTML = `
                <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="color: #15803d; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-check-double" style="font-size: 16px; color: #16a34a;"></i> Receipt Confirmed by Customer on Web
                    </span>
                    <span style="font-size: 11px; color: #166534; font-weight: 600;">${formatDate(confirmedAt) || 'Confirmed'}</span>
                </div>
            `;
        } else {
            bannerEl.innerHTML = `
                <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="color: #b45309; font-weight: 600; font-size: 12.5px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-clock" style="font-size: 15px; color: #d97706;"></i> Awaiting Customer Delivery Confirmation on Web
                    </span>
                    <span style="font-size: 11px; color: #92400e; font-weight: 500;">Pending Customer</span>
                </div>
            `;
        }
    }

    // 4. Render Status Badge in Order Actions Header
    const statusBadgeEl = document.getElementById("modal_current_status_badge");
    if (statusBadgeEl) {
        statusBadgeEl.innerHTML = getStatusBadge(orderStatus, paymentStatus);
    }

    // 5. Render Payment Verification Box
    const verifyBoxEl = document.getElementById("modal_payment_verification_box");
    if (verifyBoxEl) {
        if (orderStatus === 'declined' || orderStatus === 'rejected') {
            const reason = selectedOrder.declineReason || selectedOrder.decline_reason || 'Payment has not been received';
            verifyBoxEl.innerHTML = `
                <div class="order_verify_card" style="background:#fee2e2; border-color:#fecaca;">
                    <div class="order_verify_info">
                        <i class="fas fa-times-circle order_verify_icon" style="color:#dc2626;"></i>
                        <div>
                            <div class="order_verify_title" style="color:#991b1b;">Order Declined / Rejected</div>
                            <div class="order_verify_sub" style="color:#b91c1c;">Payment declined: <strong>${escapeHtml(reason)}</strong>. Items returned to inventory stock.</div>
                        </div>
                    </div>
                    <span class="status_pill" style="background:#dc2626; color:#ffffff; font-weight:700;"><i class="fas fa-times"></i> Declined</span>
                </div>
            `;
        } else if (paymentStatus === 'paid' || orderStatus === 'payment_confirmed') {
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
            const refDetail = proofImg ? 'Proof Screenshot Attached' : (refNum && refNum !== 'PROOF_UPLOADED' && refNum !== 'CASH_ON_PICKUP' ? `Ref: ${refNum}` : 'No ref');
            verifyBoxEl.innerHTML = `
                <div class="order_verify_card is_pending">
                    <div class="order_verify_info">
                        <i class="fas fa-receipt order_verify_icon"></i>
                        <div>
                            <div class="order_verify_title">Payment Verification Required</div>
                            <div class="order_verify_sub">Verify customer payment of ₱${total.toLocaleString()} received via ${paymentMethod} (${refDetail}).</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="btn_verify_payment" id="btn_modal_verify_${orderId}" onclick="verifyOrderPayment('${orderId}')" title="Confirm Payment Received">
                            <i class="fas fa-check-circle"></i> Confirm Payment
                        </button>
                        <button type="button" class="btn_decline_payment" id="btn_modal_decline_${orderId}" onclick="declineOrderPayment('${orderId}')" title="Reject Payment - Restores stock">
                            <i class="fas fa-times-circle"></i> Reject Payment
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // 6. Render Order Action Buttons (Exact Progression: Payment Confirmed > Ready for Deliver > Out for Delivery > Mark Completed)
    renderModalOrderActions(orderId, deliveryType, orderStatus, paymentStatus);

    if (typeof openModal === 'function') {
        openModal("order_detail_modal");
    } else {
        const modal = document.getElementById("order_detail_modal");
        if (modal) {
            modal.classList.add("modal_active");
            document.body.style.overflow = "hidden";
        }
    }
}
window.openOrderModal = openOrderModal;

// Render the exact workflow progression requested:
// payment confirmed > ready for deliver > out for delivery > mark completed(this should be confirmed by the customer too)
function renderModalOrderActions(orderId, deliveryType, orderStatus, paymentStatus) {
    const actionsContainer = document.getElementById("modal_order_actions");
    if (!actionsContainer) return;

    const isDelivery = deliveryType === 'delivery';
    const isPickup = deliveryType === 'pickup';
    const isPaid = paymentStatus === 'paid' || orderStatus === 'payment_confirmed';
    const isCustomerConfirmed = !!(selectedOrder?.customerConfirmed || selectedOrder?.customer_confirmed);
    const isCompleted = orderStatus === 'completed';
    const isCancelled = orderStatus === 'cancelled';
    const isDeclined = orderStatus === 'declined' || orderStatus === 'rejected';

    if (isDeclined) {
        const reason = selectedOrder?.declineReason || selectedOrder?.decline_reason || 'Payment has not been received';
        actionsContainer.innerHTML = `
            <div style="grid-column: span 2; background: #fee2e2; border: 1.5px solid #fecaca; border-radius: 8px; padding: 14px; text-align: center; color: #991b1b;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                    <i class="fas fa-times-circle" style="color: #dc2626;"></i> Order Declined
                </div>
                <div style="font-size: 12.5px; color: #b91c1c;">
                    Reason: <strong>${escapeHtml(reason)}</strong>. All deducted items have been returned to inventory stock.
                </div>
            </div>
        `;
        return;
    }

    if (isCancelled) {
        actionsContainer.innerHTML = `
            <div style="grid-column: span 2; background: #fee2e2; border: 1.5px solid #fecaca; border-radius: 8px; padding: 14px; text-align: center; color: #991b1b;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                    <i class="fas fa-ban" style="color: #dc2626;"></i> Order Cancelled
                </div>
                <div style="font-size: 12.5px; color: #b91c1c;">
                    This order was cancelled. Deducted product items have been restored to inventory stock.
                </div>
            </div>
        `;
        return;
    }

    // Step 1: Payment Confirmed
    const isStep1Active = orderStatus === 'payment_confirmed';
    const step1Disabled = isPaid || isCompleted || isCancelled;

    // Step 2: Ready for Deliver (or Ready for Pickup)
    const isStep2Active = orderStatus === 'ready_for_deliver' || orderStatus === 'ready_for_delivery' || orderStatus === 'ready_for_pickup';
    const step2Disabled = !isPaid || isCompleted || isCancelled;

    // Step 3: Out for Delivery
    const isStep3Active = orderStatus === 'out_for_delivery' || orderStatus === 'shipped';
    const step3Disabled = !isPaid || isCompleted || isCancelled;

    // Step 4: Mark Completed (Customer Confirmed)
    const isStep4Active = isCompleted;
    const step4Disabled = !isPaid || isCancelled;

    actionsContainer.innerHTML = `
        <!-- Step 1: Payment Confirmed -->
        <button type="button" 
                class="order_action_btn btn_action_approve ${isStep1Active ? 'is_active' : ''} ${step1Disabled && !isStep1Active ? 'is_disabled' : ''}"
                ${step1Disabled ? 'disabled' : `onclick="verifyOrderPayment('${orderId}')"`}
                title="Step 1: Confirm Payment Received">
            <span class="action_btn_main"><i class="fas fa-check-circle"></i> 1. Payment Confirmed</span>
            ${isPaid ? '<span class="action_tag_hint" style="color: #16a34a;">(Confirmed & Verified ✓)</span>' : '<span class="action_tag_hint" style="color: #d97706;">(Click to Confirm Payment)</span>'}
        </button>

        <!-- Step 2: Ready for Deliver (or Ready for Pickup) -->
        <button type="button" 
                class="order_action_btn btn_delivery_ready ${isStep2Active ? 'is_active' : ''} ${step2Disabled ? 'is_disabled' : ''}"
                ${step2Disabled ? 'disabled' : `onclick="updateOrderStatusDirect('${orderId}', '${isPickup ? 'ready_for_pickup' : 'ready_for_delivery'}')"`}
                title="${!isPaid ? 'Payment must be confirmed first' : (isPickup ? 'Mark Ready for Pickup' : 'Step 2: Mark Ready for Deliver')}">
            <span class="action_btn_main"><i class="fas ${isPickup ? 'fa-box' : 'fa-shipping-fast'}"></i> 2. ${isPickup ? 'Ready for Pickup' : 'Ready for Deliver'}</span>
            ${!isPaid ? '<span class="action_tag_hint">(Requires Payment Confirmed)</span>' : (isStep2Active ? '<span class="action_tag_hint" style="color: #0284c7;">(Current Status)</span>' : '')}
        </button>

        <!-- Step 3: Out for Delivery (Active for delivery, shows Counter Ready for pickup) -->
        <button type="button" 
                class="order_action_btn ${isStep3Active ? 'is_active' : ''} ${step3Disabled ? 'is_disabled' : ''}"
                ${step3Disabled ? 'disabled' : `onclick="updateOrderStatusDirect('${orderId}', 'out_for_delivery')"`}
                title="${!isPaid ? 'Payment must be confirmed first' : (isPickup ? 'Available at Store Counter' : 'Step 3: Mark Out for Delivery')}">
            <span class="action_btn_main"><i class="fas ${isPickup ? 'fa-store' : 'fa-truck'}"></i> 3. ${isPickup ? 'Counter Ready' : 'Out for Delivery'}</span>
            ${!isPaid ? '<span class="action_tag_hint">(Requires Payment Confirmed)</span>' : (isStep3Active ? '<span class="action_tag_hint" style="color: #4338ca;">(Out for Delivery)</span>' : '')}
        </button>

        <!-- Step 4: Mark Completed (Customer Confirmed too) -->
        <button type="button" 
                class="order_action_btn btn_complete ${isStep4Active ? 'is_active' : ''} ${step4Disabled ? 'is_disabled' : ''}"
                ${(step4Disabled || isCompleted) ? 'disabled' : `onclick="handleAdminMarkCompleted('${orderId}')"`}
                title="${!isPaid ? 'Payment must be confirmed first' : 'Step 4: Mark Completed (Customer Confirmed)'}">
            <span class="action_btn_main">
                <i class="fas ${isCustomerConfirmed ? 'fa-check-double' : 'fa-check-circle'}"></i> 4. Mark Completed
            </span>
            ${isCompleted ? 
                '<span class="action_tag_hint" style="color: #16a34a;">(Completed ✓)</span>' : 
                (isCustomerConfirmed ? 
                    '<span class="action_tag_hint" style="color: #16a34a; font-weight: 700;">(Customer Confirmed ✓)</span>' : 
                    '<span class="action_tag_hint" style="color: #d97706;">(Awaiting Customer Confirmation)</span>')}
        </button>

        <!-- Decline Payment (Only if not paid) -->
        ${!isPaid ? `
            <button type="button" 
                    class="order_action_btn btn_action_decline"
                    onclick="declineOrderPayment('${orderId}')"
                    title="Reject payment & return stock">
                <span class="action_btn_main"><i class="fas fa-times-circle"></i> Reject / Decline Payment</span>
                <span class="action_tag_hint" style="color: #dc2626;">(Returns items to stock)</span>
            </button>
        ` : ''}

        <!-- Cancel Order (Restores product inventory) -->
        <button type="button" 
                class="order_action_btn btn_action_danger"
                style="${isPaid ? 'grid-column: span 2;' : ''}"
                ${isCompleted ? 'disabled' : `onclick="cancelOrderDirect('${orderId}')"`}>
            <span class="action_btn_main"><i class="fas fa-ban"></i> Cancel Order (Return Stock)</span>
            <span class="action_tag_hint">Restores items back to inventory</span>
        </button>
    `;
}

// 1. Payment Confirmation: Admin approves payment received -> moves to payment_confirmed
async function verifyOrderPayment(orderId) {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    const modalBtn = document.getElementById(`btn_modal_verify_${orderId}`);
    if (modalBtn) {
        modalBtn.disabled = true;
        modalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';
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
                showToast(data.message || 'Payment confirmed successfully!', true);
            }
            await loadAdminOrders();
            if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(orderId)) {
                openOrderModal(orderId);
            }
        } else {
            alert(data.message || 'Failed to confirm payment');
            if (modalBtn) {
                modalBtn.disabled = false;
                modalBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Payment';
            }
        }
    } catch (err) {
        console.error("Payment confirmation error:", err);
        alert('Server communication error while confirming payment.');
        if (modalBtn) {
            modalBtn.disabled = false;
            modalBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Payment';
        }
    }
}
window.verifyOrderPayment = verifyOrderPayment;

// 2. Decline / Reject Payment: Admin declines payment -> marks as Declined & returns stock
async function declineOrderPayment(orderId) {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    const confirmDecline = confirm("Reject this order because payment has not been received?\n\nThis will mark the order as Declined and automatically restore the ordered item stock back into inventory.");
    if (!confirmDecline) return;

    const modalBtn = document.getElementById(`btn_modal_decline_${orderId}`);
    if (modalBtn) {
        modalBtn.disabled = true;
        modalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
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
                showToast(data.message || 'Order rejected and inventory stock restored.', true);
            }
            await loadAdminOrders();
            if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(orderId)) {
                openOrderModal(orderId);
            }
        } else {
            alert(data.message || 'Failed to reject order');
            if (modalBtn) {
                modalBtn.disabled = false;
                modalBtn.innerHTML = '<i class="fas fa-times-circle"></i> Reject Payment';
            }
        }
    } catch (err) {
        console.error("Payment decline error:", err);
        alert('Server communication error while declining payment.');
        if (modalBtn) {
            modalBtn.disabled = false;
            modalBtn.innerHTML = '<i class="fas fa-times-circle"></i> Reject Payment';
        }
    }
}
window.declineOrderPayment = declineOrderPayment;

// 3. Handle Mark Completed (with customer confirmation check)
async function handleAdminMarkCompleted(orderId) {
    const order = allOrders.find(o => String(o.id || o._id) === String(orderId)) || selectedOrder;
    const isCustomerConfirmed = order && (order.customerConfirmed || order.customer_confirmed);

    if (!isCustomerConfirmed) {
        const proceed = confirm(
            "Customer has not yet confirmed receiving the delivery on the web.\n\n" +
            "Do you want to confirm delivery completion on the customer's behalf and mark this order completed?"
        );
        if (!proceed) return;

        // Admin confirms on customer behalf, passing customerConfirmed: true
        await updateOrderStatusDirect(orderId, 'completed', true);
    } else {
        await updateOrderStatusDirect(orderId, 'completed');
    }
}
window.handleAdminMarkCompleted = handleAdminMarkCompleted;

// 4. Direct Status Update via Action Buttons
async function updateOrderStatusDirect(orderId, newStatus, customerConfirmedFlag) {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/orders/${orderId}/status`) : `/api/orders/${orderId}/status`;
        const bodyPayload = { order_status: newStatus };
        if (customerConfirmedFlag !== undefined) {
            bodyPayload.customerConfirmed = customerConfirmedFlag;
        }

        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodyPayload)
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
window.updateOrderStatusDirect = updateOrderStatusDirect;

// 5. Cancel Order with stock restoration
async function cancelOrderDirect(orderId) {
    const order = allOrders.find(o => String(o.id || o._id) === String(orderId)) || selectedOrder;
    const items = order ? (order.orderItems || order.items || []) : [];
    const itemCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

    const confirmed = confirm(
        `Are you sure you want to cancel this order?\n\n` +
        `This will automatically return the ${itemCount} ordered item(s) back to inventory stock in PostgreSQL.`
    );
    if (!confirmed) return;

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/orders/${orderId}/cancel`) : `/api/orders/${orderId}/cancel`;
        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: 'Order cancelled by admin. Product items returned to stock.' })
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Order cancelled and stock inventory restored!', true);
            }
            await loadAdminOrders();
            if (selectedOrder && String(selectedOrder.id || selectedOrder._id) === String(orderId)) {
                openOrderModal(orderId);
            }
        } else {
            alert(data.message || 'Failed to cancel order');
        }
    } catch (err) {
        console.error("Cancel order error:", err);
        alert('Server communication error while cancelling order.');
    }
}
window.cancelOrderDirect = cancelOrderDirect;

// 6. Open Lightbox modal to view full resolution proof of payment screenshot
function openPaymentProofLightbox(orderId) {
    const order = allOrders.find(o => String(o.id || o._id) === String(orderId)) || selectedOrder;
    if (!order) return;

    const proof = order.paymentProof || order.payment_proof || '';
    const ref = order.paymentReference || order.payment_reference || order.referenceNumber || 'N/A';
    const orderNum = order.orderNumber || order.order_number || `ORD-${orderId}`;

    const imgEl = document.getElementById("lightbox_proof_img");
    const captionEl = document.getElementById("lightbox_proof_caption");
    const downloadBtn = document.getElementById("lightbox_download_btn");

    if (imgEl) imgEl.src = proof;
    if (captionEl) captionEl.textContent = `Order: ${orderNum} | Payment Reference: ${ref}`;
    if (downloadBtn) {
        downloadBtn.href = proof;
        downloadBtn.download = `payment-proof-${orderNum}.png`;
    }

    if (typeof openModal === 'function') openModal('payment_proof_lightbox_modal');
}
window.openPaymentProofLightbox = openPaymentProofLightbox;

// 7. Handle Screenshot of Proof of Payment Upload from Admin modal
async function handleAdminProofUpload(event, orderId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        alert('Image file size too large. Please select an image under 20MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result;
        const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
        if (!token) return;

        try {
            const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/orders/${orderId}/payment-proof`) : `/api/orders/${orderId}/payment-proof`;
            const res = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    paymentProof: base64Data
                })
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                if (typeof showToast === 'function') {
                    showToast('Proof of payment screenshot uploaded successfully!', true);
                }
                await loadAdminOrders();
                openOrderModal(orderId);
            } else {
                alert(data.message || 'Failed to upload payment proof');
            }
        } catch (err) {
            console.error("Proof upload error:", err);
            alert('Server communication error while uploading proof.');
        }
    };
    reader.readAsDataURL(file);
}
window.handleAdminProofUpload = handleAdminProofUpload;

// 8. Live Background Polling to keep Admin and Web synchronised in real time
let liveOrderPollInterval = null;
function startLiveOrderSync() {
    if (liveOrderPollInterval) clearInterval(liveOrderPollInterval);
    liveOrderPollInterval = setInterval(async () => {
        if (!document.hidden) {
            await silentRefreshOrders();
        }
    }, 6000);
}

// Background refresh without resetting UI scroll or modal
async function silentRefreshOrders() {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl("/api/orders") : "/api/orders";
        const res = await fetch(apiUrl, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.status === "success" && Array.isArray(data.data)) {
                allOrders = data.data;
                updateTabBadges();
                renderOrdersTable();

                // If modal is currently open, refresh selectedOrder in place
                if (selectedOrder) {
                    const fresh = allOrders.find(o => String(o.id || o._id) === String(selectedOrder.id || selectedOrder._id));
                    if (fresh) {
                        const statusChanged = (fresh.orderStatus || fresh.order_status) !== (selectedOrder.orderStatus || selectedOrder.order_status) ||
                                              (fresh.paymentStatus || fresh.payment_status) !== (selectedOrder.paymentStatus || selectedOrder.payment_status) ||
                                              (fresh.customerConfirmed || fresh.customer_confirmed) !== (selectedOrder.customerConfirmed || selectedOrder.customer_confirmed);
                        if (statusChanged) {
                            openOrderModal(fresh.id || fresh._id);
                        }
                    }
                }
            }
        }
    } catch (err) {
        // Silent catch for background polling
    }
}
window.silentRefreshOrders = silentRefreshOrders;

