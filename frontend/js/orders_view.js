/**
 * BICOBS - Customer Order History Controller
 * Fetches real customer orders from backend API and populates dynamic order tracking table and details modal.
 */

document.addEventListener('DOMContentLoaded', () => {
    const table_body = document.getElementById('orders_table_body');
    const table_container = document.getElementById('orders_table_container');
    const status_filter = document.getElementById('order_status_filter');
    const no_orders_found = document.getElementById('no_orders_found');
    const no_orders_title = document.getElementById('no_orders_title');
    const no_orders_desc = document.getElementById('no_orders_desc');
    const btn_browse_shop = document.getElementById('btn_browse_shop_empty');
    const btn_reset_filter = document.getElementById('btn_reset_order_filter');

    // Details Modal Elements
    const details_modal = document.getElementById('order_details_modal');
    const close_modal_btn = document.getElementById('close_order_details_modal');
    const modal_order_id = document.getElementById('modal_order_id_head');
    const modal_order_date = document.getElementById('modal_order_date');

    let customerOrders = [];

    // Helper: Identify if an order originated from Point of Sale (POS)
    function isOrderFromPOS(order) {
        if (!order) return false;
        const num = (order.orderNumber || order.order_number || '').toUpperCase();
        if (num.includes('POS')) return true;
        const notes = order.notes || '';
        if (notes.includes('Counter Checkout') || notes.includes('Cashier:') || notes.includes('Shift:')) return true;
        return false;
    }

    function isOrderOutForDelivery(order) {
        if (!order) return false;
        const status = (order.orderStatus || order.order_status || '').toLowerCase();
        const deliveryType = (order.deliveryType || order.delivery_type || 'delivery').toLowerCase();
        if (deliveryType === 'pickup') {
            return status === 'ready_for_pickup' || status === 'out_for_delivery' || status === 'shipped';
        }
        return status === 'out_for_delivery' || status === 'shipped';
    }

    // Helper: Generate status pill badge HTML
    function getStatusPill(statusRaw) {
        const status = (statusRaw || 'pending').toLowerCase();
        if (status === 'completed' || status === 'delivered') {
            return `<span class="status_pill status_delivered" style="background:#e6f9ed; color:#137333;"><i class="fas fa-check-circle" style="font-size:10px;"></i> Completed</span>`;
        } else if (status === 'out_for_delivery' || status === 'shipped') {
            return `<span class="status_pill status_shipped" style="background:#ebf3ff; color:#1a73e8; font-weight:700;"><i class="fas fa-truck" style="font-size:10px;"></i> Out for Delivery</span>`;
        } else if (status === 'ready_for_pickup') {
            return `<span class="status_pill" style="background:#ede9fe; color:#7c3aed; font-weight:600;"><i class="fas fa-store" style="font-size:10px;"></i> Ready for Pickup</span>`;
        } else if (status === 'ready_for_deliver' || status === 'ready_for_delivery') {
            return `<span class="status_pill" style="background:#e0f2fe; color:#0284c7; font-weight:600;"><i class="fas fa-box" style="font-size:10px;"></i> Ready for Delivery</span>`;
        } else if (status === 'payment_confirmed') {
            return `<span class="status_pill" style="background:#dcfce7; color:#15803d; font-weight:700;"><i class="fas fa-check-circle" style="font-size:10px;"></i> Payment Confirmed</span>`;
        } else if (status === 'cancelled') {
            return `<span class="status_pill" style="background:#fee2e2; color:#dc2626;"><i class="fas fa-times-circle" style="font-size:10px;"></i> Cancelled</span>`;
        } else if (status === 'declined') {
            return `<span class="status_pill" style="background:#fee2e2; color:#dc2626; font-weight:700;"><i class="fas fa-times-circle" style="font-size:10px;"></i> Declined</span>`;
        } else if (status === 'processing') {
            return `<span class="status_pill status_processing" style="background:#fef7e6; color:#b87b00;"><i class="fas fa-cogs" style="font-size:10px;"></i> Processing</span>`;
        } else if (status === 'payment_confirmation') {
            return `<span class="status_pill" style="background:#fef3c7; color:#b45309; font-weight:600;"><i class="fas fa-receipt" style="font-size:10px;"></i> Payment Confirmation</span>`;
        } else {
            return `<span class="status_pill" style="background:#f1f5f9; color:#475569;"><i class="fas fa-clock" style="font-size:10px;"></i> Placed (Pending)</span>`;
        }
    }

    // Helper: Render 4-step Visual Timeline Tracker
    function renderTimeline(statusRaw, orderObj) {
        const container = document.getElementById('order_timeline_container');
        if (!container) return;

        const status = (statusRaw || 'pending').toLowerCase();

        if (status === 'cancelled') {
            container.innerHTML = `
                <div style="background:#fee2e2; border:1px solid #fecaca; color:#991b1b; padding:10px 14px; border-radius:8px; font-size:13px; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><strong>Order Cancelled:</strong> This order has been cancelled and inventory was returned to stock.</span>
                </div>
            `;
            return;
        }

        if (status === 'declined') {
            const reason = (orderObj && (orderObj.declineReason || orderObj.decline_reason)) || 'Payment has not been received';
            const orderNum = (orderObj && (orderObj.orderNumber || orderObj.order_number)) || '';
            const safeOrderNum = (orderNum || '').replace(/'/g, "\\'");
            const safeReasonText = (reason || 'Payment has not been received').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            container.innerHTML = `
                <div style="background:#fee2e2; border:1.5px solid #fecaca; color:#991b1b; padding:12px 14px; border-radius:8px; font-size:13px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; display:inline-flex; align-items:center; gap:6px; color:#b91c1c;">
                            <i class="fas fa-times-circle" style="font-size:16px;"></i> Order Declined
                        </span>
                        <button type="button" class="btn_decline_reason_trigger" data-ordernum="${orderNum}" data-reason="${safeReasonText}" onclick="window.openDeclineReasonModal('${safeOrderNum}', '${safeReasonText}'); event.stopPropagation();" style="background:#dc2626; color:#ffffff; border:none; border-radius:5px; padding:4px 10px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:background 0.15s ease;" onmouseover="this.style.background='#b91c1c';" onmouseout="this.style.background='#dc2626';">
                            <i class="fas fa-info-circle"></i> View Reason
                        </button>
                    </div>
                    <div style="color:#7f1d1d; font-size:12.5px; line-height:1.4;">
                        Reason: <strong>${reason}</strong>. The store admin has reviewed and declined this order.
                    </div>
                </div>
            `;
            return;
        }

        const steps = [
            { key: 'pending', label: '1. Placed' },
            { key: 'processing', label: '2. Processing' },
            { key: 'shipped', label: '3. Shipped / Ready' },
            { key: 'completed', label: '4. Completed' }
        ];

        let activeIdx = 0;
        if (status === 'processing') activeIdx = 1;
        else if (status === 'shipped' || status === 'ready_for_pickup') activeIdx = 2;
        else if (status === 'completed' || status === 'delivered') activeIdx = 3;

        let stepsHTML = '';
        steps.forEach((step, idx) => {
            const isDone = idx < activeIdx;
            const isCurrent = idx === activeIdx;

            const circleBg = isDone ? '#16a34a' : (isCurrent ? '#8b1e28' : '#e2e8f0');
            const circleColor = (isDone || isCurrent) ? '#ffffff' : '#64748b';
            const icon = isDone ? '✓' : (idx + 1);
            const textColor = isCurrent ? '#8b1e28' : (isDone ? '#16a34a' : '#64748b');
            const fontWeight = isCurrent ? '700' : '600';

            stepsHTML += `
                <div style="flex:1; text-align:center; position:relative;">
                    <div style="width:28px; height:28px; border-radius:50%; background:${circleBg}; color:${circleColor}; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; margin-bottom:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                        ${icon}
                    </div>
                    <div style="font-size:11px; color:${textColor}; font-weight:${fontWeight};">${step.label}</div>
                </div>
            `;
        });

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; background:#ffffff; padding:12px 8px; border-radius:8px; border:1px solid #e2e8f0;">
                ${stepsHTML}
            </div>
        `;
    }

    // Fetch orders from API
    async function loadMyOrders() {
        const token = localStorage.getItem('bicobs_token') || localStorage.getItem('token');
        if (!token) {
            if (no_orders_found) no_orders_found.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/api/orders/myorders', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.status === 401 && window.BICOBS_Auth) {
                window.BICOBS_Auth.clearAuth();
                window.BICOBS_Auth.showLoginModal({
                    message: 'Your session has expired. Please sign in to view your orders',
                    onSuccess: () => {
                        loadMyOrders();
                    }
                });
                return;
            }

            if (!res.ok) return;
            const data = await res.json();

            if (data.status === 'success' && Array.isArray(data.data)) {
                customerOrders = data.data;
                applyOrdersFilter();
            }
        } catch (e) {
            console.warn('Could not load orders from API:', e);
        }
    }

    // Pagination State for My Orders (10 orders per page)
    const items_per_page = 10;
    let current_page = 1;
    let current_order_list = [];

    const pagination_container = document.getElementById('orders_pagination_container');
    const pagination_info = document.getElementById('orders_pagination_info');
    const pagination_controls = document.getElementById('orders_pagination_controls');

    function renderOrdersTable(orders) {
        if (!table_body) return;
        current_order_list = orders || [];

        if (current_order_list.length === 0) {
            table_body.innerHTML = '';
            if (table_container) table_container.style.display = 'none';
            if (pagination_container) pagination_container.style.display = 'none';

            if (no_orders_found) {
                no_orders_found.style.display = 'block';
                const hasExistingOrders = Array.isArray(customerOrders) && customerOrders.length > 0;
                if (hasExistingOrders) {
                    const selectedLabel = (status_filter && status_filter.options[status_filter.selectedIndex])
                        ? status_filter.options[status_filter.selectedIndex].text
                        : 'selected filter';
                    if (no_orders_title) no_orders_title.textContent = 'No orders match this status';
                    if (no_orders_desc) no_orders_desc.textContent = `You have no orders currently marked as "${selectedLabel}".`;
                    if (btn_browse_shop) btn_browse_shop.style.display = 'none';
                    if (btn_reset_filter) btn_reset_filter.style.display = 'inline-flex';
                } else {
                    if (no_orders_title) no_orders_title.textContent = 'No orders found yet';
                    if (no_orders_desc) no_orders_desc.textContent = 'When you place orders in our shop, their tracking status will appear right here.';
                    if (btn_browse_shop) btn_browse_shop.style.display = 'inline-flex';
                    if (btn_reset_filter) btn_reset_filter.style.display = 'none';
                }
            }
            return;
        }

        if (table_container) table_container.style.display = '';
        if (no_orders_found) no_orders_found.style.display = 'none';

        renderOrdersPage(1);
    }

    function renderOrdersPage(page) {
        current_page = page;
        table_body.innerHTML = '';

        const totalItems = current_order_list.length;
        const totalPages = Math.ceil(totalItems / items_per_page);
        const startIdx = (current_page - 1) * items_per_page;
        const endIdx = Math.min(startIdx + items_per_page, totalItems);
        const pageOrders = current_order_list.slice(startIdx, endIdx);

        pageOrders.forEach(order => {
            const tr = document.createElement('tr');
            const orderIdText = order.orderNumber || `#${order._id.slice(-7).toUpperCase()}`;
            const invoiceText = order.invoiceNumber || 'Pending';
            const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
            const itemsSummary = (order.orderItems || []).map(i => `${i.name} (x${i.quantity})`).join(', ');
            const status = (order.orderStatus || 'pending').toLowerCase();
            const totalPrice = (order.totalPrice || order.total_amount || 0).toLocaleString();
            const statusPill = getStatusPill(status);
            const isDeclined = status === 'declined';
            const declineReason = order.declineReason || order.decline_reason || 'Payment has not been received';
            const safeOrderNum = (orderIdText || '').replace(/'/g, "\\'");
            const safeReasonText = (declineReason || 'Payment has not been received').replace(/'/g, "\\'").replace(/"/g, '&quot;');

            const statusCell = isDeclined ? `
                <div style="display:flex; flex-direction:column; align-items:flex-start; gap:4px;">
                    <span class="status_pill btn_decline_reason_trigger" data-ordernum="${orderIdText}" data-reason="${safeReasonText}" onclick="window.openDeclineReasonModal('${safeOrderNum}', '${safeReasonText}'); event.stopPropagation();" style="background:#fee2e2; color:#dc2626; font-weight:700; cursor:pointer;" title="Click to view why this order was declined">
                        <i class="fas fa-times-circle" style="font-size:10px;"></i> Declined
                    </span>
                    <button type="button" class="btn_decline_reason_trigger" data-ordernum="${orderIdText}" data-reason="${safeReasonText}" onclick="window.openDeclineReasonModal('${safeOrderNum}', '${safeReasonText}'); event.stopPropagation();" style="background:#fff1f2; border:1px solid #fca5a5; color:#be123c; border-radius:4px; padding:3px 8px; font-size:11px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 1px 2px rgba(0,0,0,0.06); transition:all 0.15s ease;" onmouseover="this.style.background='#ffe4e6'; this.style.borderColor='#f87171';" onmouseout="this.style.background='#fff1f2'; this.style.borderColor='#fca5a5';" title="Click to view decline reason">
                        <i class="fas fa-info-circle" style="color:#e11d48; font-size:11px;"></i> View Reason
                    </button>
                </div>
            ` : statusPill;

            const isPos = isOrderFromPOS(order);
            const isConfirmed = !!(order.customerConfirmed || order.customer_confirmed);
            const isOutForDelivery = isOrderOutForDelivery(order);
            const canConfirmReceipt = !isPos && !isConfirmed && isOutForDelivery && status !== 'cancelled' && status !== 'declined' && status !== 'completed' && status !== 'delivered';

            const confirmReceiptBtn = canConfirmReceipt ? `
                <button type="button" class="btn_quick_confirm_receipt" data-id="${order._id || order.id}" data-num="${orderIdText}" style="cursor:pointer; background:#16a34a; border:none; color:#ffffff; font-weight:700; padding:4px 8px; border-radius:4px; font-size:11px; display:inline-flex; align-items:center; gap:3px; margin-left:6px; box-shadow:0 1px 3px rgba(22,163,74,0.25); transition:background 0.2s;" onmouseover="this.style.background='#15803d';" onmouseout="this.style.background='#16a34a';" title="Confirm that you have received this order">
                    <i class="fas fa-check"></i> Received
                </button>
            ` : '';

            tr.setAttribute('data-status', status);
            tr.setAttribute('data-order-id', orderIdText);
            tr.setAttribute('data-date', orderDate);
            tr.setAttribute('data-items', itemsSummary);
            tr.setAttribute('data-total', `₱${totalPrice}`);

            tr.innerHTML = `
                <td><strong style="color:#8b1e28;">${orderIdText}</strong></td>
                <td><span style="font-family:monospace; font-size:12px; font-weight:600; color:#475569;">${invoiceText}</span></td>
                <td>${orderDate}</td>
                <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsSummary}">${itemsSummary}</td>
                <td>${statusCell}</td>
                <td><strong>₱${totalPrice}</strong></td>
                <td>
                    <div style="display:flex; align-items:center;">
                        <button type="button" class="btn_view_order_details action_link_btn" data-id="${order._id || order.id}" style="cursor:pointer; background:none; border:none; color:#8b1e28; font-weight:600; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-eye"></i> View Details</button>
                        ${confirmReceiptBtn}
                    </div>
                </td>
            `;

            table_body.appendChild(tr);
        });

        // Update Pagination Controls
        if (pagination_container) {
            if (totalItems > items_per_page) {
                pagination_container.style.display = 'flex';
            } else {
                pagination_container.style.display = 'none';
            }
        }

        if (pagination_info) {
            const isFiltered = (current_filter_status && current_filter_status !== 'all') || (current_search_query && current_search_query.length > 0);
            if (isFiltered && customerOrders.length > totalItems) {
                pagination_info.innerHTML = `Showing <span>${startIdx + 1}</span>–<span>${endIdx}</span> of <span>${totalItems}</span> orders <span style="color:#64748b; font-weight:normal; font-size:12px;">(Filtered from ${customerOrders.length})</span>`;
            } else {
                pagination_info.innerHTML = `Showing <span>${startIdx + 1}</span>–<span>${endIdx}</span> of <span>${totalItems}</span> orders`;
            }
        }

        if (pagination_controls) {
            pagination_controls.innerHTML = '';

            // Previous button
            const prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'pagination_btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.title = 'Previous page';
            prevBtn.disabled = current_page === 1;
            prevBtn.addEventListener('click', () => {
                if (current_page > 1) {
                    renderOrdersPage(current_page - 1);
                    table_body.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
            pagination_controls.appendChild(prevBtn);

            // Page numbers
            for (let p = 1; p <= totalPages; p++) {
                const pageBtn = document.createElement('button');
                pageBtn.type = 'button';
                pageBtn.className = `pagination_btn ${p === current_page ? 'active' : ''}`;
                pageBtn.textContent = p;
                pageBtn.title = `Page ${p}`;
                if (p === current_page) {
                    pageBtn.setAttribute('aria-current', 'page');
                }
                pageBtn.addEventListener('click', () => {
                    if (p !== current_page) {
                        renderOrdersPage(p);
                        table_body.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
                pagination_controls.appendChild(pageBtn);
            }

            // Next button
            const nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'pagination_btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.title = 'Next page';
            nextBtn.disabled = current_page === totalPages;
            nextBtn.addEventListener('click', () => {
                if (current_page < totalPages) {
                    renderOrdersPage(current_page + 1);
                    table_body.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
            pagination_controls.appendChild(nextBtn);
        }
    }

    // Filter & Live Search Engine
    let current_filter_status = 'all';
    let current_search_query = '';

    function matchesOrderStatus(order, filterVal) {
        if (!filterVal || filterVal === 'all') return true;
        const rawStatus = (order.orderStatus || order.order_status || 'pending').toLowerCase().trim();
        const f = filterVal.toLowerCase().trim();

        if (f === 'pending') {
            return rawStatus === 'pending' || rawStatus === 'placed' || !rawStatus;
        }
        if (f === 'payment_confirmation') {
            return rawStatus === 'payment_confirmation' || rawStatus === 'payment_confirm';
        }
        if (f === 'payment_confirmed') {
            return rawStatus === 'payment_confirmed';
        }
        if (f === 'processing') {
            return rawStatus === 'processing';
        }
        if (f === 'ready_for_pickup') {
            return rawStatus === 'ready_for_pickup';
        }
        if (f === 'ready_for_delivery' || f === 'ready_for_deliver') {
            return rawStatus === 'ready_for_delivery' || rawStatus === 'ready_for_deliver';
        }
        if (f === 'out_for_delivery' || f === 'shipped') {
            return rawStatus === 'out_for_delivery' || rawStatus === 'shipped';
        }
        if (f === 'completed' || f === 'delivered') {
            return rawStatus === 'completed' || rawStatus === 'delivered';
        }
        if (f === 'cancelled') {
            return rawStatus === 'cancelled';
        }
        if (f === 'declined') {
            return rawStatus === 'declined';
        }
        return rawStatus === f || rawStatus.includes(f);
    }

    function applyOrdersFilter() {
        let filtered = customerOrders || [];

        // 1. Status Filter
        if (current_filter_status && current_filter_status !== 'all') {
            filtered = filtered.filter(order => matchesOrderStatus(order, current_filter_status));
        }

        // 2. Search Query
        if (current_search_query) {
            filtered = filtered.filter(order => {
                const orderNum = (order.orderNumber || order.order_number || `#${(order._id || '').slice(-7)}`).toLowerCase();
                const invoice = (order.invoiceNumber || order.invoice_number || '').toLowerCase();
                const items = (order.orderItems || order.items || []).map(i => (i.name || '').toLowerCase()).join(' ');
                const status = (order.orderStatus || order.order_status || 'pending').toLowerCase();
                const total = String(order.totalPrice || order.total_amount || '');
                return orderNum.includes(current_search_query) ||
                       invoice.includes(current_search_query) ||
                       items.includes(current_search_query) ||
                       status.includes(current_search_query) ||
                       total.includes(current_search_query);
            });
        }

        renderOrdersTable(filtered);
    }

    // Status Filter dropdown change
    if (status_filter) {
        status_filter.addEventListener('change', (e) => {
            current_filter_status = (e.target.value || 'all').toLowerCase().trim();
            applyOrdersFilter();
        });
    }

    // Reset filter button listener on empty state
    if (btn_reset_filter) {
        btn_reset_filter.addEventListener('click', () => {
            if (status_filter) status_filter.value = 'all';
            current_filter_status = 'all';
            current_search_query = '';
            const searchInputs = document.querySelectorAll('.search_input, #header_search_input, #global_search_input');
            searchInputs.forEach(i => { i.value = ''; });
            applyOrdersFilter();
        });
    }

    // Header search inputs live listener
    const searchInputs = document.querySelectorAll('.search_input, #header_search_input, #global_search_input');
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            current_search_query = (e.target.value || '').toLowerCase().trim();
            applyOrdersFilter();
        });
    });

    // Global delegation hook for dashboard.js
    window.bicobsFilterOrders = (query) => {
        current_search_query = (query || '').toLowerCase().trim();
        applyOrdersFilter();
    };

    // Modal interactions
    if (table_body) {
        table_body.addEventListener('click', (e) => {
            const quickConfirmBtn = e.target.closest('.btn_quick_confirm_receipt');
            if (quickConfirmBtn) {
                e.preventDefault();
                e.stopPropagation();
                const oId = quickConfirmBtn.getAttribute('data-id');
                const oNum = quickConfirmBtn.getAttribute('data-num');
                window.confirmCustomerDelivery(oId, oNum);
                return;
            }

            const viewBtn = e.target.closest('.btn_view_order_details');
            if (!viewBtn) return;

            const orderId = viewBtn.getAttribute('data-id');
            const order = customerOrders.find(o => String(o._id || o.id) === String(orderId));

            if (order) {
                const orderIdText = order.orderNumber || `#${order._id.slice(-7).toUpperCase()}`;
                const invoiceText = order.invoiceNumber || 'Pending Invoice';

                if (modal_order_id) modal_order_id.textContent = orderIdText;
                if (modal_order_date) {
                    modal_order_date.textContent = new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }

                const invoiceNumEl = document.getElementById('modal_invoice_num');
                if (invoiceNumEl) invoiceNumEl.textContent = invoiceText;

                // Render Timeline Tracker
                renderTimeline(order.orderStatus || 'pending', order);

                // Render Delivery Details & Payment Info
                const addressEl = document.getElementById('modal_order_address');
                if (addressEl) {
                    const deliveryType = (order.deliveryType || 'delivery').toLowerCase();
                    const typeLabel = deliveryType === 'pickup' ? '🏪 In-Store Pickup' : '🚚 Delivery';
                    addressEl.innerHTML = `<strong>${typeLabel}</strong><br><span style="color:#64748b;">${order.deliveryAddress || 'No address provided'}</span>`;
                }

                const paymentEl = document.getElementById('modal_payment_method');
                if (paymentEl) {
                    const method = (order.paymentMethod || 'cash').toUpperCase();
                    const payStatus = (order.paymentStatus || 'pending').toUpperCase();
                    const statusColor = payStatus === 'PAID' ? '#16a34a' : '#ea580c';
                    const notesInfo = order.notes ? `<div style="font-size:11px; color:#64748b; margin-top:3px; font-weight:normal;">${order.notes}</div>` : '';
                    paymentEl.innerHTML = `<div><span>${method}</span> &bull; <span style="font-size:11px; color:${statusColor}; font-weight:700;">${payStatus}</span>${notesInfo}</div>`;
                }

                // Render Ordered Items List Breakdown
                const itemsListEl = document.getElementById('modal_order_items_list');
                if (itemsListEl) {
                    itemsListEl.innerHTML = '';
                    (order.orderItems || []).forEach(item => {
                        const li = document.createElement('li');
                        li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13px;';
                        li.innerHTML = `
                            <div>
                                <strong style="color:#0f172a;">${item.name}</strong>
                                <div style="color:#64748b; font-size:12px;">Qty: ${item.quantity} &times; ₱${(item.price || 0).toLocaleString()}</div>
                            </div>
                            <strong style="color:#0f172a;">₱${(item.subtotal || (item.price * item.quantity) || 0).toLocaleString()}</strong>
                        `;
                        itemsListEl.appendChild(li);
                    });
                }

                // Financial Breakdown
                const subtotalEl = document.getElementById('modal_subtotal_amt');
                if (subtotalEl) subtotalEl.textContent = `₱${(order.subtotal || 0).toLocaleString()}`;

                const shippingEl = document.getElementById('modal_shipping_amt');
                if (shippingEl) shippingEl.textContent = `₱${(order.shippingFee || 0).toLocaleString()}`;

                const totalEl = document.getElementById('modal_order_total');
                if (totalEl) totalEl.textContent = `₱${(order.totalPrice || order.total_amount || 0).toLocaleString()}`;

                // Status Badge
                const statusBadgeEl = document.getElementById('modal_order_status_badge');
                if (statusBadgeEl) {
                    statusBadgeEl.innerHTML = getStatusPill(order.orderStatus || 'pending');
                }

                // Proof of Payment Section
                const proofSectionEl = document.getElementById('modal_proof_section');
                const proofRefBadgeEl = document.getElementById('modal_proof_ref_badge');
                const proofContentEl = document.getElementById('modal_proof_content');
                const isPos = isOrderFromPOS(order);

                if (proofSectionEl) {
                    if (isPos) {
                        // POS orders do not need proof of payment!
                        proofSectionEl.style.display = 'none';
                    } else {
                        proofSectionEl.style.display = 'block';
                        const proofImg = order.paymentProof || order.payment_proof || '';
                        const refNum = order.paymentReference || order.payment_reference || '';

                        if (proofRefBadgeEl) {
                            if (refNum && refNum !== 'PROOF_UPLOADED' && refNum !== 'CASH_ON_PICKUP') {
                                proofRefBadgeEl.textContent = `Ref: ${refNum}`;
                            } else if (proofImg) {
                                proofRefBadgeEl.textContent = 'Proof Attached';
                            } else {
                                proofRefBadgeEl.textContent = 'Ref: Not provided';
                            }
                        }

                        if (proofContentEl) {
                            if (proofImg) {
                                proofContentEl.innerHTML = `
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                        <div style="cursor: pointer; position: relative;" onclick="window.openCustomerProofLightbox('${proofImg}')" title="Click to view full screenshot">
                                            <img src="${proofImg}" alt="Proof of Payment" style="max-height: 140px; max-width: 100%; border-radius: 6px; border: 1.5px solid #cbd5e1; object-fit: contain; box-shadow: 0 2px 6px rgba(0,0,0,0.06); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                            <span style="position: absolute; bottom: 6px; right: 6px; background: rgba(15,23,42,0.85); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 600;">
                                                <i class="fas fa-search-plus"></i> View Full
                                            </span>
                                        </div>
                                    </div>
                                `;
                            } else {
                                proofContentEl.innerHTML = `
                                    <div style="padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 12px; color: #64748b;">
                                        <i class="fas fa-info-circle"></i> No proof of payment screenshot uploaded for this order.
                                    </div>
                                `;
                            }
                        }
                    }
                }

                // Customer Delivery Confirmation Action Banner
                const confirmationSectionEl = document.getElementById('modal_customer_confirmation_section');
                if (confirmationSectionEl) {
                    const isConfirmed = !!(order.customerConfirmed || order.customer_confirmed);
                    const confirmedAt = order.customerConfirmedAt || order.customer_confirmed_at;

                    if (isPos) {
                        // POS orders do not need customer delivery confirmation on web!
                        confirmationSectionEl.innerHTML = '';
                    } else if (isConfirmed) {
                        const dateFormatted = confirmedAt ? new Date(confirmedAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Confirmed';
                        confirmationSectionEl.innerHTML = `
                            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                                <span style="color: #15803d; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-check-double" style="font-size: 16px; color: #16a34a;"></i> You Confirmed Receipt of this Order
                                </span>
                                <span style="font-size: 11px; color: #166534; font-weight: 600;">${dateFormatted}</span>
                            </div>
                        `;
                    } else if (status !== 'cancelled' && status !== 'declined' && status !== 'completed') {
                        const isOutForDelivery = isOrderOutForDelivery(order);
                        if (isOutForDelivery) {
                            confirmationSectionEl.innerHTML = `
                                <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-size: 12.5px; font-weight: 700; color: #92400e; display: flex; align-items: center; gap: 6px;">
                                            <i class="fas fa-box-open" style="color: #d97706;"></i> Delivery / Order Receipt Confirmation
                                        </span>
                                        <span style="font-size: 11px; color: #b45309; font-weight: 600; background: #fef3c7; padding: 2px 8px; border-radius: 4px;">Out for Delivery</span>
                                    </div>
                                    <p style="margin: 0; font-size: 12px; color: #78350f; line-height: 1.4;">
                                        Your order is on the way! Once you receive your items in good condition, confirm receipt below to complete your order.
                                    </p>
                                    <button type="button" class="btn_confirm_received_action" onclick="window.confirmCustomerDelivery('${order._id || order.id}', '${orderIdText}')" style="background: #16a34a; color: #ffffff; border: none; border-radius: 6px; padding: 10px 14px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 6px rgba(22,163,74,0.3); transition: background 0.2s;" onmouseover="this.style.background='#15803d';" onmouseout="this.style.background='#16a34a';">
                                        <i class="fas fa-check-circle"></i> Confirm Order Received
                                    </button>
                                </div>
                            `;
                        } else {
                            confirmationSectionEl.innerHTML = `
                                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-size: 12.5px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 6px;">
                                            <i class="fas fa-truck-loading" style="color: #64748b;"></i> Order Receipt Confirmation
                                        </span>
                                        <span style="font-size: 11px; color: #64748b; font-weight: 600; background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">Preparing Order</span>
                                    </div>
                                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">
                                        Receipt confirmation will unlock once your package is dispatched and marked <strong>Out for Delivery</strong>.
                                    </p>
                                    <button type="button" disabled style="background: #e2e8f0; color: #94a3b8; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 14px; font-size: 12.5px; font-weight: 600; cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <i class="fas fa-lock"></i> Confirm Order Received (Locked until Out for Delivery)
                                    </button>
                                </div>
                            `;
                        }
                    } else {
                        confirmationSectionEl.innerHTML = '';
                    }
                }

                if (details_modal) {
                    details_modal.classList.add('active');
                    details_modal.style.display = 'flex';
                }
            }
        });
    }

    if (close_modal_btn && details_modal) {
        close_modal_btn.addEventListener('click', () => {
            details_modal.classList.remove('active');
            details_modal.style.display = 'none';
        });
    }

    const cancelDetailsBtn = document.getElementById('close_order_details_btn');
    if (cancelDetailsBtn && details_modal) {
        cancelDetailsBtn.addEventListener('click', () => {
            details_modal.classList.remove('active');
            details_modal.style.display = 'none';
        });
    }

    // Decline reason modal handler
    function openDeclineReasonModal(orderNum, reason) {
        let modal = document.getElementById('decline_reason_modal');
        const finalNum = orderNum || 'Order';
        const finalReason = reason || 'Payment has not been received';

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'decline_reason_modal';
            modal.className = 'modal_overlay active';
            modal.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:99999; align-items:center; justify-content:center; padding:16px; opacity:1; visibility:visible; pointer-events:auto;';
            modal.innerHTML = `
                <div class="modal_container" style="max-width:440px; background:#ffffff; border-radius:12px; padding:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.25); width:100%; position:relative; text-align:center;">
                    <button type="button" class="modal_close_btn" onclick="window.closeDeclineReasonModal()" style="position:absolute; top:14px; right:14px; background:none; border:none; font-size:18px; color:#94a3b8; cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                    <div style="width:52px; height:52px; border-radius:50%; background:#fee2e2; color:#dc2626; display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 14px;">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <h3 style="margin:0 0 6px 0; color:#0f172a; font-size:18px; font-weight:700;">Order Declined</h3>
                    <p style="color:#64748b; font-size:13px; margin:0 0 16px 0;">Reference: <strong id="decline_modal_ordernum" style="color:#8b1e28;">${finalNum}</strong></p>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; text-align:left; margin-bottom:20px;">
                        <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:6px;">Reason for Decline</span>
                        <div style="display:flex; align-items:center; gap:8px; color:#b91c1c; font-weight:700; font-size:14px;">
                            <i class="fas fa-circle-xmark"></i>
                            <span id="decline_modal_reason">${finalReason}</span>
                        </div>
                        <p style="font-size:12px; color:#64748b; margin:10px 0 0 0; line-height:1.5;">
                            Your payment could not be verified by the Taurus Bike Store administrator. If you believe this is an error, please contact customer support or submit a new order.
                        </p>
                    </div>
                    <button type="button" id="ack_decline_reason_btn" onclick="window.closeDeclineReasonModal()" style="width:100%; padding:10px 16px; background:#8b1e28; color:#ffffff; border:none; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; transition:background 0.2s;">
                        Understood / Close
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) window.closeDeclineReasonModal();
            });
        } else {
            const numEl = document.getElementById('decline_modal_ordernum');
            const reasonEl = document.getElementById('decline_modal_reason');
            if (numEl) numEl.textContent = finalNum;
            if (reasonEl) reasonEl.textContent = finalReason;
            modal.classList.add('active');
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            modal.style.pointerEvents = 'auto';
        }
    }
    window.openDeclineReasonModal = openDeclineReasonModal;

    function closeDeclineReasonModal() {
        const modal = document.getElementById('decline_reason_modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            modal.style.pointerEvents = 'none';
        }
    }
    window.closeDeclineReasonModal = closeDeclineReasonModal;

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.btn_decline_reason_trigger');
        if (trigger) {
            e.preventDefault();
            e.stopPropagation();
            const num = trigger.getAttribute('data-ordernum') || '';
            const reason = trigger.getAttribute('data-reason') || 'Payment has not been received';
            openDeclineReasonModal(num, reason);
        }

        const closeBtn = e.target.closest('#close_decline_reason_modal_btn, #ack_decline_reason_btn');
        if (closeBtn) {
            e.preventDefault();
            closeDeclineReasonModal();
        }

        const modal = document.getElementById('decline_reason_modal');
        if (modal && e.target === modal) {
            closeDeclineReasonModal();
        }
    });

    async function confirmCustomerDelivery(orderId, orderNum) {
        const order = customerOrders.find(o => String(o._id || o.id) === String(orderId));
        if (order && !isOrderOutForDelivery(order)) {
            alert('⚠️ You cannot confirm receipt of this order yet because it is not yet out for delivery.');
            return;
        }

        const token = localStorage.getItem('bicobs_token') || localStorage.getItem('token');
        if (!token) {
            alert('Please sign in to confirm order receipt.');
            return;
        }

        const msg = orderNum ? `Did you receive order ${orderNum} and are you satisfied with the items?` : 'Confirm that you have received this order?';
        if (!confirm(msg)) return;

        try {
            const res = await fetch(`/api/orders/${orderId}/confirm-receipt`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                alert('Thank you! Your order has been marked as received and completed.');
                if (details_modal) {
                    details_modal.classList.remove('active');
                    details_modal.style.display = 'none';
                }
                await loadMyOrders();
            } else {
                alert(data.message || 'Could not confirm order receipt.');
            }
        } catch (err) {
            console.error('Confirm receipt error:', err);
            alert('Connection error. Please try again.');
        }
    }
    window.confirmCustomerDelivery = confirmCustomerDelivery;

    function openCustomerProofLightbox(imgUrl) {
        const modal = document.getElementById('customer_proof_lightbox_modal');
        const img = document.getElementById('customer_lightbox_img');
        if (modal && img) {
            img.src = imgUrl;
            modal.style.display = 'flex';
        }
    }
    window.openCustomerProofLightbox = openCustomerProofLightbox;

    function closeCustomerProofLightbox() {
        const modal = document.getElementById('customer_proof_lightbox_modal');
        if (modal) modal.style.display = 'none';
    }
    window.closeCustomerProofLightbox = closeCustomerProofLightbox;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDeclineReasonModal();
            closeCustomerProofLightbox();
        }
    });

    // Load on init
    loadMyOrders();
});
