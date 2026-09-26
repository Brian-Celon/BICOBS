/* pos system unified scripts */

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initPosMain();
    initPosHistory();
});

/* live cashier clock */
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
        clockEl.textContent = hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

/* pos terminal and order side window logic */
function initPosMain() {
    const productGrid = document.getElementById('pos_product_grid');
    const orderItemsList = document.getElementById('order_items_list');
    if (!productGrid || !orderItemsList) return;

    let orderCart = [];
    let discountAmount = 0;

    const searchInput = document.getElementById('product_search_input');
    const filterBtns = document.querySelectorAll('.pill_filter_btn');
    const productCards = document.querySelectorAll('.pos_product_card');
    const countLabel = document.getElementById('products_count_label');

    const emptyState = document.getElementById('empty_order_state');
    const orderBadgeCount = document.getElementById('order_badge_count');
    const summarySubtotal = document.getElementById('summary_subtotal');
    const summaryTotal = document.getElementById('summary_total');
    const summaryItemCount = document.getElementById('summary_item_count');
    const btnCharge = document.getElementById('btn_charge_action');
    const btnClear = document.getElementById('btn_clear_order');

    let activeCategory = 'all';

    function filterProducts() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let visibleCount = 0;

        productCards.forEach(card => {
            const name = card.getAttribute('data-name').toLowerCase();
            const sku = card.getAttribute('data-sku').toLowerCase();
            const category = card.getAttribute('data-category').toLowerCase();

            const matchesCategory = (activeCategory === 'all' || category === activeCategory);
            const matchesQuery = (name.includes(query) || sku.includes(query) || category.includes(query));

            if (matchesCategory && matchesQuery) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (countLabel) {
            if (activeCategory === 'all' && query === '') {
                countLabel.textContent = `ALL PRODUCTS — ${visibleCount} ITEMS`;
            } else {
                countLabel.textContent = `FILTERED PRODUCTS — ${visibleCount} ITEMS`;
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            filterProducts();
        });
    });

    function formatCurrency(num) {
        return '₱' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderOrderPanel() {
        if (orderCart.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            orderItemsList.innerHTML = '';
            if (emptyState) orderItemsList.appendChild(emptyState);

            if (orderBadgeCount) orderBadgeCount.textContent = '0';
            if (summarySubtotal) summarySubtotal.textContent = '₱0.00';
            if (summaryTotal) summaryTotal.textContent = '₱0.00';
            if (summaryItemCount) summaryItemCount.textContent = '0 Items';
            if (btnCharge) {
                btnCharge.innerHTML = '<span>Charge ₱0.00</span>';
                btnCharge.disabled = true;
            }
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        orderItemsList.innerHTML = '';

        let totalQty = 0;
        let subtotal = 0;

        orderCart.forEach((item, index) => {
            totalQty += item.qty;
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;

            const itemCard = document.createElement('div');
            itemCard.className = 'order_item_card';
            itemCard.innerHTML = `
                <div class="order_item_top_row">
                    <span class="order_item_name">${item.name}</span>
                    <span class="order_item_price">${formatCurrency(itemTotal)}</span>
                </div>
                <div class="order_item_bottom_row">
                    <div class="qty_controls_group">
                        <span class="qty_label_text">QTY</span>
                        <button class="btn_qty_adjust" data-action="decrease" data-index="${index}" title="Decrease">&minus;</button>
                        <span class="item_qty_number">${item.qty}</span>
                        <button class="btn_qty_adjust" data-action="increase" data-index="${index}" title="Increase">&plus;</button>
                    </div>
                    <button class="btn_remove_item" data-action="remove" data-index="${index}">&times; Remove</button>
                </div>
            `;
            orderItemsList.appendChild(itemCard);
        });

        const grandTotal = Math.max(0, subtotal - discountAmount);

        if (orderBadgeCount) orderBadgeCount.textContent = totalQty;
        if (summarySubtotal) summarySubtotal.textContent = formatCurrency(subtotal);
        if (summaryTotal) summaryTotal.textContent = formatCurrency(grandTotal);
        if (summaryItemCount) summaryItemCount.textContent = `${totalQty} Item${totalQty > 1 ? 's' : ''}`;
        if (btnCharge) {
            btnCharge.innerHTML = `<span>Charge ${formatCurrency(grandTotal)}</span>`;
            btnCharge.disabled = false;
        }
    }

    orderItemsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const action = target.getAttribute('data-action');
        const index = parseInt(target.getAttribute('data-index'), 10);
        if (isNaN(index) || !orderCart[index]) return;

        if (action === 'increase') {
            orderCart[index].qty += 1;
        } else if (action === 'decrease') {
            orderCart[index].qty -= 1;
            if (orderCart[index].qty <= 0) {
                orderCart.splice(index, 1);
            }
        } else if (action === 'remove') {
            orderCart.splice(index, 1);
        }
        renderOrderPanel();
    });

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (orderCart.length === 0) return;
            orderCart = [];
            renderOrderPanel();
        });
    }

    productCards.forEach(card => {
        const btn = card.querySelector('.btn_add_to_cart');

        function addToCartHandler(e) {
            e.stopPropagation();
            const sku = card.getAttribute('data-sku');
            const name = card.getAttribute('data-name');
            const price = parseFloat(card.getAttribute('data-price') || '0');

            const existingItem = orderCart.find(item => item.sku === sku);
            if (existingItem) {
                existingItem.qty += 1;
            } else {
                orderCart.push({ sku, name, price, qty: 1 });
            }

            renderOrderPanel();

            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = '✓ Added';
                btn.style.backgroundColor = '#dcfce7';
                btn.style.color = '#16a34a';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                }, 600);
            }
        }

        if (btn) btn.addEventListener('click', addToCartHandler);
        card.addEventListener('click', addToCartHandler);
    });

    if (btnCharge) {
        btnCharge.addEventListener('click', () => {
            if (orderCart.length === 0) return;
            const totalText = summaryTotal ? summaryTotal.textContent : '';
            alert(`Sale processed successfully!\nTotal Charged: ${totalText}\nCashier: Russel Lu Caisido`);
            orderCart = [];
            renderOrderPanel();
        });
    }
}

/* pos transaction history search and calculation */
function initPosHistory() {
    const historyTable = document.getElementById('history_data_table');
    const searchInput = document.getElementById('history_search_input');
    const totalEl = document.getElementById('filtered_total_value');
    if (!historyTable || !searchInput) return;

    const rows = document.querySelectorAll('#history_tbody tr');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        let sum = 0;

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const match = text.includes(query);
            if (match) {
                row.style.display = '';
                sum += parseFloat(row.getAttribute('data-amount') || '0');
            } else {
                row.style.display = 'none';
            }
        });

        if (totalEl) {
            totalEl.textContent = '₱' + sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    });
}
