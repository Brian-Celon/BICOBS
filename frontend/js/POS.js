/* =============================================================================
   TAURUS BIKE SHOP - POINT OF SALE (POS) SYSTEM ENGINE
   Unified Frontend Logic for POS-home.html, POS-main.html, and POS-history.html
   Connected to live PostgreSQL (Supabase) Database REST APIs
   ============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initCashierHeader();

    // Initialize page-specific modules based on active DOM elements
    if (document.getElementById('pos_product_grid')) {
        initPosMain();
    }
    if (document.getElementById('history_data_table')) {
        initPosHistory();
    }
    if (document.getElementById('home_recent_tbody')) {
        initPosHome();
    }
});

/* =============================================================================
   1. LIVE CASHIER DIGITAL CLOCK & CASHIER SESSION
   ============================================================================= */
function initClock() {
    const clockEl = document.getElementById('clock_display');
    if (!clockEl) return;

    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? String(hours).padStart(2, '0') : '12';
        clockEl.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

function initCashierHeader() {
    // Default co-owner / cashier per Taurus meeting notes: Russel Lu Caisido
    const defaultCashier = 'Russel Lu Caisido';
    const cashierEls = document.querySelectorAll('.cashier_display_name, #cashier_name, #rcpt_cashier');
    cashierEls.forEach(el => {
        if (!el.textContent || el.textContent.trim() === 'Cashier' || el.textContent.includes('...')) {
            el.textContent = defaultCashier;
        }
    });
}

/* =============================================================================
   2. FORMATTING HELPERS
   ============================================================================= */
function formatCurrency(num) {
    const val = parseFloat(num) || 0;
    return '₱' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ', ' + d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return String(dateStr);
    }
}

/* =============================================================================
   3. POS TERMINAL COUNTER CHECKOUT ENGINE (POS-main.html)
   ============================================================================= */
