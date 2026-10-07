/**
 * BICOBS - Customer Order History Controller
 * Fetches real customer orders from backend API and populates dynamic order tracking table and details modal.
 */

document.addEventListener('DOMContentLoaded', () => {
    const table_body = document.getElementById('orders_table_body');
    const status_filter = document.getElementById('order_status_filter');
    const no_orders_found = document.getElementById('no_orders_found');

    // Details Modal Elements
    const details_modal = document.getElementById('order_details_modal');
    const close_modal_btn = document.getElementById('close_order_details_modal');
    const modal_order_id = document.getElementById('modal_order_id_head');
    const modal_order_date = document.getElementById('modal_order_date');

    let customerOrders = [];

    // Helper: Generate status pill badge HTML
    function getStatusPill(statusRaw) {
        const status = (statusRaw || 'pending').toLowerCase();
        if (status === 'completed' || status === 'delivered') {
            return `<span class="status_pill status_delivered" style="background:#e6f9ed; color:#137333;"><i class="fas fa-check-circle" style="font-size:10px;"></i> Completed</span>`;
        } else if (status === 'shipped' || status === 'ready_for_pickup') {
            const label = status === 'shipped' ? 'Out for Delivery' : 'Ready for Store Pickup';
            return `<span class="status_pill status_shipped" style="background:#ebf3ff; color:#1a73e8;"><i class="fas fa-truck" style="font-size:10px;"></i> ${label}</span>`;
        } else if (status === 'cancelled') {
            return `<span class="status_pill" style="background:#fee2e2; color:#dc2626;"><i class="fas fa-times-circle" style="font-size:10px;"></i> Cancelled</span>`;
        } else if (status === 'declined') {
            return `<span class="status_pill" style="background:#fee2e2; color:#dc2626; font-weight:700;"><i class="fas fa-times-circle" style="font-size:10px;"></i> Declined</span>`;
        } else if (status === 'processing') {
            return `<span class="status_pill status_processing" style="background:#fef7e6; color:#b87b00;"><i class="fas fa-cogs" style="font-size:10px;"></i> Processing</span>`;
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
            container.innerHTML = `
                <div style="background:#fee2e2; border:1.5px solid #fecaca; color:#991b1b; padding:12px 14px; border-radius:8px; font-size:13px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; display:inline-flex; align-items:center; gap:6px; color:#b91c1c;">
                            <i class="fas fa-times-circle" style="font-size:16px;"></i> Order Declined
                        </span>
                        <button type="button" class="btn_decline_reason_trigger" data-ordernum="${orderNum}" data-reason="${reason}" style="background:#dc2626; color:#ffffff; border:none; border-radius:5px; padding:4px 10px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
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
                renderOrdersTable(customerOrders);
            }
        } catch (e) {
            console.warn('Could not load orders from API:', e);
        }
    }

    function renderOrdersTable(orders) {
        if (!table_body) return;
        table_body.innerHTML = '';

        if (orders.length === 0) {
            if (no_orders_found) no_orders_found.style.display = 'block';
            return;
        }

        if (no_orders_found) no_orders_found.style.display = 'none';

        orders.forEach(order => {
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

            const statusCell = isDeclined ? `
                <div>
                    ${statusPill}
                    <div style="margin-top: 5px;">
                        <button type="button" class="btn_decline_reason_trigger" data-ordernum="${orderIdText}" data-reason="${declineReason}" style="background:#ffffff; border:1px solid #fca5a5; color:#dc2626; border-radius:4px; padding:2px 7px; font-size:11px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                            <i class="fas fa-info-circle"></i> View Reason
                        </button>
                    </div>
                </div>
            ` : statusPill;

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
                <td><button type="button" class="btn_view_order_details action_link_btn" data-id="${order._id}" style="cursor:pointer; background:none; border:none; color:#8b1e28; font-weight:600; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-eye"></i> View Details</button></td>
            `;

            table_body.appendChild(tr);
        });
    }

    // Filter by status dropdown
    if (status_filter) {
        status_filter.addEventListener('change', (e) => {
            const filterVal = e.target.value.toLowerCase();
            if (filterVal === 'all') {
                renderOrdersTable(customerOrders);
            } else {
                const filtered = customerOrders.filter(o => {
                    const st = (o.orderStatus || 'pending').toLowerCase();
                    if (filterVal === 'processing') return st === 'processing';
                    if (filterVal === 'shipped') return st === 'shipped' || st === 'ready_for_pickup';
                    if (filterVal === 'delivered') return st === 'delivered' || st === 'completed';
                    if (filterVal === 'declined') return st === 'declined';
                    return st.includes(filterVal);
                });
                renderOrdersTable(filtered);
            }
        });
    }

    // Modal interactions
    if (table_body) {
        table_body.addEventListener('click', (e) => {
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
        const modal = document.getElementById('decline_reason_modal');
        const numEl = document.getElementById('decline_modal_ordernum');
        const reasonEl = document.getElementById('decline_modal_reason');

        const finalNum = orderNum || 'Order';
        const finalReason = reason || 'Payment has not been received';

        if (numEl) numEl.textContent = finalNum;
        if (reasonEl) reasonEl.textContent = finalReason;

        if (modal) {
            modal.style.display = 'flex';
        } else {
            alert(`Order: ${finalNum}\nStatus: Declined\nReason: ${finalReason}\n\nYour payment has not been received or verified by the store admin.`);
        }
    }
    window.openDeclineReasonModal = openDeclineReasonModal;

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.btn_decline_reason_trigger');
        if (trigger) {
            e.stopPropagation();
            const num = trigger.getAttribute('data-ordernum') || '';
            const reason = trigger.getAttribute('data-reason') || 'Payment has not been received';
            openDeclineReasonModal(num, reason);
        }

        const closeBtn = e.target.closest('#close_decline_reason_modal_btn, #ack_decline_reason_btn');
        if (closeBtn) {
            const modal = document.getElementById('decline_reason_modal');
            if (modal) modal.style.display = 'none';
        }
    });

    // Load on init
    loadMyOrders();
});
