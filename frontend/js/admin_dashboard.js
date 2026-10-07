/**
 * TaurOS Admin Panel - Dashboard Overview Controller
 * Loads real-time KPI metrics, pending order counts, recent transactions, and store summaries from GET /api/dashboard/summary.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardSummary();
    initDashboardAutoSKU();
});

async function loadDashboardSummary() {
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/dashboard/summary') : '/api/dashboard/summary';
        const res = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            if (typeof handleAdminSessionExpired === 'function') handleAdminSessionExpired();
            return;
        }

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            const summary = data.data;

            // 1. Metric Cards
            const salesEl = document.getElementById("dash_total_sales");
            const pendingEl = document.getElementById("dash_pending_orders");
            const lowStockEl = document.getElementById("dash_low_stock");
            const customersEl = document.getElementById("dash_total_customers");

            if (salesEl) {
                const totalRev = parseFloat(summary.revenue?.totalRevenue || 0);
                salesEl.textContent = `₱${totalRev.toLocaleString()}`;
            }

            if (pendingEl) {
                pendingEl.textContent = summary.orders?.pendingOrders ?? 0;
            }

            if (lowStockEl) {
                lowStockEl.textContent = summary.inventory?.lowStockProducts ?? 0;
            }

            if (customersEl) {
                customersEl.textContent = summary.users?.totalCustomers ?? 0;
            }

            // 2. Recent Transactions Table
            const recentTbody = document.getElementById("dash_recent_transactions_tbody");
            if (recentTbody && summary.recentOrders) {
                if (summary.recentOrders.length === 0) {
                    recentTbody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">
                                No recent orders recorded
                            </td>
                        </tr>
                    `;
                } else {
                    recentTbody.innerHTML = summary.recentOrders.map(order => {
                        const num = order.orderNumber || `ORD-${order.id}`;
                        const name = order.customerName || 'Customer';
                        const total = parseFloat(order.totalPrice || 0);
                        const status = order.orderStatus || 'pending';
                        const dateFormatted = formatDate(order.createdAt);

                        let pillClass = 'status_pending';
                        if (status === 'completed') pillClass = 'status_completed';
                        else if (status === 'processing') pillClass = 'status_paid';
                        else if (status === 'shipped') pillClass = 'status_in_progress';

                        return `
                            <tr>
                                <td class="cell_order_id">
                                    <a href="orders.html" style="color: inherit; text-decoration: none; font-weight: 700;">${num}</a>
                                </td>
                                <td class="cell_customer_name">${name}</td>
                                <td style="font-size: 12px; color: #64748b;">${dateFormatted}</td>
                                <td class="cell_amount" style="font-weight: 700; color: #0f172a;">₱${total.toLocaleString()}</td>
                                <td><span class="status_pill ${pillClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            // 3. Activity Timeline
            const activityList = document.getElementById("dash_activity_list");
            if (activityList) {
                if (!summary.recentOrders || summary.recentOrders.length === 0) {
                    activityList.innerHTML = `
                        <li class="activity_timeline_item" style="padding: 24px 16px; text-align: center; color: #94a3b8; font-size: 13px; list-style: none;">
                            <i class="fas fa-history" style="font-size: 24px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
                            No store orders or activity recorded in database yet
                        </li>
                    `;
                } else {
                    activityList.innerHTML = summary.recentOrders.map(o => {
                        const num = o.orderNumber || `ORD-${o.id}`;
                        const name = o.customerName || 'Customer';
                        const isPaid = (o.paymentStatus || '').toLowerCase() === 'paid';
                        const timeAgo = formatTimeAgo(o.createdAt);

                        return `
                            <li class="activity_timeline_item">
                                <div class="activity_icon_circle ${isPaid ? 'icon_theme_green' : 'icon_theme_blue'}">
                                    <i class="fas ${isPaid ? 'fa-circle-check' : 'fa-shopping-cart'}"></i>
                                </div>
                                <div class="activity_details">
                                    <span class="activity_text">Order <strong>${num}</strong> by ${name} (${o.orderStatus})</span>
                                    <span class="activity_time">${timeAgo}</span>
                                </div>
                            </li>
                        `;
                    }).join('');
                }
            }
        }
    } catch (err) {
        console.error("Dashboard summary load error:", err);
    }
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return 'Recently';
    try {
        const d = new Date(dateStr);
        const diffMs = Date.now() - d.getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    } catch (e) {
        return 'Recently';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Auto-SKU & Dashboard Add Product Controller
let dashboardAutoSKURefresh = null;

function initDashboardAutoSKU() {
    if (typeof attachAutoSKUGenerator === 'function') {
        dashboardAutoSKURefresh = attachAutoSKUGenerator({
            nameInputId: "dash_product_name",
            catInputId: "dash_product_category",
            skuInputId: "dash_product_sku",
            regenBtnId: "regen_dash_product_sku_btn"
        });
    }
}

function openDashboardAddProductModal() {
    if (typeof openModal === 'function') {
        openModal("add_product_modal");
    }
    const skuInput = document.getElementById("dash_product_sku");
    if (skuInput && (!skuInput.value || skuInput.value.trim() === '')) {
        const cat = document.getElementById("dash_product_category")?.value || "";
        const name = document.getElementById("dash_product_name")?.value || "";
        if (typeof generateAutoSKU === 'function') {
            skuInput.value = generateAutoSKU(cat, name);
        }
    }
}
window.openDashboardAddProductModal = openDashboardAddProductModal;

async function handleDashboardAddProduct(e) {
    e.preventDefault();

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) {
        alert("You must be logged in as an administrator.");
        return;
    }

    const name = (document.getElementById("dash_product_name")?.value || "").trim();
    const sku = (document.getElementById("dash_product_sku")?.value || "").trim();
    const category = document.getElementById("dash_product_category")?.value || "mountain_bikes";
    const price = parseFloat(document.getElementById("dash_product_price")?.value || 0);
    const stock = parseInt(document.getElementById("dash_product_stock")?.value || 0, 10);

    if (!name || price <= 0) {
        alert("Please provide a valid product name and price.");
        return;
    }

    const submitBtn = e.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl("/api/products") : "/api/products";
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: name,
                sku: sku || undefined,
                category: category,
                price: price,
                stock_quantity: stock,
                image_url: "/frontend/Pictures/placeholder.png"
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof closeModal === 'function') closeModal("add_product_modal");
            if (typeof showToast === 'function') showToast(`Product "${name}" added to catalog!`, true);
            e.target.reset();
            if (typeof dashboardAutoSKURefresh === 'function') {
                dashboardAutoSKURefresh(true);
            }
            await loadDashboardSummary();
        } else {
            alert(data.message || "Failed to add product");
        }
    } catch (err) {
        console.error("Dashboard create product error:", err);
        alert("Server error when adding product.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Product';
        }
    }
}
window.handleDashboardAddProduct = handleDashboardAddProduct;