function initPosMain() {
    const productGrid = document.getElementById('pos_product_grid');
    const orderItemsList = document.getElementById('order_items_list');
    if (!productGrid || !orderItemsList) return;

    // Component State
    let allProducts = [];
    let orderCart = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let currentDiscount = {
        type: 'none',
        code: '',
        amount: 0,
        note: ''
    };

    // Maintenance Service Presets (Workshop services sold at counter)
    const maintenancePresets = [
        { name: 'General Tune-Up', cost: 450, desc: 'Brake adjustment, derailleur tuning, chain lube, bolt check', icon: 'wrench' },
        { name: 'Hydraulic Brake Bleeding', cost: 350, desc: 'Mineral oil / DOT fluid flush & rotor degreasing', icon: 'disc' },
        { name: 'Drivetrain Deep Clean & Wax', cost: 500, desc: 'Ultrasonic chain soak, cassette scrubbing, realignment', icon: 'refresh' },
        { name: 'Wheel Truing & Tensioning', cost: 300, desc: 'Radial and lateral truing, spoke tension calibration', icon: 'circle' },
        { name: 'Tubeless Tire Conversion', cost: 400, desc: 'Rim tape sealing, valve install, sealant injection', icon: 'shield' },
        { name: 'Fork & Suspension Overhaul', cost: 1200, desc: 'Lower leg service, wiper seals, damper oil replacement', icon: 'sliders' }
    ];

    // DOM Elements
    const searchInput = document.getElementById('product_search_input');
    const filterBtns = document.querySelectorAll('.pill_filter_btn');
    const countLabel = document.getElementById('products_count_label');

    const emptyState = document.getElementById('empty_order_state');
    const orderBadgeCount = document.getElementById('order_badge_count');
    const summarySubtotal = document.getElementById('summary_subtotal');
    const summaryDiscountBtn = document.getElementById('summary_discount_btn');
    const summaryTotal = document.getElementById('summary_total');
    const summaryItemCount = document.getElementById('summary_item_count');
    const btnCharge = document.getElementById('btn_charge_action');
    const btnClear = document.getElementById('btn_clear_order');

    // Maintenance builder elements
    const posMaintSection = document.getElementById('pos_maintenance_section');
    const btnQuickMaint = document.getElementById('btn_quick_maint_action');
    const btnMaintCollapse = document.getElementById('btn_maint_collapse');
    const maintCollapseText = document.getElementById('maint_collapse_text');
    const maintServiceName = document.getElementById('maint_service_name');
    const maintTechSelect = document.getElementById('maint_technician_select');
    const maintTechCustom = document.getElementById('maint_technician_custom');
    const maintServiceCost = document.getElementById('maint_service_cost');
    const maintBikeDetails = document.getElementById('maint_bike_details');
    const maintServiceNotes = document.getElementById('maint_service_notes');
    const btnAddMaintToOrder = document.getElementById('btn_add_maint_to_order');

    // Discount modal elements
    const discountModal = document.getElementById('discount_modal_overlay');
    const btnCloseDiscount = document.getElementById('btn_close_discount_modal');
    const btnCancelDiscount = document.getElementById('btn_cancel_discount');
    const btnApplyDiscount = document.getElementById('btn_apply_discount');
    const tabPromoCode = document.getElementById('tab_promo_code');
    const tabCustomDiscount = document.getElementById('tab_custom_discount');
    const viewPromoCode = document.getElementById('view_promo_code');
    const viewCustomDiscount = document.getElementById('view_custom_discount');
    const discountCodeInput = document.getElementById('discount_code_input');
    const customDiscountValue = document.getElementById('custom_discount_value');
    const customDiscountReason = document.getElementById('custom_discount_reason');
    const promoPills = document.querySelectorAll('.btn_promo_sample');

    // Payment modal elements
    const paymentModal = document.getElementById('payment_modal_overlay');
    const btnClosePayment = document.getElementById('btn_close_payment_modal');
    const btnCancelPayment = document.getElementById('btn_cancel_payment');
    const btnConfirmPayment = document.getElementById('btn_confirm_payment');
    const payModalTotal = document.getElementById('pay_modal_total_amount');
    const payModalItemsCount = document.getElementById('pay_modal_items_count');
    const payCustomerName = document.getElementById('pay_customer_name');
    const payCustomerPhone = document.getElementById('pay_customer_phone');
    const tabMethodCash = document.getElementById('tab_method_cash');
    const tabMethodGcash = document.getElementById('tab_method_gcash');
    const viewPaymentCash = document.getElementById('view_payment_cash');
    const viewPaymentGcash = document.getElementById('view_payment_gcash');
    const tenderedInput = document.getElementById('tendered_amount_input');
    const changeDueDisplay = document.getElementById('change_due_display');
    const gcashRefInput = document.getElementById('gcash_ref_input');

    // Quick cash buttons
    const btnQuickExact = document.getElementById('btn_quick_exact');
    const btnQuickPlus100 = document.getElementById('btn_quick_plus100');
    const btnQuickPlus500 = document.getElementById('btn_quick_plus500');
    const btnQuickPlus1000 = document.getElementById('btn_quick_plus1000');

    // Receipt modal elements
    const receiptModal = document.getElementById('receipt_modal_overlay');
    const rcptTxnId = document.getElementById('rcpt_txn_id');
    const rcptInvId = document.getElementById('rcpt_inv_id');
    const rcptDateTime = document.getElementById('rcpt_date_time');
    const rcptCashier = document.getElementById('rcpt_cashier');
    const rcptCustomer = document.getElementById('rcpt_customer');
    const rcptMethodBadge = document.getElementById('rcpt_method_badge');
    const rcptItemsTbody = document.getElementById('rcpt_items_tbody');
    const rcptSubtotal = document.getElementById('rcpt_subtotal');
    const rcptDiscountRow = document.getElementById('rcpt_discount_row');
    const rcptDiscount = document.getElementById('rcpt_discount');
    const rcptGrandTotal = document.getElementById('rcpt_grand_total');
    const rcptTenderedRow = document.getElementById('rcpt_tendered_row');
    const rcptTenderedVal = document.getElementById('rcpt_tendered_val');
    const rcptChangeRow = document.getElementById('rcpt_change_row');
    const rcptChangeVal = document.getElementById('rcpt_change_val');
    const btnPrintReceipt = document.getElementById('btn_print_receipt');
    const btnDoneReceipt = document.getElementById('btn_done_receipt');

    let activePaymentMethod = 'cash'; // 'cash' or 'gcash'

    /* --- Fetch Products from Live PostgreSQL Database --- */
    async function loadProductsFromApi() {
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            allProducts = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            renderCatalogGrid();
        } catch (err) {
            console.error('[POS] Failed to fetch live products:', err);
            productGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px;">
                    <div style="color: #b91c1c; font-weight: 700; font-size: 15px;">Failed to load catalog from server</div>
                    <div style="color: #e11d48; font-size: 13px; margin: 6px 0 14px;">${escapeHtml(err.message)}</div>
                    <button id="btn_retry_fetch" style="padding: 8px 18px; background: #b91c1c; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Retry Connection</button>
                </div>
            `;
            const btnRetry = document.getElementById('btn_retry_fetch');
            if (btnRetry) btnRetry.addEventListener('click', loadProductsFromApi);
        }
    }

    /* --- Render Product Catalog Grid --- */
    function renderCatalogGrid() {
        productGrid.innerHTML = '';

        // If category is maintenance, show service cards
        if (activeCategory === 'maintenance') {
            renderMaintenanceServiceCards();
            return;
        }

        // Filter products by category & search
        const filtered = allProducts.filter(p => {
            const cat = (p.category || '').toLowerCase();
            const matchesCat = activeCategory === 'all' || 
                cat === activeCategory.toLowerCase() ||
                (activeCategory === 'built_bikes' && ['built_bikes', 'mountain_bikes', 'road_bikes', 'gravel_bikes'].includes(cat)) ||
                (activeCategory === 'cockpit' && ['cockpit', 'handle_bar', 'stem'].includes(cat)) ||
                (activeCategory === 'saddle' && ['saddle', 'handle_grip'].includes(cat));

            if (!matchesCat) return false;

            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (p.name || '').toLowerCase().includes(q) ||
                   (p.sku || '').toLowerCase().includes(q) ||
                   (p.category || '').toLowerCase().includes(q);
        });

        // Update count label
        if (countLabel) {
            countLabel.textContent = `${activeCategory.toUpperCase().replace('_', ' ')} — ${filtered.length} ITEMS`;
        }

        if (filtered.length === 0) {
            productGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--pos_text_muted);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom: 10px; opacity: 0.6;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <div style="font-weight: 700; font-size: 15px; color: var(--pos_text_dark);">No matching products found</div>
                    <div style="font-size: 13px; margin-top: 4px;">Try searching for another keyword or change category filter</div>
                </div>
            `;
            return;
        }

        filtered.forEach(p => {
            const card = document.createElement('div');
            card.className = 'pos_product_card';
            card.setAttribute('data-id', p.id);
            card.setAttribute('data-sku', p.sku || '');
            card.setAttribute('data-name', p.name);
            card.setAttribute('data-price', p.price);
            card.setAttribute('data-category', p.category || '');

            const stock = parseInt(p.stock_quantity || 0, 10);
            let stockHtml = '';
            let isOutOfStock = false;

            if (stock <= 0) {
                isOutOfStock = true;
                card.classList.add('out_of_stock');
                stockHtml = `<span class="stock_pill stock_out">Out of Stock</span>`;
            } else if (stock <= 5) {
                stockHtml = `<span class="stock_pill stock_low">Low: ${stock} left</span>`;
            } else {
                stockHtml = `<span class="stock_pill stock_in">${stock} in stock</span>`;
            }

            // Thumbnail or category icon
            let visualBoxHtml = '';
            if (p.image_url && p.image_url.trim()) {
                visualBoxHtml = `
                    <div class="product_visual_box">
                        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" class="product_visual_img" onerror="this.onerror=null; this.src='/frontend/Pictures/logo.png';" style="max-height: 80px; width: auto; object-fit: contain;">
                        <span class="product_category_badge">${escapeHtml((p.category || 'GEAR').toUpperCase().replace('_', ' '))}</span>
                    </div>
                `;
            } else {
                visualBoxHtml = `
                    <div class="product_visual_box">
                        <div class="product_category_icon" style="color: var(--pos_red);">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                        <span class="product_category_badge">${escapeHtml((p.category || 'PART').toUpperCase().replace('_', ' '))}</span>
                    </div>
                `;
            }

            card.innerHTML = `
                ${visualBoxHtml}
                <span class="product_sku_text">${escapeHtml(p.sku || `SKU-${p.id}`)}</span>
                <h3 class="product_title_text" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
                <div class="product_price_stock_row">
                    <span class="product_price_red">${formatCurrency(p.price)}</span>
                    ${stockHtml}
                </div>
                <button class="btn_add_to_cart" ${isOutOfStock ? 'disabled' : ''}>${isOutOfStock ? 'Sold Out' : '+ Add to Order'}</button>
            `;

            // Card click adds to cart
            card.addEventListener('click', () => {
                if (!isOutOfStock) {
                    addProductToCart(p);
                }
            });

            productGrid.appendChild(card);
        });
    }

    /* --- Render Quick Maintenance Services in Grid --- */
    function renderMaintenanceServiceCards() {
        if (countLabel) {
            countLabel.textContent = `WORKSHOP SERVICES — ${maintenancePresets.length} PRESETS`;
        }

        maintenancePresets.forEach((srv, idx) => {
            const card = document.createElement('div');
            card.className = 'pos_product_card card_service_item';
            card.innerHTML = `
                <div class="product_visual_box" style="background-color: #fff7ed;">
                    <div class="product_category_icon" style="color: #ea580c;">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    </div>
                    <span class="product_category_badge badge_cat_service">SERVICE</span>
                </div>
                <span class="product_sku_text">SRV-00${idx + 1}</span>
                <h3 class="product_title_text">${escapeHtml(srv.name)}</h3>
                <div style="font-size: 11px; color: var(--pos_text_muted); margin-bottom: 6px; line-height: 1.3;">${escapeHtml(srv.desc)}</div>
                <div class="product_price_stock_row">
                    <span class="product_price_red">${formatCurrency(srv.cost)}</span>
                    <span class="stock_pill stock_in">Service Ready</span>
                </div>
                <button class="btn_add_to_cart btn_service_pick">+ Add Service</button>
            `;

            card.addEventListener('click', () => {
                addServiceToCart({
                    name: srv.name,
                    price: srv.cost,
                    mechanic: 'Reynaldo Santos',
                    bikeDetails: 'Walk-in Bicycle',
                    serviceNotes: srv.desc
                });
            });

            productGrid.appendChild(card);
        });
    }

    /* --- Cart Management --- */
    function addProductToCart(product) {
        const availableStock = parseInt(product.stock_quantity || 0, 10);
        if (availableStock <= 0) return;

        const existing = orderCart.find(i => !i.isService && i.productId === product.id);
        if (existing) {
            if (existing.qty + 1 > availableStock) {
                alert(`Cannot add more units of "${product.name}". Only ${availableStock} in store inventory.`);
                return;
            }
            existing.qty += 1;
        } else {
            orderCart.push({
                id: 'prod_' + product.id,
                productId: product.id,
                name: product.name,
                price: parseFloat(product.price),
                qty: 1,
                isService: false,
                maxStock: availableStock
            });
        }
        renderOrderPanel();
    }

    function addServiceToCart(serviceData) {
        orderCart.push({
            id: 'srv_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            productId: null,
            name: serviceData.name,
            price: parseFloat(serviceData.price || 0),
            qty: 1,
            isService: true,
            mechanic: serviceData.mechanic || 'Reynaldo Santos',
            bikeDetails: serviceData.bikeDetails || '',
            serviceNotes: serviceData.serviceNotes || ''
        });
        renderOrderPanel();
    }

    function renderOrderPanel() {
        if (!orderItemsList) return;

        if (orderCart.length === 0) {
            orderItemsList.innerHTML = `
                <div class="empty_order_state" id="empty_order_state">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span class="empty_state_text">No items in current order</span>
                    <span class="empty_state_subtext">Click on products to add them</span>
                </div>
            `;
            if (orderBadgeCount) orderBadgeCount.textContent = '0';
            if (summarySubtotal) summarySubtotal.textContent = '₱0.00';
            if (summaryTotal) summaryTotal.textContent = '₱0.00';
            if (summaryItemCount) summaryItemCount.textContent = '0 Items';
            if (btnCharge) {
                btnCharge.disabled = true;
                btnCharge.textContent = 'Charge ₱0.00';
            }
            return;
        }

        orderItemsList.innerHTML = '';
        let subtotal = 0;
        let totalCount = 0;

        orderCart.forEach((item, index) => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            totalCount += item.qty;

            const itemCard = document.createElement('div');
            itemCard.className = item.isService ? 'order_item_card order_item_service' : 'order_item_card';

            let serviceDetailsHtml = '';
            if (item.isService) {
                serviceDetailsHtml = `
                    <div class="order_item_service_meta">
                        <span class="service_badge">🔧 SERVICE</span>
                        <span class="service_mechanic_tag">👤 ${escapeHtml(item.mechanic)}</span>
                        ${item.bikeDetails ? `<span class="service_bike_tag">🚲 ${escapeHtml(item.bikeDetails)}</span>` : ''}
                    </div>
                `;
            }

            itemCard.innerHTML = `
                <div class="order_item_top_row">
                    <div class="order_item_title_wrap">
                        <span class="order_item_name">${escapeHtml(item.name)}</span>
                        ${serviceDetailsHtml}
                    </div>
                    <span class="order_item_price">${formatCurrency(itemTotal)}</span>
                </div>
                <div class="order_item_bottom_row">
                    <div class="qty_controls_group">
                        <span class="qty_label_text">QTY:</span>
                        <button type="button" class="btn_qty_adjust btn_qty_minus" data-index="${index}">&minus;</button>
                        <span class="item_qty_number">${item.qty}</span>
                        <button type="button" class="btn_qty_adjust btn_qty_plus" data-index="${index}">&#43;</button>
                    </div>
                    <button type="button" class="btn_remove_item" data-index="${index}">Remove</button>
                </div>
            `;

            orderItemsList.appendChild(itemCard);
        });

        // Recalculate discount
        let calculatedDiscount = 0;
        if (currentDiscount.type === 'promo') {
            if (currentDiscount.code === 'TAURUS10') calculatedDiscount = subtotal * 0.10;
            else if (currentDiscount.code === 'VIP50') calculatedDiscount = 50;
            else if (currentDiscount.code === 'SAVE100') calculatedDiscount = 100;
            else calculatedDiscount = currentDiscount.amount || 0;
        } else if (currentDiscount.type === 'custom') {
            calculatedDiscount = currentDiscount.amount || 0;
        }

        calculatedDiscount = Math.min(calculatedDiscount, subtotal);
        const grandTotal = Math.max(0, subtotal - calculatedDiscount);

        // Update totals on side panel
        if (orderBadgeCount) orderBadgeCount.textContent = totalCount;
        if (summarySubtotal) summarySubtotal.textContent = formatCurrency(subtotal);
        if (summaryDiscountBtn) {
            if (calculatedDiscount > 0) {
                summaryDiscountBtn.textContent = `-${formatCurrency(calculatedDiscount)}`;
                summaryDiscountBtn.style.color = '#16a34a';
                summaryDiscountBtn.style.fontWeight = '700';
            } else {
                summaryDiscountBtn.textContent = 'Add Code';
                summaryDiscountBtn.style.color = 'var(--pos_red)';
            }
        }
        if (summaryItemCount) summaryItemCount.textContent = `${totalCount} Item${totalCount !== 1 ? 's' : ''}`;
        if (summaryTotal) summaryTotal.textContent = formatCurrency(grandTotal);
        if (btnCharge) {
            btnCharge.disabled = false;
            btnCharge.textContent = `Charge ${formatCurrency(grandTotal)}`;
        }

        // Add event listeners to qty adjust and remove buttons
        const minusBtns = orderItemsList.querySelectorAll('.btn_qty_minus');
        minusBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (orderCart[idx]) {
                    orderCart[idx].qty -= 1;
                    if (orderCart[idx].qty <= 0) {
                        orderCart.splice(idx, 1);
                    }
                    renderOrderPanel();
                }
            });
        });

        const plusBtns = orderItemsList.querySelectorAll('.btn_qty_plus');
        plusBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const item = orderCart[idx];
                if (item) {
                    if (!item.isService && item.maxStock && item.qty + 1 > item.maxStock) {
                        alert(`Cannot add more than ${item.maxStock} units for "${item.name}".`);
                        return;
                    }
                    item.qty += 1;
                    renderOrderPanel();
                }
            });
        });

        const removeBtns = orderItemsList.querySelectorAll('.btn_remove_item');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                orderCart.splice(idx, 1);
                renderOrderPanel();
            });
        });
    }

    // Clear cart listener
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (orderCart.length === 0) return;
            if (confirm('Are you sure you want to clear current order items?')) {
                orderCart = [];
                currentDiscount = { type: 'none', code: '', amount: 0, note: '' };
                renderOrderPanel();
            }
        });
    }

    // Category pills click listeners
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category') || 'all';
            renderCatalogGrid();
        });
    });

    // Product search input listener
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value.trim();
            renderCatalogGrid();
        });
    }

    /* --- Maintenance Form Collapse and Quick Service Builder --- */
    if (btnQuickMaint && posMaintSection) {
        btnQuickMaint.addEventListener('click', () => {
            posMaintSection.classList.toggle('expanded');
        });
    }

    if (btnMaintCollapse && posMaintSection) {
        btnMaintCollapse.addEventListener('click', () => {
            posMaintSection.classList.toggle('collapsed');
            if (maintCollapseText) {
                maintCollapseText.textContent = posMaintSection.classList.contains('collapsed') ? 'Show' : 'Hide';
            }
        });
    }

    // Preset pills click
    const presetPills = document.querySelectorAll('.maint_preset_pill:not(.btn_promo_sample)');
    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const srvName = pill.getAttribute('data-service') || pill.textContent.trim();
            const srvCost = pill.getAttribute('data-cost');
            if (maintServiceName) maintServiceName.value = srvName;
            if (maintServiceCost && srvCost) maintServiceCost.value = srvCost;
        });
    });

    if (maintTechSelect && maintTechCustom) {
        maintTechSelect.addEventListener('change', () => {
            if (maintTechSelect.value === 'custom') {
                maintTechCustom.style.display = 'block';
                maintTechCustom.focus();
            } else {
                maintTechCustom.style.display = 'none';
            }
        });
    }

    if (btnAddMaintToOrder) {
        btnAddMaintToOrder.addEventListener('click', () => {
            const name = (maintServiceName ? maintServiceName.value.trim() : '') || 'General Tune-Up';
            const cost = parseFloat(maintServiceCost ? maintServiceCost.value : 0) || 0;
            let tech = maintTechSelect ? maintTechSelect.value : 'Reynaldo Santos';
            if (tech === 'custom' && maintTechCustom && maintTechCustom.value.trim()) {
                tech = maintTechCustom.value.trim();
            }
            const bike = maintBikeDetails ? maintBikeDetails.value.trim() : '';
            const notes = maintServiceNotes ? maintServiceNotes.value.trim() : '';

            if (cost <= 0) {
                alert('Please enter a valid labor / service cost.');
                return;
            }

            addServiceToCart({
                name,
                price: cost,
                mechanic: tech,
                bikeDetails: bike,
                serviceNotes: notes
            });

            // Reset inputs
            if (maintServiceName) maintServiceName.value = '';
            if (maintServiceCost) maintServiceCost.value = '';
            if (maintBikeDetails) maintBikeDetails.value = '';
            if (maintServiceNotes) maintServiceNotes.value = '';
        });
    }

    /* --- Discount Settings Modal --- */
    if (summaryDiscountBtn && discountModal) {
        summaryDiscountBtn.addEventListener('click', () => {
            if (orderCart.length === 0) {
                alert('Add items to order before applying discounts.');
                return;
            }
            discountModal.classList.add('active');
        });
    }

    if (btnCloseDiscount && discountModal) {
        btnCloseDiscount.addEventListener('click', () => discountModal.classList.remove('active'));
    }
    if (btnCancelDiscount && discountModal) {
        btnCancelDiscount.addEventListener('click', () => discountModal.classList.remove('active'));
    }

    // Toggle between promo code and custom cashier discount
    if (tabPromoCode && tabCustomDiscount) {
        tabPromoCode.addEventListener('click', () => {
            tabPromoCode.classList.add('active');
            tabCustomDiscount.classList.remove('active');
            if (viewPromoCode) viewPromoCode.style.display = 'block';
            if (viewCustomDiscount) viewCustomDiscount.style.display = 'none';
        });

        tabCustomDiscount.addEventListener('click', () => {
            tabCustomDiscount.classList.add('active');
            tabPromoCode.classList.remove('active');
            if (viewPromoCode) viewPromoCode.style.display = 'none';
            if (viewCustomDiscount) viewCustomDiscount.style.display = 'block';
        });
    }

    promoPills.forEach(pill => {
        pill.addEventListener('click', () => {
            if (discountCodeInput) discountCodeInput.value = pill.getAttribute('data-code');
        });
    });

    if (btnApplyDiscount && discountModal) {
        btnApplyDiscount.addEventListener('click', () => {
            const isPromoTab = tabPromoCode && tabPromoCode.classList.contains('active');
            let subtotal = orderCart.reduce((sum, i) => sum + (i.price * i.qty), 0);

            if (isPromoTab) {
                const code = (discountCodeInput ? discountCodeInput.value.trim().toUpperCase() : '');
                if (!code) {
                    currentDiscount = { type: 'none', code: '', amount: 0, note: '' };
                } else if (code === 'TAURUS10') {
                    currentDiscount = { type: 'promo', code: 'TAURUS10', amount: subtotal * 0.10, note: 'TAURUS10 (10% Off)' };
                } else if (code === 'VIP50') {
                    currentDiscount = { type: 'promo', code: 'VIP50', amount: 50, note: 'VIP50 (₱50 Off)' };
                } else if (code === 'SAVE100') {
                    currentDiscount = { type: 'promo', code: 'SAVE100', amount: 100, note: 'SAVE100 (₱100 Off)' };
                } else {
                    alert('Invalid promo code. Available: TAURUS10, VIP50, SAVE100');
                    return;
                }
            } else {
                // Cashier custom discount (Meeting requirement)
                const radioPercent = document.getElementById('radio_discount_percent');
                const isPercent = radioPercent ? radioPercent.checked : true;
                const rawVal = parseFloat(customDiscountValue ? customDiscountValue.value : 0) || 0;
                const reason = customDiscountReason ? customDiscountReason.value.trim() : 'Custom Cashier Discount';

                if (rawVal <= 0) {
                    alert('Please enter a valid discount value greater than 0.');
                    return;
                }

                let discountVal = 0;
                if (isPercent) {
                    discountVal = subtotal * (rawVal / 100);
                    currentDiscount = {
                        type: 'custom',
                        code: 'CUSTOM',
                        amount: discountVal,
                        note: `${rawVal}% Custom (${reason || 'Cashier Concession'})`
                    };
                } else {
                    discountVal = rawVal;
                    currentDiscount = {
                        type: 'custom',
                        code: 'CUSTOM',
                        amount: discountVal,
                        note: `₱${rawVal} Custom (${reason || 'Cashier Concession'})`
                    };
                }
            }

            discountModal.classList.remove('active');
            renderOrderPanel();
        });
    }

    /* --- Payment Settlement Modal & Cash Calculator --- */
    function getOrderTotals() {
        let subtotal = orderCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
        let discount = 0;
        if (currentDiscount.type === 'promo') {
            if (currentDiscount.code === 'TAURUS10') discount = subtotal * 0.10;
            else if (currentDiscount.code === 'VIP50') discount = 50;
            else if (currentDiscount.code === 'SAVE100') discount = 100;
        } else if (currentDiscount.type === 'custom') {
            discount = currentDiscount.amount || 0;
        }
        discount = Math.min(discount, subtotal);
        const grandTotal = Math.max(0, subtotal - discount);
        return { subtotal, discount, grandTotal };
    }

    function calculateChange() {
        const { grandTotal } = getOrderTotals();
        const tendered = parseFloat(tenderedInput ? tenderedInput.value : 0) || 0;
        const change = Math.max(0, tendered - grandTotal);
        if (changeDueDisplay) {
            changeDueDisplay.textContent = formatCurrency(change);
        }
        if (btnConfirmPayment) {
            if (activePaymentMethod === 'cash') {
                btnConfirmPayment.disabled = tendered < grandTotal;
            } else {
                btnConfirmPayment.disabled = false;
            }
        }
    }

    if (btnCharge && paymentModal) {
        btnCharge.addEventListener('click', () => {
            if (orderCart.length === 0) return;
            const { grandTotal } = getOrderTotals();
            const totalCount = orderCart.reduce((sum, i) => sum + i.qty, 0);

            if (payModalTotal) payModalTotal.textContent = formatCurrency(grandTotal);
            if (payModalItemsCount) payModalItemsCount.textContent = `${totalCount} item${totalCount !== 1 ? 's' : ''} in order`;

            // Reset tendered and change to exact
            if (tenderedInput) tenderedInput.value = grandTotal.toFixed(2);
            calculateChange();

            paymentModal.classList.add('active');
        });
    }

    if (btnClosePayment && paymentModal) {
        btnClosePayment.addEventListener('click', () => paymentModal.classList.remove('active'));
    }
    if (btnCancelPayment && paymentModal) {
        btnCancelPayment.addEventListener('click', () => paymentModal.classList.remove('active'));
    }

    if (tabMethodCash && tabMethodGcash) {
        tabMethodCash.addEventListener('click', () => {
            activePaymentMethod = 'cash';
            tabMethodCash.classList.add('active');
            tabMethodGcash.classList.remove('active');
            if (viewPaymentCash) viewPaymentCash.style.display = 'block';
            if (viewPaymentGcash) viewPaymentGcash.style.display = 'none';
            calculateChange();
        });

        tabMethodGcash.addEventListener('click', () => {
            activePaymentMethod = 'gcash';
            tabMethodGcash.classList.add('active');
            tabMethodCash.classList.remove('active');
            if (viewPaymentCash) viewPaymentCash.style.display = 'none';
            if (viewPaymentGcash) viewPaymentGcash.style.display = 'block';
            if (btnConfirmPayment) btnConfirmPayment.disabled = false;
        });
    }

    if (tenderedInput) {
        tenderedInput.addEventListener('input', calculateChange);
    }

    // Quick cash buttons
    if (btnQuickExact) {
        btnQuickExact.addEventListener('click', () => {
            const { grandTotal } = getOrderTotals();
            if (tenderedInput) tenderedInput.value = grandTotal.toFixed(2);
            calculateChange();
        });
    }
    if (btnQuickPlus100) {
        btnQuickPlus100.addEventListener('click', () => {
            const current = parseFloat(tenderedInput ? tenderedInput.value : 0) || 0;
            if (tenderedInput) tenderedInput.value = (current + 100).toFixed(2);
            calculateChange();
        });
    }
    if (btnQuickPlus500) {
        btnQuickPlus500.addEventListener('click', () => {
            const current = parseFloat(tenderedInput ? tenderedInput.value : 0) || 0;
            if (tenderedInput) tenderedInput.value = (current + 500).toFixed(2);
            calculateChange();
        });
    }
    if (btnQuickPlus1000) {
        btnQuickPlus1000.addEventListener('click', () => {
            const current = parseFloat(tenderedInput ? tenderedInput.value : 0) || 0;
            if (tenderedInput) tenderedInput.value = (current + 1000).toFixed(2);
            calculateChange();
        });
    }

    /* --- Submit Walk-in Sale to POST /api/orders/pos --- */
    if (btnConfirmPayment) {
        btnConfirmPayment.addEventListener('click', async () => {
            if (orderCart.length === 0) return;
            const { subtotal, discount, grandTotal } = getOrderTotals();
            const tendered = parseFloat(tenderedInput ? tenderedInput.value : 0) || 0;
            const change = Math.max(0, tendered - grandTotal);
            const customerName = (payCustomerName ? payCustomerName.value.trim() : '') || 'Walk-in Customer';
            const customerPhone = payCustomerPhone ? payCustomerPhone.value.trim() : '';
            const gcashRef = gcashRefInput ? gcashRefInput.value.trim() : '';

            if (activePaymentMethod === 'cash' && tendered < grandTotal) {
                alert(`Amount tendered (₱${tendered}) is less than total due (₱${grandTotal}).`);
                return;
            }

            btnConfirmPayment.disabled = true;
            btnConfirmPayment.textContent = 'Processing Sale...';

            try {
                const payload = {
                    customerName,
                    customerPhone,
                    paymentMethod: activePaymentMethod,
                    amountTendered: activePaymentMethod === 'cash' ? tendered : grandTotal,
                    changeDue: activePaymentMethod === 'cash' ? change : 0,
                    paymentReference: gcashRef,
                    discountAmount: discount,
                    discountNote: currentDiscount.note || (discount > 0 ? 'Promo Discount' : ''),
                    notes: `Counter Checkout | Method: ${activePaymentMethod.toUpperCase()}`,
                    cashierName: 'Russel Lu Caisido',
                    orderItems: orderCart.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        price: item.price,
                        quantity: item.qty,
                        isService: item.isService,
                        mechanic: item.mechanic,
                        bikeDetails: item.bikeDetails,
                        serviceNotes: item.serviceNotes
                    }))
                };

                const res = await fetch('/api/orders/pos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const resData = await res.json();
                if (!res.ok) {
                    throw new Error(resData.message || 'Failed to process sale');
                }

                // Close settlement modal
                if (paymentModal) paymentModal.classList.remove('active');

                // Render Digital Receipt
                const orderData = resData.data.order;
                const invoiceNumber = resData.data.invoiceNumber;
                displayReceiptModal({
                    orderNumber: orderData.orderNumber || orderData.order_number,
                    invoiceNumber: invoiceNumber,
                    dateTime: new Date(),
                    cashier: 'Russel Lu Caisido',
                    customer: customerName,
                    paymentMethod: activePaymentMethod,
                    items: orderCart,
                    subtotal: subtotal,
                    discount: discount,
                    discountNote: currentDiscount.note,
                    grandTotal: grandTotal,
                    tendered: activePaymentMethod === 'cash' ? tendered : grandTotal,
                    change: activePaymentMethod === 'cash' ? change : 0
                });

                // Clear current transaction state
                orderCart = [];
                currentDiscount = { type: 'none', code: '', amount: 0, note: '' };
                renderOrderPanel();

                // Reload products in catalog to reflect newly deducted inventory in PostgreSQL
                loadProductsFromApi();

            } catch (err) {
                console.error('[POS Checkout Error]:', err);
                alert(`Error completing sale: ${err.message}`);
            } finally {
                btnConfirmPayment.disabled = false;
                btnConfirmPayment.textContent = 'Complete & Print Receipt';
            }
        });
    }

    /* --- Receipt Modal Generator --- */
    function displayReceiptModal(rcpt) {
        if (!receiptModal) return;

        if (rcptTxnId) rcptTxnId.textContent = rcpt.orderNumber || 'ORD-POS-001';
        if (rcptInvId) rcptInvId.textContent = rcpt.invoiceNumber || 'INV-POS-001';
        if (rcptDateTime) rcptDateTime.textContent = formatDateTime(rcpt.dateTime);
        if (rcptCashier) rcptCashier.textContent = rcpt.cashier || 'Russel Lu Caisido';
        if (rcptCustomer) rcptCustomer.textContent = rcpt.customer || 'Walk-in Customer';
        if (rcptMethodBadge) {
            rcptMethodBadge.textContent = rcpt.paymentMethod.toUpperCase();
            rcptMethodBadge.className = rcpt.paymentMethod.toLowerCase() === 'cash' ? 'badge_method_cash' : 'badge_method_gcash';
        }

        if (rcptItemsTbody) {
            rcptItemsTbody.innerHTML = '';
            rcpt.items.forEach(item => {
                const tr = document.createElement('tr');
                let desc = `<strong>${escapeHtml(item.name)}</strong>`;
                if (item.isService) {
                    desc += `
                        <div class="receipt_service_subtext">
                            🔧 <em>Mechanic:</em> <strong>${escapeHtml(item.mechanic)}</strong>
                            ${item.bikeDetails ? ` &bull; 🚲 ${escapeHtml(item.bikeDetails)}` : ''}
                        </div>
                    `;
                }
                tr.innerHTML = `
                    <td>${desc}</td>
                    <td style="text-align: center;">${item.qty}</td>
                    <td style="text-align: right; font-weight: 700;">${formatCurrency(item.price * item.qty)}</td>
                `;
                rcptItemsTbody.appendChild(tr);
            });
        }

        if (rcptSubtotal) rcptSubtotal.textContent = formatCurrency(rcpt.subtotal);

        if (rcptDiscountRow && rcptDiscount) {
            if (rcpt.discount > 0) {
                rcptDiscountRow.style.display = 'flex';
                rcptDiscount.textContent = `-${formatCurrency(rcpt.discount)}`;
            } else {
                rcptDiscountRow.style.display = 'none';
            }
        }

        if (rcptGrandTotal) rcptGrandTotal.textContent = formatCurrency(rcpt.grandTotal);

        if (rcptTenderedRow && rcptTenderedVal) {
            if (rcpt.paymentMethod.toLowerCase() === 'cash') {
                rcptTenderedRow.style.display = 'flex';
                rcptTenderedVal.textContent = formatCurrency(rcpt.tendered);
            } else {
                rcptTenderedRow.style.display = 'none';
            }
        }

        if (rcptChangeRow && rcptChangeVal) {
            if (rcpt.paymentMethod.toLowerCase() === 'cash') {
                rcptChangeRow.style.display = 'flex';
                rcptChangeVal.textContent = formatCurrency(rcpt.change);
            } else {
                rcptChangeRow.style.display = 'none';
            }
        }

        receiptModal.classList.add('active');
    }

    if (btnPrintReceipt) {
        btnPrintReceipt.addEventListener('click', () => window.print());
    }

    if (btnDoneReceipt && receiptModal) {
        btnDoneReceipt.addEventListener('click', () => {
            receiptModal.classList.remove('active');
        });
    }

    // Initial load
    loadProductsFromApi();
}

