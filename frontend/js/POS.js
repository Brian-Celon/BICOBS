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
    const countLabel = document.getElementById('products_count_label');

    const emptyState = document.getElementById('empty_order_state');
    const orderBadgeCount = document.getElementById('order_badge_count');
    const summarySubtotal = document.getElementById('summary_subtotal');
    const summaryTotal = document.getElementById('summary_total');
    const summaryItemCount = document.getElementById('summary_item_count');
    const btnCharge = document.getElementById('btn_charge_action');
    const btnClear = document.getElementById('btn_clear_order');

    /* maintenance section elements */
    const posMaintSection = document.getElementById('pos_maintenance_section');
    const btnQuickMaint = document.getElementById('btn_quick_maint_action');
    const btnMaintCollapse = document.getElementById('btn_maint_collapse');
    const maintCollapseText = document.getElementById('maint_collapse_text');
    const presetPills = document.querySelectorAll('.maint_preset_pill:not(.btn_promo_sample)');
    const maintServiceName = document.getElementById('maint_service_name');
    const maintTechSelect = document.getElementById('maint_technician_select');
    const maintTechCustom = document.getElementById('maint_technician_custom');
    const maintServiceCost = document.getElementById('maint_service_cost');
    const maintBikeDetails = document.getElementById('maint_bike_details');
    const maintServiceNotes = document.getElementById('maint_service_notes');
    const btnAddMaintToOrder = document.getElementById('btn_add_maint_to_order');

    /* discount modal elements */
    const discountModal = document.getElementById('discount_modal_overlay');
    const discountBtn = document.getElementById('summary_discount_btn');
    const btnCloseDiscount = document.getElementById('btn_close_discount_modal');
    const btnCancelDiscount = document.getElementById('btn_cancel_discount');
    const btnApplyDiscount = document.getElementById('btn_apply_discount');
    const discountCodeInput = document.getElementById('discount_code_input');
    const promoPills = document.querySelectorAll('.btn_promo_sample');

    /* receipt modal elements */
    const receiptModal = document.getElementById('receipt_modal_overlay');
    const rcptTxnId = document.getElementById('rcpt_txn_id');
    const rcptDateTime = document.getElementById('rcpt_date_time');
    const rcptCashier = document.getElementById('rcpt_cashier');
    const rcptItemsTbody = document.getElementById('rcpt_items_tbody');
    const rcptSubtotal = document.getElementById('rcpt_subtotal');
    const rcptDiscountRow = document.getElementById('rcpt_discount_row');
    const rcptDiscount = document.getElementById('rcpt_discount');
    const rcptGrandTotal = document.getElementById('rcpt_grand_total');
    const btnPrintReceipt = document.getElementById('btn_print_receipt');
    const btnDoneReceipt = document.getElementById('btn_done_receipt');

    let activeCategory = 'all';

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatCurrency(num) {
        return '₱' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function filterProducts() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const allProductCards = document.querySelectorAll('.pos_product_card');
        let visibleCount = 0;

        allProductCards.forEach(card => {
            const name = (card.getAttribute('data-name') || '').toLowerCase();
            const sku = (card.getAttribute('data-sku') || '').toLowerCase();
            const category = (card.getAttribute('data-category') || '').toLowerCase();

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
                countLabel.textContent = `ALL PRODUCTS & SERVICES — ${visibleCount} ITEMS`;
            } else {
                countLabel.textContent = `FILTERED (${activeCategory.toUpperCase()}) — ${visibleCount} ITEMS`;
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

            if (activeCategory === 'maintenance' && posMaintSection) {
                posMaintSection.classList.remove('collapsed');
                if (maintCollapseText) maintCollapseText.textContent = 'Hide Section';
                posMaintSection.classList.add('highlight_active');
                posMaintSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setTimeout(() => posMaintSection.classList.remove('highlight_active'), 1200);
            }
        });
    });

    /* maintenance preset pill click */
    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            presetPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const srv = pill.getAttribute('data-service');
            const cost = pill.getAttribute('data-cost');
            if (maintServiceName && srv) maintServiceName.value = srv;
            if (maintServiceCost && cost) maintServiceCost.value = cost;
        });
    });

    /* technician dropdown custom toggle */
    if (maintTechSelect) {
        maintTechSelect.addEventListener('change', () => {
            if (maintTechSelect.value === '__custom__') {
                if (maintTechCustom) {
                    maintTechCustom.style.display = 'block';
                    maintTechCustom.focus();
                }
            } else {
                if (maintTechCustom) maintTechCustom.style.display = 'none';
            }
        });
    }

    /* collapse/expand toggle */
    if (btnMaintCollapse && posMaintSection) {
        btnMaintCollapse.addEventListener('click', () => {
            const isCollapsed = posMaintSection.classList.toggle('collapsed');
            if (maintCollapseText) {
                maintCollapseText.textContent = isCollapsed ? 'Show Section' : 'Hide Section';
            }
        });
    }

    /* subheader quick maintenance button */
    if (btnQuickMaint && posMaintSection) {
        btnQuickMaint.addEventListener('click', () => {
            posMaintSection.classList.remove('collapsed');
            if (maintCollapseText) maintCollapseText.textContent = 'Hide Section';
            posMaintSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            posMaintSection.classList.add('highlight_active');
            setTimeout(() => posMaintSection.classList.remove('highlight_active'), 1200);

            if (maintServiceName) maintServiceName.focus();
        });
    }

    /* add maintenance service to cart */
    if (btnAddMaintToOrder) {
        btnAddMaintToOrder.addEventListener('click', (e) => {
            e.preventDefault();

            const srvName = maintServiceName ? maintServiceName.value.trim() : '';
            if (!srvName) {
                alert('Please enter a service or maintenance description.');
                if (maintServiceName) maintServiceName.focus();
                return;
            }

            let techName = '';
            if (maintTechSelect) {
                if (maintTechSelect.value === '__custom__') {
                    techName = maintTechCustom ? maintTechCustom.value.trim() : '';
                } else {
                    techName = maintTechSelect.value.trim();
                }
            }

            if (!techName) {
                alert('Please select or enter the mechanic/technician doing the maintenance.');
                if (maintTechSelect.value === '__custom__' && maintTechCustom) {
                    maintTechCustom.focus();
                } else if (maintTechSelect) {
                    maintTechSelect.focus();
                }
                return;
            }

            const costVal = maintServiceCost ? parseFloat(maintServiceCost.value) : 0;
            if (isNaN(costVal) || costVal < 0) {
                alert('Please enter a valid labor cost / fee amount.');
                if (maintServiceCost) maintServiceCost.focus();
                return;
            }

            const bike = maintBikeDetails ? maintBikeDetails.value.trim() : '';
            const notes = maintServiceNotes ? maintServiceNotes.value.trim() : '';

            const srvItem = {
                sku: 'SRV-' + Date.now().toString().slice(-4),
                name: srvName,
                price: costVal,
                qty: 1,
                isService: true,
                mechanic: techName,
                bikeDetails: bike,
                notes: notes
            };

            orderCart.push(srvItem);
            renderOrderPanel();

            /* visual feedback on button */
            const originalHtml = btnAddMaintToOrder.innerHTML;
            btnAddMaintToOrder.innerHTML = `<span>✓ Added to Order!</span>`;
            btnAddMaintToOrder.style.backgroundColor = '#16a34a';
            setTimeout(() => {
                btnAddMaintToOrder.innerHTML = originalHtml;
                btnAddMaintToOrder.style.backgroundColor = '';
            }, 800);

            /* scroll order list to bottom */
            setTimeout(() => {
                orderItemsList.scrollTop = orderItemsList.scrollHeight;
            }, 50);
        });
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
            itemCard.className = 'order_item_card' + (item.isService ? ' order_item_service' : '');

            let metaHtml = '';
            if (item.isService) {
                metaHtml = `
                    <div class="order_item_service_meta">
                        <span class="service_badge">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                            SERVICE
                        </span>
                        <span class="service_mechanic_tag" title="Assigned Technician">
                            <strong>Tech:</strong> ${escapeHtml(item.mechanic || 'Unassigned')}
                        </span>
                        ${item.bikeDetails ? `<span class="service_bike_tag" title="Bike Info">🚲 ${escapeHtml(item.bikeDetails)}</span>` : ''}
                    </div>
                `;
            }

            itemCard.innerHTML = `
                <div class="order_item_top_row">
                    <div class="order_item_title_wrap">
                        <span class="order_item_name">${escapeHtml(item.name)}</span>
                        ${metaHtml}
                    </div>
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
            discountAmount = 0;
            if (discountBtn) discountBtn.textContent = 'Add Code';
            renderOrderPanel();
        });
    }

    /* product cards click handling */
    const allCards = document.querySelectorAll('.pos_product_card');
    allCards.forEach(card => {
        const btn = card.querySelector('.btn_add_to_cart');

        function handleAddCard(e) {
            e.stopPropagation();
            const sku = card.getAttribute('data-sku');
            const name = card.getAttribute('data-name');
            const price = parseFloat(card.getAttribute('data-price') || '0');
            const isService = card.getAttribute('data-is-service') === 'true';

            if (isService) {
                /* check assigned mechanic from section */
                let tech = '';
                if (maintTechSelect) {
                    if (maintTechSelect.value === '__custom__') {
                        tech = maintTechCustom ? maintTechCustom.value.trim() : '';
                    } else {
                        tech = maintTechSelect.value.trim();
                    }
                }
                if (!tech) tech = 'Reynaldo Santos';

                const bike = maintBikeDetails ? maintBikeDetails.value.trim() : '';
                const notes = maintServiceNotes ? maintServiceNotes.value.trim() : '';

                const existingService = orderCart.find(item => item.sku === sku && item.mechanic === tech);
                if (existingService) {
                    existingService.qty += 1;
                } else {
                    orderCart.push({
                        sku,
                        name,
                        price,
                        qty: 1,
                        isService: true,
                        mechanic: tech,
                        bikeDetails: bike,
                        notes: notes
                    });
                }
            } else {
                const existingItem = orderCart.find(item => item.sku === sku);
                if (existingItem) {
                    existingItem.qty += 1;
                } else {
                    orderCart.push({ sku, name, price, qty: 1, isService: false });
                }
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

        if (btn) btn.addEventListener('click', handleAddCard);
        card.addEventListener('click', handleAddCard);
    });

    /* discount code modal handling */
    if (discountBtn && discountModal) {
        discountBtn.addEventListener('click', () => {
            discountModal.classList.add('active');
            if (discountCodeInput) discountCodeInput.focus();
        });
    }

    if (btnCloseDiscount && discountModal) {
        btnCloseDiscount.addEventListener('click', () => discountModal.classList.remove('active'));
    }

    if (btnCancelDiscount && discountModal) {
        btnCancelDiscount.addEventListener('click', () => discountModal.classList.remove('active'));
    }

    promoPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const code = pill.getAttribute('data-code');
            if (discountCodeInput && code) discountCodeInput.value = code;
        });
    });

    if (btnApplyDiscount && discountModal) {
        btnApplyDiscount.addEventListener('click', () => {
            const code = (discountCodeInput ? discountCodeInput.value.toUpperCase().trim() : '');
            let subtotal = 0;
            orderCart.forEach(i => subtotal += i.price * i.qty);

            if (code === 'TAURUS10') {
                discountAmount = Math.round(subtotal * 0.10);
                if (discountBtn) discountBtn.textContent = `-₱${discountAmount.toLocaleString()} (10%)`;
            } else if (code === 'VIP50') {
                discountAmount = 50;
                if (discountBtn) discountBtn.textContent = '-₱50.00';
            } else if (code === 'SAVE100') {
                discountAmount = 100;
                if (discountBtn) discountBtn.textContent = '-₱100.00';
            } else if (code) {
                discountAmount = 50;
                if (discountBtn) discountBtn.textContent = `-₱${discountAmount.toLocaleString()} (${code})`;
            } else {
                discountAmount = 0;
                if (discountBtn) discountBtn.textContent = 'Add Code';
            }

            discountModal.classList.remove('active');
            renderOrderPanel();
        });
    }

    /* checkout and receipt handling */
    if (btnCharge && receiptModal) {
        btnCharge.addEventListener('click', () => {
            if (orderCart.length === 0) return;

            let subtotal = 0;
            if (rcptItemsTbody) rcptItemsTbody.innerHTML = '';

            orderCart.forEach(item => {
                const itemTotal = item.price * item.qty;
                subtotal += itemTotal;

                if (rcptItemsTbody) {
                    const tr = document.createElement('tr');
                    let descHtml = `<strong>${escapeHtml(item.name)}</strong>`;
                    if (item.isService) {
                        descHtml += `
                            <div class="receipt_service_subtext">
                                🔧 <em>Mechanic:</em> <strong>${escapeHtml(item.mechanic || 'Unassigned')}</strong>
                                ${item.bikeDetails ? ` &bull; 🚲 ${escapeHtml(item.bikeDetails)}` : ''}
                            </div>
                        `;
                    }
                    tr.innerHTML = `
                        <td>${descHtml}</td>
                        <td style="text-align: center;">${item.qty}</td>
                        <td style="text-align: right; font-weight: 700;">${formatCurrency(itemTotal)}</td>
                    `;
                    rcptItemsTbody.appendChild(tr);
                }
            });

            const grandTotal = Math.max(0, subtotal - discountAmount);

            /* transaction metadata */
            const now = new Date();
            const txnNumber = 'TXN-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.floor(100 + Math.random() * 900);
            const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            if (rcptTxnId) rcptTxnId.textContent = txnNumber;
            if (rcptDateTime) rcptDateTime.textContent = dateStr;
            if (rcptSubtotal) rcptSubtotal.textContent = formatCurrency(subtotal);

            if (rcptDiscountRow && rcptDiscount) {
                if (discountAmount > 0) {
                    rcptDiscountRow.style.display = 'flex';
                    rcptDiscount.textContent = `-${formatCurrency(discountAmount)}`;
                } else {
                    rcptDiscountRow.style.display = 'none';
                }
            }

            if (rcptGrandTotal) rcptGrandTotal.textContent = formatCurrency(grandTotal);

            /* display receipt modal */
            receiptModal.classList.add('active');
        });
    }

    if (btnPrintReceipt) {
        btnPrintReceipt.addEventListener('click', () => {
            window.print();
        });
    }

    if (btnDoneReceipt && receiptModal) {
        btnDoneReceipt.addEventListener('click', () => {
            receiptModal.classList.remove('active');
            orderCart = [];
            discountAmount = 0;
            if (discountBtn) discountBtn.textContent = 'Add Code';
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
