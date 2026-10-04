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
            const shortId = `#${order._id.slice(-7).toUpperCase()}`;
            const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
            const itemsSummary = (order.orderItems || []).map(i => `${i.name} (x${i.quantity})`).join(', ');
            const status = (order.orderStatus || 'processing').toLowerCase();
            const totalPrice = (order.totalPrice || 0).toLocaleString();

            let statusPill = '';
            if (status === 'completed' || status === 'delivered') {
                statusPill = `<span class="status_pill status_delivered"><i class="fas fa-circle" style="font-size: 7px;"></i> Delivered</span>`;
            } else if (status === 'shipped' || status === 'ready_for_pickup') {
                statusPill = `<span class="status_pill status_shipped"><i class="fas fa-circle" style="font-size: 7px;"></i> ${status === 'shipped' ? 'Shipped' : 'Ready for Pickup'}</span>`;
            } else if (status === 'cancelled') {
                statusPill = `<span class="status_pill" style="background:#fee2e2; color:#dc2626;"><i class="fas fa-circle" style="font-size: 7px;"></i> Cancelled</span>`;
            } else {
                statusPill = `<span class="status_pill status_processing"><i class="fas fa-circle" style="font-size: 7px;"></i> Processing</span>`;
            }

            tr.setAttribute('data-status', status);
            tr.setAttribute('data-order-id', shortId);
            tr.setAttribute('data-date', orderDate);
            tr.setAttribute('data-items', itemsSummary);
            tr.setAttribute('data-total', `₱${totalPrice}`);

            tr.innerHTML = `
                <td><strong>${shortId}</strong></td>
                <td>${orderDate}</td>
                <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsSummary}">${itemsSummary}</td>
                <td>${statusPill}</td>
                <td><strong>₱${totalPrice}</strong></td>
                <td><button type="button" class="btn_view_order_details action_link_btn" data-id="${order._id}"><i class="fas fa-eye"></i> View Details</button></td>
            `;

            table_body.appendChild(tr);
        });
    }

    // Filter by status
    if (status_filter) {
        status_filter.addEventListener('change', (e) => {
            const filterVal = e.target.value.toLowerCase();
            if (filterVal === 'all') {
                renderOrdersTable(customerOrders);
            } else {
                const filtered = customerOrders.filter(o => (o.orderStatus || 'processing').toLowerCase().includes(filterVal));
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
            const order = customerOrders.find(o => o._id === orderId);

            if (order) {
                if (modal_order_id) modal_order_id.textContent = `#${order._id.slice(-7).toUpperCase()}`;
                if (modal_order_date) modal_order_date.textContent = new Date(order.createdAt).toLocaleDateString();
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

    // Load on init
    loadMyOrders();
});