/* =============================================================================
   4. TRANSACTION HISTORY & DIGITAL LOGBOOK (POS-history.html)
   ============================================================================= */
function initPosHistory() {
    const historyTable = document.getElementById('history_data_table');
    const searchInput = document.getElementById('history_search_input');
    const totalEl = document.getElementById('filtered_total_value');
    const tbody = document.getElementById('history_tbody');
    const receiptModal = document.getElementById('receipt_modal_overlay');
    if (!historyTable || !tbody) return;

    let allOrders = [];

    async function loadHistory() {
        try {
            const res = await fetch('/api/orders/pos');
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const json = await res.json();
            allOrders = Array.isArray(json.data) ? json.data : [];
            renderHistoryTable(allOrders);
        } catch (err) {
            console.error('[POS History Error]:', err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 32px; color: #b91c1c;">
                        Failed to load transaction history: ${escapeHtml(err.message)}
                    </td>
                </tr>
            `;
        }
    }

    function renderHistoryTable(ordersList) {
        tbody.innerHTML = '';
        let runningTotal = 0;

        if (ordersList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--pos_text_muted);">
                        No transaction records found matching criteria
                    </td>
                </tr>
            `;
            if (totalEl) totalEl.textContent = '₱0.00';
            return;
        }

        ordersList.forEach(order => {
            const amount = parseFloat(order.total_amount || order.totalPrice || 0);
            runningTotal += amount;

            const items = order.orderItems || order.items || [];
            const itemsSummary = items.map(i => `${i.name || i.product_name} (x${i.quantity})`).join(', ') || '1 transaction';

            const tr = document.createElement('tr');
            tr.setAttribute('data-id', order.id);
            tr.setAttribute('data-amount', amount);

            const method = (order.payment_method || order.paymentMethod || 'cash').toLowerCase();
            const methodBadge = method === 'cash' ?
                '<span class="badge_method_cash">Cash</span>' :
                '<span class="badge_method_gcash">GCash</span>';

            const status = (order.payment_status || order.paymentStatus || 'paid').toUpperCase();
            const statusBadge = `<span class="badge_status_paid">${escapeHtml(status)}</span>`;

            tr.innerHTML = `
                <td class="txn_id_cell">${escapeHtml(order.order_number || order.orderNumber)}</td>
                <td>${formatDateTime(order.created_at || order.createdAt)}</td>
                <td><strong>${escapeHtml(order.customer_name || order.customerName || 'Walk-in')}</strong></td>
                <td style="max-width: 280px; font-size: 12px; color: var(--pos_text_body);">${escapeHtml(itemsSummary)}</td>
                <td class="txn_total_cell">${formatCurrency(amount)}</td>
                <td>${methodBadge}</td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn_view_rcpt_row" style="padding: 4px 10px; font-size: 11.5px; font-weight: 700; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer;">
                        Receipt
                    </button>
                </td>
            `;

            // Open receipt modal for reprint
            const btnRcpt = tr.querySelector('.btn_view_rcpt_row');
            if (btnRcpt) {
                btnRcpt.addEventListener('click', () => {
                    displayReprintReceipt(order);
                });
            }

            tbody.appendChild(tr);
        });

        if (totalEl) {
            totalEl.textContent = formatCurrency(runningTotal);
        }
    }

    // Search filter
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            const filtered = allOrders.filter(o => {
                const num = (o.order_number || o.orderNumber || '').toLowerCase();
                const inv = (o.invoice_number || o.invoiceNumber || '').toLowerCase();
                const cust = (o.customer_name || o.customerName || '').toLowerCase();
                const method = (o.payment_method || o.paymentMethod || '').toLowerCase();
                const items = (o.orderItems || o.items || []).map(i => (i.name || i.product_name || '').toLowerCase()).join(' ');

                return num.includes(q) || inv.includes(q) || cust.includes(q) || method.includes(q) || items.includes(q);
            });
            renderHistoryTable(filtered);
        });
    }

    function displayReprintReceipt(order) {
        if (!receiptModal) return;
        const rcptTxnId = document.getElementById('rcpt_txn_id');
        const rcptInvId = document.getElementById('rcpt_inv_id');
        const rcptDateTime = document.getElementById('rcpt_date_time');
        const rcptCashier = document.getElementById('rcpt_cashier');
        const rcptCustomer = document.getElementById('rcpt_customer');
        const rcptMethodBadge = document.getElementById('rcpt_method_badge');
        const rcptItemsTbody = document.getElementById('rcpt_items_tbody');
        const rcptSubtotal = document.getElementById('rcpt_subtotal');
        const rcptGrandTotal = document.getElementById('rcpt_grand_total');
        const btnPrintReceipt = document.getElementById('btn_print_receipt');
        const btnDoneReceipt = document.getElementById('btn_done_receipt');

        if (rcptTxnId) rcptTxnId.textContent = order.order_number || order.orderNumber;
        if (rcptInvId) rcptInvId.textContent = order.invoice_number || order.invoiceNumber || 'INV-HIST';
        if (rcptDateTime) rcptDateTime.textContent = formatDateTime(order.created_at || order.createdAt);
        if (rcptCashier) rcptCashier.textContent = 'Russel Lu Caisido';
        if (rcptCustomer) rcptCustomer.textContent = order.customer_name || order.customerName || 'Walk-in Customer';
        if (rcptMethodBadge) {
            const m = (order.payment_method || order.paymentMethod || 'cash').toUpperCase();
            rcptMethodBadge.textContent = m;
        }

        if (rcptItemsTbody) {
            rcptItemsTbody.innerHTML = '';
            const items = order.orderItems || order.items || [];
            items.forEach(i => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${escapeHtml(i.name || i.product_name)}</strong></td>
                    <td style="text-align: center;">${i.quantity || 1}</td>
                    <td style="text-align: right; font-weight: 700;">${formatCurrency(i.subtotal || (i.price * i.quantity))}</td>
                `;
                rcptItemsTbody.appendChild(tr);
            });
        }

        const sub = parseFloat(order.subtotal || order.total_amount || 0);
        const tot = parseFloat(order.total_amount || order.totalPrice || 0);
        if (rcptSubtotal) rcptSubtotal.textContent = formatCurrency(sub);
        if (rcptGrandTotal) rcptGrandTotal.textContent = formatCurrency(tot);

        receiptModal.classList.add('active');

        if (btnPrintReceipt) {
            btnPrintReceipt.onclick = () => window.print();
        }
        if (btnDoneReceipt) {
            btnDoneReceipt.onclick = () => receiptModal.classList.remove('active');
        }
    }

    loadHistory();
}

/* =============================================================================
   5. POS TERMINAL DASHBOARD & METRICS SUMMARY (POS-home.html)
   ============================================================================= */
function initPosHome() {
    const summaryText = document.getElementById('home_daily_sales_text');
    const recentTbody = document.getElementById('home_recent_tbody');
    if (!summaryText || !recentTbody) return;

    async function loadDashboardSummary() {
        try {
            const res = await fetch('/api/orders/pos/summary');
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const json = await res.json();
            const data = json.data;

            // Update daily sales badge
            const todaySales = parseFloat(data.todaySales || 0);
            const todayCount = parseInt(data.todayOrdersCount || 0, 10);
            summaryText.textContent = `${formatCurrency(todaySales)} in sales today (${todayCount} orders)`;

            // Render 5 recent transactions
            recentTbody.innerHTML = '';
            const recent = data.recentOrders || [];

            if (recent.length === 0) {
                recentTbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 28px; color: var(--pos_text_muted);">
                            No transactions recorded yet today. Start with "New Transaction".
                        </td>
                    </tr>
                `;
                return;
            }

            recent.forEach(r => {
                const tr = document.createElement('tr');
                const method = (r.paymentMethod || 'cash').toLowerCase();
                const methodBadge = method === 'cash' ?
                    '<span class="badge_method_cash">Cash</span>' :
                    '<span class="badge_method_gcash">GCash</span>';

                tr.innerHTML = `
                    <td class="txn_id_cell">${escapeHtml(r.orderNumber)}</td>
                    <td>${formatDateTime(r.createdAt)}</td>
                    <td style="max-width: 240px; font-size: 12.5px;">${escapeHtml(r.itemsSummary)}</td>
                    <td class="txn_total_cell">${formatCurrency(r.totalAmount)}</td>
                    <td>${methodBadge}</td>
                `;
                recentTbody.appendChild(tr);
            });
        } catch (err) {
            console.error('[POS Home Summary Error]:', err);
            summaryText.textContent = 'Unable to connect to live summary';
            recentTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 24px; color: #b91c1c;">
                        Failed to load recent transactions from database.
                    </td>
                </tr>
            `;
        }
    }

    loadDashboardSummary();
}
