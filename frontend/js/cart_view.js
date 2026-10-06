/**
 * BICOBS - My Cart View & Checkout Controller
 * Powers dynamic cart rendering, selectable cart items, guest warning alerts,
 * and delivery checkout where payment is handled upfront via BPI, Maya, or GCash.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Cart DOM Elements
    const cart_list_el = document.getElementById('cart_item_list');
    const cart_select_all = document.getElementById('cart_select_all');
    const cart_selected_count = document.getElementById('cart_selected_count');
    const cart_total_count = document.getElementById('cart_total_count');
    const btn_delete_selected = document.getElementById('btn_delete_selected');
    const cart_guest_banner = document.getElementById('cart_guest_banner');
    const btn_guest_banner_login = document.getElementById('btn_guest_banner_login');
    const cart_checkout_guest_hint = document.getElementById('cart_checkout_guest_hint');

    // Summary Elements
    const total_items_el = document.getElementById('cart_total_items');
    const subtotal_el = document.getElementById('cart_subtotal');
    const shipping_el = document.getElementById('cart_shipping');
    const total_price_el = document.getElementById('cart_total_price');
    const discount_row = document.getElementById('cart_discount_row');
    const discount_amount_el = document.getElementById('cart_discount_amount');
    const btn_checkout = document.getElementById('btn_checkout');

    // Account Warning Modal Elements
    const account_warning_modal = document.getElementById('account_warning_modal');
    const btn_cancel_account_warning = document.getElementById('btn_cancel_account_warning');
    const btn_proceed_to_login = document.getElementById('btn_proceed_to_login');

    // Payment Required Modal Elements (User has no added payment methods)
    const payment_required_modal = document.getElementById('payment_required_modal');
    const btn_cancel_payment_required = document.getElementById('btn_cancel_payment_required');
    const btn_goto_add_payment = document.getElementById('btn_goto_add_payment');
    const payment_method_grid = document.getElementById('payment_method_grid');

    // Checkout Modal Elements
    const checkout_modal = document.getElementById('checkout_modal');
    const close_checkout_modal = document.getElementById('close_checkout_modal');
    const cancel_checkout_btn = document.getElementById('cancel_checkout_btn');
    const confirm_checkout_btn = document.getElementById('confirm_checkout_btn');
    const checkout_items_preview = document.getElementById('checkout_items_preview');

    // Checkout Form Elements
    const mode_delivery = document.getElementById('mode_delivery');
    const mode_pickup = document.getElementById('mode_pickup');
    const card_mode_delivery = document.getElementById('card_mode_delivery');
    const card_mode_pickup = document.getElementById('card_mode_pickup');
    const section_delivery_address = document.getElementById('section_delivery_address');
    const section_pickup_info = document.getElementById('section_pickup_info');
    const checkout_customer_address = document.getElementById('checkout_customer_address');
    const checkout_customer_phone = document.getElementById('checkout_customer_phone');
    const checkout_customer_notes = document.getElementById('checkout_customer_notes');
    const display_customer_name = document.getElementById('display_customer_name');
    const display_customer_address = document.getElementById('display_customer_address');
    const display_customer_phone = document.getElementById('display_customer_phone');
    const address_edit_block = document.getElementById('address_edit_block');
    const btn_edit_delivery_addr = document.getElementById('btn_edit_delivery_addr');
    const btn_edit_addr_label = document.getElementById('btn_edit_addr_label');

    // Payment Elements
    const delivery_payment_badge = document.getElementById('delivery_payment_badge');
    const delivery_payment_notice = document.getElementById('delivery_payment_notice');
    const card_pay_gcash = document.getElementById('card_pay_gcash');
    const card_pay_maya = document.getElementById('card_pay_maya');
    const card_pay_bpi = document.getElementById('card_pay_bpi');
    const card_pay_cash = document.getElementById('card_pay_cash');
    const pay_details_content = document.getElementById('pay_details_content');
    const checkout_payment_ref = document.getElementById('checkout_payment_ref');
    const checkout_payment_sender = document.getElementById('checkout_payment_sender');
    const payment_error_msg = document.getElementById('payment_error_msg');
    const pay_verification_inputs = document.getElementById('pay_verification_inputs');

    // Checkout Summary Elements
    const modal_total_items = document.getElementById('modal_total_items');
    const modal_subtotal = document.getElementById('modal_subtotal');
    const modal_shipping = document.getElementById('modal_shipping');
    const modal_total_price = document.getElementById('modal_total_price');
    const modal_discount_row = document.getElementById('modal_discount_row');
    const modal_discount_amount = document.getElementById('modal_discount_amount');
    const discount_input = document.getElementById('checkout_discount_input');
    const btn_apply_discount = document.getElementById('btn_apply_discount');
    const discount_msg = document.getElementById('discount_msg');

    // Success Modal Elements
    const order_success_modal = document.getElementById('order_success_modal');
    const close_success_modal = document.getElementById('close_success_modal');
    const success_txn_id = document.getElementById('success_txn_id');
    const success_total_paid = document.getElementById('success_total_paid');

    // State Variables
    let discount = 0;
    let fulfillmentType = 'delivery'; // 'delivery' | 'pickup'
    let selectedPaymentMethod = 'gcash'; // 'gcash' | 'maya' | 'bpi' | 'cash'
    let selectedUserPaymentAccount = null; // Currently chosen saved account object from BICOBS_Payments
    const SHIPPING_FEE = 0; // Customer handles booking and pays rider directly
    const selectedItemIds = new Set();
    let hasInitializedSelection = false;

    // Taurus Bike Official Receiving Payment Details
    const PAYMENT_ACCOUNTS = {
        gcash: {
            title: 'GCash Express Send',
            accountName: 'Taurus Bike Shop (John Michael T.)',
            accountNumber: '0917-828-7871',
            rawNumber: '09178287871',
            badgeBg: '#005ce6',
            instructions: 'Send money via GCash Express Send. Enter the exact total amount, then copy the 13-digit Reference Number from your receipt below.'
        },
        maya: {
            title: 'Maya (PayMaya) Transfer',
            accountName: 'Taurus Bike Shop (John Michael T.)',
            accountNumber: '0918-912-3456',
            rawNumber: '09189123456',
            badgeBg: '#047857',
            instructions: 'Send money via Maya Send Money. Enter the exact total amount, then enter your Maya Reference Number below.'
        },
        bpi: {
            title: 'Bank of the Philippine Islands (BPI)',
            accountName: 'Taurus Bike Trading & Services',
            accountNumber: '0443-1289-55',
            rawNumber: '0443128955',
            badgeBg: '#b91c1c',
            instructions: 'Transfer via BPI Online / Mobile App to the account above. Enter the exact total, then copy your BPI Confirmation / Reference Number below.'
        },
        cash: {
            title: 'Cash / In-Store Counter Payment',
            accountName: 'Taurus Bike Shop Cashier Counter',
            accountNumber: 'Sandico St, Abangan Sur, Marilao, Bulacan',
            rawNumber: '',
            badgeBg: '#475569',
            instructions: 'Pay in cash upon inspection and pick-up of your bicycle or components at our Marilao store counter.'
        }
    };

    // Check auth status and update guest warning notices
    function updateAuthStatusUI() {
        const isAuth = window.BICOBS_Auth ? window.BICOBS_Auth.isAuthenticated() : false;
        if (cart_guest_banner) {
            cart_guest_banner.style.display = isAuth ? 'none' : 'flex';
        }
        if (cart_checkout_guest_hint) {
            cart_checkout_guest_hint.style.display = isAuth ? 'none' : 'block';
        }
    }

    if (btn_guest_banner_login) {
        btn_guest_banner_login.addEventListener('click', (e) => {
            e.preventDefault();
            const currentPath = window.location.pathname || '/frontend/pages/cart.html';
            window.location.href = '/frontend/pages/login.html?redirect=' + encodeURIComponent(currentPath);
        });
    }

    // React dynamically to global auth state changes
    window.addEventListener('bicobs_auth_changed', () => {
        updateAuthStatusUI();
        renderCart();
    });

    // Synchronize item selection state with cart
    function syncSelectionState(cart) {
        const currentItemIds = new Set(cart.map(i => String(i.id || i._id)));

        // Remove IDs no longer in cart
        for (const id of selectedItemIds) {
            if (!currentItemIds.has(id)) {
                selectedItemIds.delete(id);
            }
        }

        // Default all items to selected on initial load or if newly added
        if (!hasInitializedSelection && cart.length > 0) {
            cart.forEach(item => selectedItemIds.add(String(item.id || item._id)));
            hasInitializedSelection = true;
        } else if (cart.length > 0 && selectedItemIds.size === 0) {
            // Keep empty if user explicitly unchecked all
        }
    }

    // Calculate subtotal and count for SELECTED items only
    function getSelectedTotals() {
        const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
        let selectedCount = 0;
        let selectedQty = 0;
        let selectedSubtotal = 0;
        const selectedItems = [];

        cart.forEach(item => {
            const itemId = String(item.id || item._id);
            if (selectedItemIds.has(itemId)) {
                const qty = parseInt(item.quantity, 10) || 1;
                const price = parseFloat(item.price) || 0;
                selectedCount++;
                selectedQty += qty;
                selectedSubtotal += (price * qty);
                selectedItems.push(item);
            }
        });

        return {
            selectedCount,
            selectedQty,
            selectedSubtotal,
            selectedItems,
            totalCartItems: cart.length
        };
    }

    // Render cart items with selection checkboxes
    function renderCart() {
        if (!cart_list_el) return;
        updateAuthStatusUI();
        const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
        syncSelectionState(cart);

        const selectBar = document.getElementById('cart_select_bar');

        if (cart.length === 0) {
            if (selectBar) selectBar.style.display = 'none';
            cart_list_el.innerHTML = `
                <li class="empty_cart_message" style="text-align: center; padding: 48px 16px; list-style: none; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <div style="font-size: 48px; color: #94a3b8; margin-bottom: 16px;"><i class="fas fa-shopping-cart"></i></div>
                    <h3 style="font-size: 20px; color: #1e293b; margin-bottom: 8px;">Your cart is currently empty</h3>
                    <p style="color: #64748b; margin-bottom: 24px;">Discover our bicycles, frames, components, and accessories.</p>
                    <a href="/frontend/pages/shop.html" class="btn_modal_submit" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; padding: 12px 24px; border-radius: 6px; background-color: #dc2626; color: #ffffff; font-weight: 700;">
                        <i class="fas fa-store"></i> Browse Shop Catalog
                    </a>
                </li>
            `;
            if (btn_checkout) {
                btn_checkout.disabled = true;
                btn_checkout.style.opacity = '0.5';
                btn_checkout.style.cursor = 'not-allowed';
            }
            updateSummaryTotals();
            return;
        }

        if (selectBar) selectBar.style.display = 'flex';

        cart_list_el.innerHTML = '';

        cart.forEach(item => {
            const itemId = String(item.id || item._id);
            const itemName = item.name || 'Product';
            const itemPrice = parseFloat(item.price) || 0;
            const itemQty = parseInt(item.quantity, 10) || 1;
            const itemSubtotal = itemPrice * itemQty;
            const itemImg = item.imageUrl || item.image || '/frontend/Pictures/placeholder.png';
            const itemCat = (item.category || 'Product').replace(/_/g, ' ');
            const isSelected = selectedItemIds.has(itemId);

            const li = document.createElement('li');
            li.className = `cart_item_card ${isSelected ? '' : 'unselected'}`;
            li.setAttribute('data-id', itemId);
            li.style.cssText = `
                background: ${isSelected ? '#ffffff' : '#f8fafc'};
                border: 1px solid ${isSelected ? '#e2e8f0' : '#cbd5e1'};
                border-radius: 10px;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
                margin-bottom: 12px;
                list-style: none;
                transition: all 0.2s ease;
                box-shadow: ${isSelected ? '0 1px 3px rgba(0,0,0,0.04)' : 'none'};
            `;

            li.innerHTML = `
                <!-- Selection Checkbox -->
                <div style="display: flex; align-items: center; justify-content: center;">
                    <input type="checkbox" class="cart_item_checkbox" data-id="${itemId}" ${isSelected ? 'checked' : ''} aria-label="Select item ${itemName}">
                </div>

                <!-- Product Thumbnail -->
                <div style="width: 70px; height: 70px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; padding: 4px;">
                    <img src="${itemImg}" alt="${itemName}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='/frontend/Pictures/placeholder.png';">
                </div>

                <!-- Item Details -->
                <div class="item_details" style="flex: 1; min-width: 180px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${itemCat}</span>
                    <h4 class="item_name" style="font-size: 15px; color: #0f172a; margin: 4px 0 6px; font-weight: 600;">${itemName}</h4>
                    <div class="item_price" style="font-size: 15px; color: #dc2626; font-weight: 700;">₱${itemPrice.toLocaleString()}</div>
                </div>

                <!-- Quantity & Actions -->
                <div class="item_actions" style="display: flex; align-items: center; gap: 16px;">
                    <div class="qty_control" style="border: 1px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; background: #ffffff; overflow: hidden;">
                        <button type="button" class="qty_btn btn_qty_minus" data-id="${itemId}" style="background: #f1f5f9; border: none; padding: 6px 12px; cursor: pointer; color: #334155; font-size: 15px; font-weight: bold;">−</button>
                        <span class="qty_value" style="padding: 0 12px; font-size: 14px; font-weight: 600; min-width: 24px; text-align: center;">${itemQty}</span>
                        <button type="button" class="qty_btn btn_qty_plus" data-id="${itemId}" style="background: #f1f5f9; border: none; padding: 6px 12px; cursor: pointer; color: #334155; font-size: 15px; font-weight: bold;">+</button>
                    </div>
                    <div style="min-width: 90px; text-align: right; font-weight: 700; color: #0f172a; font-size: 15px;">
                        ₱${itemSubtotal.toLocaleString()}
                    </div>
                    <button type="button" class="delete_btn btn_item_delete" data-id="${itemId}" title="Remove item" style="background: #fee2e2; border: none; padding: 8px 12px; border-radius: 6px; color: #dc2626; cursor: pointer; transition: background 0.2s;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            cart_list_el.appendChild(li);
        });

        updateSummaryTotals();
    }

    // Update order summary values based on selected items only
    function updateSummaryTotals() {
        const { selectedCount, selectedQty, selectedSubtotal, totalCartItems } = getSelectedTotals();

        // Update Select All Checkbox State & Counter
        if (cart_select_all) {
            cart_select_all.checked = totalCartItems > 0 && selectedCount === totalCartItems;
            cart_select_all.indeterminate = selectedCount > 0 && selectedCount < totalCartItems;
        }
        if (cart_selected_count) cart_selected_count.textContent = selectedCount;
        if (cart_total_count) cart_total_count.textContent = totalCartItems;

        // Shipping calculation: ₱0.00 since customer books courier directly and pays rider
        const shipping = 0;
        const total = Math.max(0, selectedSubtotal - discount + shipping);

        if (total_items_el) total_items_el.textContent = `${selectedQty} ${selectedQty === 1 ? 'item' : 'items'}`;
        if (subtotal_el) subtotal_el.textContent = `₱${selectedSubtotal.toLocaleString()}`;
        if (shipping_el) {
            shipping_el.textContent = '₱0.00';
        }
        if (total_price_el) total_price_el.textContent = `₱${total.toLocaleString()}`;

        if (discount_row) {
            discount_row.style.display = discount > 0 ? 'flex' : 'none';
            if (discount_amount_el) discount_amount_el.textContent = `-₱${discount.toLocaleString()}`;
        }

        // Checkout Button State
        if (btn_checkout) {
            if (selectedCount === 0 || totalCartItems === 0) {
                btn_checkout.disabled = false; // keep clickable so we can give clear instruction toast
                btn_checkout.style.opacity = '0.7';
                btn_checkout.textContent = 'Select Items to Checkout';
            } else {
                btn_checkout.disabled = false;
                btn_checkout.style.opacity = '1';
                btn_checkout.textContent = `Proceed to Checkout (${selectedCount})`;
            }
        }
    }

    // Cart list interactions (delegated event listener)
    if (cart_list_el) {
        cart_list_el.addEventListener('click', (e) => {
            const checkbox = e.target.closest('.cart_item_checkbox');
            const minusBtn = e.target.closest('.btn_qty_minus');
            const plusBtn = e.target.closest('.btn_qty_plus');
            const deleteBtn = e.target.closest('.btn_item_delete');

            if (checkbox) {
                const id = checkbox.getAttribute('data-id');
                if (checkbox.checked) {
                    selectedItemIds.add(id);
                } else {
                    selectedItemIds.delete(id);
                }
                const card = checkbox.closest('.cart_item_card');
                if (card) {
                    card.classList.toggle('unselected', !checkbox.checked);
                    card.style.background = checkbox.checked ? '#ffffff' : '#f8fafc';
                    card.style.borderColor = checkbox.checked ? '#e2e8f0' : '#cbd5e1';
                }
                updateSummaryTotals();
            } else if (minusBtn && window.BICOBS_Cart) {
                const id = minusBtn.getAttribute('data-id');
                const cart = window.BICOBS_Cart.getCart();
                const item = cart.find(i => String(i.id || i._id) === String(id));
                if (item) {
                    window.BICOBS_Cart.updateQuantity(id, item.quantity - 1);
                    renderCart();
                }
            } else if (plusBtn && window.BICOBS_Cart) {
                const id = plusBtn.getAttribute('data-id');
                const cart = window.BICOBS_Cart.getCart();
                const item = cart.find(i => String(i.id || i._id) === String(id));
                if (item) {
                    window.BICOBS_Cart.updateQuantity(id, item.quantity + 1);
                    renderCart();
                }
            } else if (deleteBtn && window.BICOBS_Cart) {
                const id = deleteBtn.getAttribute('data-id');
                selectedItemIds.delete(id);
                window.BICOBS_Cart.removeFromCart(id);
                renderCart();
            }
        });
    }

    // Select All Checkbox Handler
    if (cart_select_all) {
        cart_select_all.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];

            if (isChecked) {
                cart.forEach(item => selectedItemIds.add(String(item.id || item._id)));
            } else {
                selectedItemIds.clear();
            }
            renderCart();
        });
    }

    // Delete Selected Items Handler
    if (btn_delete_selected) {
        btn_delete_selected.addEventListener('click', () => {
            if (selectedItemIds.size === 0) {
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Please select items to delete.', 'warning');
                return;
            }

            const count = selectedItemIds.size;
            if (confirm(`Remove the ${count} selected ${count === 1 ? 'item' : 'items'} from your shopping cart?`)) {
                if (window.BICOBS_Cart && typeof window.BICOBS_Cart.removeItemsFromCart === 'function') {
                    window.BICOBS_Cart.removeItemsFromCart(Array.from(selectedItemIds));
                } else if (window.BICOBS_Cart) {
                    selectedItemIds.forEach(id => window.BICOBS_Cart.removeFromCart(id));
                }
                selectedItemIds.clear();
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast(`Removed ${count} items from cart.`, 'info');
                renderCart();
            }
        });
    }

    // Listen for custom cart updates across components
    window.addEventListener('bicobs_cart_updated', renderCart);

    // Empty Cart Button
    const btn_clear_cart_all = document.getElementById('btn_clear_cart_all');
    if (btn_clear_cart_all) {
        btn_clear_cart_all.addEventListener('click', () => {
            if (confirm('Are you sure you want to empty your entire shopping cart?')) {
                if (window.BICOBS_Cart) {
                    window.BICOBS_Cart.clearCart();
                    window.BICOBS_Cart.showToast('Cart has been emptied', 'info');
                }
                selectedItemIds.clear();
                renderCart();
            }
        });
    }

    // Apply discount code
    if (btn_apply_discount) {
        btn_apply_discount.addEventListener('click', () => {
            const code = (discount_input?.value || '').trim().toUpperCase();
            const { selectedSubtotal } = getSelectedTotals();

            if (!code) {
                if (discount_msg) {
                    discount_msg.textContent = 'Please enter a valid discount code.';
                    discount_msg.style.color = '#dc2626';
                }
                return;
            }

            if (code === 'TAURUS10') {
                discount = Math.round(selectedSubtotal * 0.10);
                if (discount_msg) {
                    discount_msg.textContent = '✓ TAURUS10 applied (10% OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else if (code === 'TAURUS20') {
                discount = Math.round(selectedSubtotal * 0.20);
                if (discount_msg) {
                    discount_msg.textContent = '✓ TAURUS20 applied (20% OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else if (code === 'SAVE500') {
                discount = Math.min(selectedSubtotal, 500);
                if (discount_msg) {
                    discount_msg.textContent = '✓ SAVE500 applied (₱500 OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else if (code === 'FREE1000') {
                discount = Math.min(selectedSubtotal, 1000);
                if (discount_msg) {
                    discount_msg.textContent = '✓ FREE1000 applied (₱1,000 OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else {
                discount = 0;
                if (discount_msg) {
                    discount_msg.textContent = 'Invalid promo code. Try TAURUS10, TAURUS20, or SAVE500.';
                    discount_msg.style.color = '#dc2626';
                }
            }
            updateSummaryTotals();
            updateCheckoutModalSummary();
        });
    }

    // Account Warning Modal Handlers (Guests without account)
    function showAccountWarningModal() {
        if (account_warning_modal) {
            account_warning_modal.style.display = 'flex';
            account_warning_modal.classList.add('active');
        }
        if (window.BICOBS_Cart) {
            window.BICOBS_Cart.showToast('Please sign in or create an account to proceed.', 'warning');
        }
    }

    function hideAccountWarningModal() {
        if (account_warning_modal) {
            account_warning_modal.style.display = 'none';
            account_warning_modal.classList.remove('active');
        }
    }

    if (btn_cancel_account_warning) {
        btn_cancel_account_warning.addEventListener('click', hideAccountWarningModal);
    }

    if (account_warning_modal) {
        account_warning_modal.addEventListener('click', (e) => {
            if (e.target === account_warning_modal) hideAccountWarningModal();
        });
    }

    if (btn_proceed_to_login) {
        btn_proceed_to_login.addEventListener('click', (e) => {
            e.preventDefault();
            hideAccountWarningModal();
            const currentPath = window.location.pathname || '/frontend/pages/cart.html';
            window.location.href = '/frontend/pages/login.html?redirect=' + encodeURIComponent(currentPath);
        });
    }

    // Payment Required Modal Handlers (Logged in but NO payment methods in dashboard)
    function showPaymentRequiredModal() {
        if (payment_required_modal) {
            payment_required_modal.style.display = 'flex';
            payment_required_modal.classList.add('active');
        }
        if (window.BICOBS_Cart) {
            window.BICOBS_Cart.showToast('Please add a payment method in your dashboard to proceed.', 'warning');
        }
    }

    function hidePaymentRequiredModal() {
        if (payment_required_modal) {
            payment_required_modal.style.display = 'none';
            payment_required_modal.classList.remove('active');
        }
    }

    if (btn_cancel_payment_required) {
        btn_cancel_payment_required.addEventListener('click', hidePaymentRequiredModal);
    }

    if (payment_required_modal) {
        payment_required_modal.addEventListener('click', (e) => {
            if (e.target === payment_required_modal) hidePaymentRequiredModal();
        });
    }

    // Checkout Button Click Handler with Strict Dual Gate (Auth + Added Payment Method)
    if (btn_checkout) {
        btn_checkout.addEventListener('click', () => {
            const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
            if (cart.length === 0) {
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Your cart is empty', 'warning');
                return;
            }

            if (selectedItemIds.size === 0) {
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Please select at least one item to checkout.', 'warning');
                return;
            }

            // Gate 1: Check if user has an account
            const isAuth = window.BICOBS_Auth ? window.BICOBS_Auth.isAuthenticated() : false;
            if (!isAuth) {
                showAccountWarningModal();
                return;
            }

            // Gate 2: Payment method check
            // For Store Pick Up, cash payment is available at the counter, so users without saved e-wallets
            // can still proceed directly via Store Pick-up.
            const hasPayment = window.BICOBS_Payments ? window.BICOBS_Payments.hasMethod() : false;
            if (!hasPayment) {
                fulfillmentType = 'pickup';
                if (mode_pickup) mode_pickup.checked = true;
                if (card_mode_pickup) card_mode_pickup.classList.add('active');
                if (card_mode_delivery) card_mode_delivery.classList.remove('active');
                if (section_delivery_address) section_delivery_address.style.display = 'none';
                if (section_pickup_info) section_pickup_info.style.display = 'block';
                if (delivery_payment_badge) delivery_payment_badge.style.display = 'none';
                if (delivery_payment_notice) delivery_payment_notice.style.display = 'none';
                selectedPaymentMethod = 'cash';
                selectedUserPaymentAccount = null;
            }

            openCheckoutModal();
        });
    }

    // Fulfillment Mode & Payment UI Switchers
    function setupFulfillmentAndPayment() {
        // Toggle Delivery vs Store Pick-up
        const modeRadios = document.querySelectorAll('input[name="fulfillment_mode"]');
        const handleModeChange = (targetVal) => {
            fulfillmentType = (targetVal === 'pickup') ? 'pickup' : 'delivery';
            if (mode_delivery) mode_delivery.checked = (fulfillmentType === 'delivery');
            if (mode_pickup) mode_pickup.checked = (fulfillmentType === 'pickup');
            if (card_mode_delivery) card_mode_delivery.classList.toggle('active', fulfillmentType === 'delivery');
            if (card_mode_pickup) card_mode_pickup.classList.toggle('active', fulfillmentType === 'pickup');

            if (fulfillmentType === 'delivery') {
                if (section_delivery_address) section_delivery_address.style.display = 'block';
                if (section_pickup_info) section_pickup_info.style.display = 'none';
                if (delivery_payment_badge) delivery_payment_badge.style.display = 'inline-block';
                if (delivery_payment_notice) delivery_payment_notice.style.display = 'block';

                const methods = window.BICOBS_Payments ? window.BICOBS_Payments.getMethods() : [];
                selectedUserPaymentAccount = methods.find(m => m.isPrimary) || methods[0] || null;
                selectedPaymentMethod = selectedUserPaymentAccount ? (selectedUserPaymentAccount.provider === 'paymaya' ? 'maya' : selectedUserPaymentAccount.provider) : '';
            } else {
                if (section_delivery_address) section_delivery_address.style.display = 'none';
                if (section_pickup_info) section_pickup_info.style.display = 'block';
                if (delivery_payment_badge) delivery_payment_badge.style.display = 'none';
                if (delivery_payment_notice) delivery_payment_notice.style.display = 'none';

                selectedPaymentMethod = 'cash';
                selectedUserPaymentAccount = null;
            }

            updateSummaryTotals();
            updateCheckoutModalSummary();
            renderCheckoutPaymentMethods();
            renderPaymentAccountDetails();
        };

        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const val = e.target.value || (e.target.id === 'mode_pickup' ? 'pickup' : 'delivery');
                handleModeChange(val);
            });
        });

        if (card_mode_delivery) {
            card_mode_delivery.addEventListener('click', (e) => {
                if (e.target !== mode_delivery) handleModeChange('delivery');
            });
        }
        if (card_mode_pickup) {
            card_mode_pickup.addEventListener('click', (e) => {
                if (e.target !== mode_pickup) handleModeChange('pickup');
            });
        }

        // Edit Address Toggle & Live Sync
        if (btn_edit_delivery_addr && address_edit_block) {
            btn_edit_delivery_addr.addEventListener('click', () => {
                const isHidden = address_edit_block.style.display === 'none';
                address_edit_block.style.display = isHidden ? 'block' : 'none';
                if (btn_edit_addr_label) {
                    btn_edit_addr_label.textContent = isHidden ? 'Done' : 'Edit';
                }
            });
        }

        if (checkout_customer_address) {
            checkout_customer_address.addEventListener('input', () => {
                if (display_customer_address) {
                    display_customer_address.textContent = checkout_customer_address.value.trim() || 'No address provided';
                }
            });
        }

        if (checkout_customer_phone) {
            checkout_customer_phone.addEventListener('input', () => {
                if (display_customer_phone) {
                    display_customer_phone.innerHTML = `<i class="fas fa-phone-alt" style="font-size: 10px;"></i> ${checkout_customer_phone.value.trim() || 'No contact number'}`;
                }
            });
        }

        // Copy Store Dispatch Pin Button
        const copyPinBtn = document.getElementById('btn_copy_pickup_pin');
        if (copyPinBtn) {
            copyPinBtn.addEventListener('click', () => {
                const textToCopy = copyPinBtn.getAttribute('data-copy');
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        copyPinBtn.innerHTML = '<i class="fas fa-check"></i> Pin Copied!';
                        setTimeout(() => {
                            copyPinBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Store Pin';
                        }, 2000);
                    });
                }
            });
        }
    }

    // Render in checkout the available payment accounts or Cash on Pickup
    function renderCheckoutPaymentMethods() {
        const grid = document.getElementById('payment_method_grid');
        if (!grid) return;

        const methods = window.BICOBS_Payments ? window.BICOBS_Payments.getMethods() : [];
        grid.innerHTML = '';

        // 1. If Store Pick-up mode, ALWAYS provide Cash on Pick-up option
        if (fulfillmentType === 'pickup') {
            const isCashSelected = selectedPaymentMethod === 'cash' || !selectedUserPaymentAccount;
            if (isCashSelected && !selectedPaymentMethod) {
                selectedPaymentMethod = 'cash';
            }
            const cashCard = document.createElement('div');
            cashCard.className = `pay_method_card ${isCashSelected ? 'active' : ''}`;
            cashCard.setAttribute('data-id', 'cash');
            cashCard.style.cssText = `
                border: ${isCashSelected ? '2px solid #16a34a' : '1px solid #cbd5e1'};
                background: ${isCashSelected ? '#f0fdf4' : '#ffffff'};
                border-radius: 10px;
                padding: 12px 10px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: ${isCashSelected ? '0 4px 10px rgba(0,0,0,0.06)' : 'none'};
            `;
            cashCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-money-bill-wave" style="color: #16a34a; font-size: 16px;"></i>
                        <strong style="font-size: 13px; color: #166534;">Cash on Pick-up</strong>
                    </div>
                    <span style="font-size: 10px; font-weight: 700; background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px;">At Counter</span>
                </div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a;">
                    Pay upon Store Claim
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    Inspect items & pay cash at counter
                </div>
            `;
            cashCard.addEventListener('click', () => {
                selectedUserPaymentAccount = null;
                selectedPaymentMethod = 'cash';
                renderCheckoutPaymentMethods();
                renderPaymentAccountDetails();
            });
            grid.appendChild(cashCard);
        }

        // 2. Render user's linked electronic payment methods (GCash, Maya, Card)
        if (methods.length === 0 && fulfillmentType === 'delivery') {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; background: #fff5f5; border: 1px dashed #fca5a5; border-radius: 8px; padding: 14px; text-align: center; font-size: 13px; color: #b91c1c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 20px; display: block; margin-bottom: 6px;"></i>
                    No saved payment accounts found for delivery.<br>
                    <a href="/frontend/pages/Dashboard/payments.html" target="_blank" style="color: #b91c1c; font-weight: 700; text-decoration: underline; margin-top: 4px; display: inline-block;">Click here to add one</a>
                    or switch to <strong>Store Pick-up</strong> to pay Cash at counter.
                </div>
            `;
            return;
        }

        methods.forEach(method => {
            const isSelected = selectedUserPaymentAccount && selectedUserPaymentAccount.id === method.id;
            const card = document.createElement('div');
            card.className = `pay_method_card ${isSelected ? 'active' : ''}`;
            card.setAttribute('data-id', method.id);

            let providerIcon = '';
            let providerTitle = '';
            let accentColor = '#b91c1c';

            if (method.provider === 'gcash') {
                accentColor = '#005ce6';
                providerTitle = 'GCash';
                providerIcon = '<i class="fas fa-wallet" style="color: #005ce6; font-size: 16px;"></i>';
            } else if (method.provider === 'paymaya') {
                accentColor = '#059669';
                providerTitle = 'Maya';
                providerIcon = '<i class="fas fa-mobile-alt" style="color: #059669; font-size: 16px;"></i>';
            } else {
                accentColor = '#1e293b';
                providerTitle = method.cardType || 'Card';
                providerIcon = '<i class="far fa-credit-card" style="color: #8b1e28; font-size: 16px;"></i>';
            }

            card.style.cssText = `
                border: ${isSelected ? `2px solid ${accentColor}` : '1px solid #cbd5e1'};
                background: ${isSelected ? (method.provider === 'gcash' ? '#eff6ff' : (method.provider === 'paymaya' ? '#f0fdf4' : '#fff5f5')) : '#ffffff'};
                border-radius: 10px;
                padding: 12px 10px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: ${isSelected ? '0 4px 10px rgba(0,0,0,0.06)' : 'none'};
            `;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${providerIcon}
                        <strong style="font-size: 13px; color: ${accentColor};">${providerTitle}</strong>
                    </div>
                    ${method.isPrimary ? '<span style="font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px;">Primary</span>' : ''}
                </div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a; font-family: monospace; letter-spacing: 0.5px;">
                    ${method.accountNumber}
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${method.accountName}
                </div>
            `;

            card.addEventListener('click', () => {
                selectedUserPaymentAccount = method;
                selectedPaymentMethod = method.provider === 'paymaya' ? 'maya' : method.provider;
                renderCheckoutPaymentMethods();
                renderPaymentAccountDetails();
            });

            grid.appendChild(card);
        });

        if (fulfillmentType === 'delivery' && !selectedUserPaymentAccount && methods.length > 0) {
            selectedUserPaymentAccount = methods.find(m => m.isPrimary) || methods[0];
            selectedPaymentMethod = selectedUserPaymentAccount.provider === 'paymaya' ? 'maya' : selectedUserPaymentAccount.provider;
        }
    }

    // Render interactive payment receiving instructions & details for selected added account
    function renderPaymentAccountDetails() {
        if (!pay_details_content) return;
        const { selectedSubtotal } = getSelectedTotals();
        const shipping = selectedSubtotal > 0 && fulfillmentType === 'delivery' ? SHIPPING_FEE : 0;
        const total = Math.max(0, selectedSubtotal - discount + shipping);

        // CASE 1: Cash on Store Pick-up
        if (fulfillmentType === 'pickup' && (selectedPaymentMethod === 'cash' || !selectedUserPaymentAccount)) {
            if (pay_verification_inputs) pay_verification_inputs.style.display = 'none';
            if (payment_error_msg) payment_error_msg.style.display = 'none';

            pay_details_content.innerHTML = `
                <div style="background: #ffffff; border: 1px solid #86efac; border-radius: 8px; padding: 14px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: #166534; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-money-bill-wave" style="color: #16a34a;"></i> Cash Payment at Counter
                        </strong>
                        <span style="font-size: 11px; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Pay on Pick-up</span>
                    </div>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; font-size: 13px;">
                        <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase;">Pick-up Branch</div>
                        <div style="font-weight: 700; color: #0f172a; font-size: 13.5px; margin: 2px 0;">Taurus Bike Store - Marilao Branch</div>
                        <div style="font-size: 11.5px; color: #475569;">Taurus Building, Sandico St, Abangan Sur, Marilao, Bulacan | Mon – Sat: 8:00 AM – 6:00 PM</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px;">
                        <span style="font-size: 12.5px; font-weight: 700; color: #065f46;">Exact Amount to Pay at Counter:</span>
                        <strong style="font-size: 17px; color: #16a34a;">₱${total.toLocaleString()}</strong>
                    </div>
                    <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.45;">
                        <i class="fas fa-check-circle" style="color: #16a34a;"></i> No advance payment required. We will prepare and reserve your items for pick-up. Simply inspect your items and pay cash to the cashier upon claiming.
                    </p>
                </div>
            `;
            return;
        }

        // CASE 2: Linked Electronic Payment
        const currentAccount = selectedUserPaymentAccount || (window.BICOBS_Payments ? window.BICOBS_Payments.getPrimaryMethod() : null);

        if (!currentAccount) {
            if (pay_verification_inputs) pay_verification_inputs.style.display = 'none';
            pay_details_content.innerHTML = `
                <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; text-align: center; color: #64748b; font-size: 13px;">
                    Please select or add a payment method above.
                </div>
            `;
            return;
        }

        const isGcash = currentAccount.provider === 'gcash';
        const isMaya = currentAccount.provider === 'paymaya' || currentAccount.provider === 'maya';
        const isCard = currentAccount.provider === 'card';
        const shopReceivingConfig = isMaya ? PAYMENT_ACCOUNTS.maya : (isGcash ? PAYMENT_ACCOUNTS.gcash : null);

        if (pay_verification_inputs) pay_verification_inputs.style.display = 'flex';

        // Update placeholder and label of verification input based on account type
        const refLabel = document.querySelector('label[for="checkout_payment_ref"]') || document.querySelector('#pay_verification_inputs label');
        if (refLabel) {
            if (isCard) {
                refLabel.innerHTML = '<span style="color: #dc2626;">*</span> Card Security Code (CVV)';
            } else {
                refLabel.innerHTML = '<span style="color: #dc2626;">*</span> Transaction / Reference Number (From Receipt)';
            }
        }
        if (checkout_payment_ref) {
            checkout_payment_ref.placeholder = isCard ? 'Enter 3-digit CVV on back of card' : 'e.g. 13-digit GCash/Maya reference number';
        }
        if (checkout_payment_sender) {
            const defaultSender = currentAccount.accountName || localStorage.getItem('tb_user_name') || '';
            checkout_payment_sender.value = defaultSender;
            checkout_payment_sender.placeholder = 'Account Holder Name';
        }

        if (isCard) {
            pay_details_content.innerHTML = `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: #0f172a; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                            <i class="far fa-credit-card" style="color: #b91c1c;"></i> ${currentAccount.cardType || 'Credit / Debit'} Card Payment
                        </strong>
                        <span style="font-size: 11px; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Authorized Card</span>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; font-size: 13px;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Your Linked Card</div>
                        <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin: 2px 0;">${currentAccount.accountNumber}</div>
                        <div style="font-size: 12px; color: #475569;">Cardholder: ${currentAccount.accountName} ${currentAccount.expDate ? `| Exp: ${currentAccount.expDate}` : ''}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fff5f5; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 700; color: #991b1b;">Amount to Charge:</span>
                        <strong style="font-size: 16px; color: #dc2626;">₱${total.toLocaleString()}</strong>
                    </div>
                    <p style="margin: 0; color: #64748b; font-size: 11.5px; line-height: 1.4;">
                        <i class="fas fa-lock"></i> Your linked card will be charged upon order confirmation. Please enter your 3-digit CVV below for security authorization.
                    </p>
                </div>
            `;
        } else {
            // GCash or Maya
            pay_details_content.innerHTML = `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: #0f172a; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-qrcode" style="color: ${shopReceivingConfig?.badgeBg || '#005ce6'};"></i> ${shopReceivingConfig?.title || 'e-Wallet Payment'}
                        </strong>
                        <button type="button" class="copy_btn_pill" id="btn_copy_pay_account" data-copy="${shopReceivingConfig?.rawNumber || ''}">
                            <i class="fas fa-copy"></i> Copy Store Number
                        </button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; font-size: 12px;">
                            <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Your Saved Account</div>
                            <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin: 1px 0;">${currentAccount.accountNumber}</div>
                            <div style="font-size: 11px; color: #475569;">${currentAccount.accountName}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; font-size: 12px;">
                            <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Store Receiver</div>
                            <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin: 1px 0;">${shopReceivingConfig?.accountNumber || ''}</div>
                            <div style="font-size: 11px; color: #475569;">${shopReceivingConfig?.accountName || ''}</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fff5f5; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 700; color: #991b1b;">Exact Amount to Transfer:</span>
                        <strong style="font-size: 16px; color: #dc2626;">₱${total.toLocaleString()}</strong>
                    </div>
                    <p style="margin: 0; color: #64748b; font-size: 11.5px; line-height: 1.4;">
                        <i class="fas fa-info-circle"></i> Send payment from your registered account above to Taurus Bike. Enter the transaction reference number from your receipt below.
                    </p>
                </div>
            `;

            const copyBtn = document.getElementById('btn_copy_pay_account');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const textToCopy = copyBtn.getAttribute('data-copy');
                    if (navigator.clipboard && textToCopy) {
                        navigator.clipboard.writeText(textToCopy).then(() => {
                            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            setTimeout(() => {
                                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Store Number';
                            }, 2000);
                        });
                    }
                });
            }
        }
    }

    // Open Checkout Modal
    function openCheckoutModal() {
        populateCheckoutPreview();
        updateCheckoutModalSummary();

        // Pre-fill and display user delivery info from Profile
        let userObj = {};
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) userObj = JSON.parse(userStr);
        } catch (e) {}

        const currentName = userObj.name || userObj.fullName || userObj.full_name || localStorage.getItem('tb_user_name') || userObj.username || 'Customer';
        const currentPhone = userObj.phone || userObj.phone_number || localStorage.getItem('tb_user_phone') || '';
        const currentAddress = userObj.address || localStorage.getItem('tb_user_shipping') || '';

        if (checkout_customer_address) {
            checkout_customer_address.value = currentAddress;
        }
        if (checkout_customer_phone) {
            checkout_customer_phone.value = currentPhone;
        }

        if (display_customer_name) {
            display_customer_name.innerHTML = `<i class="fas fa-user-circle" style="color: #dc2626; margin-right: 6px;"></i> ${currentName}`;
        }
        if (display_customer_address) {
            display_customer_address.textContent = currentAddress || 'No delivery address saved. Click Edit to add.';
        }
        if (display_customer_phone) {
            display_customer_phone.innerHTML = `<i class="fas fa-phone-alt" style="font-size: 10px;"></i> ${currentPhone || 'No contact number'}`;
        }

        // Asynchronously refresh user profile from /api/auth/me if logged in
        const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
        if (token) {
            fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.ok ? res.json() : null)
            .then(result => {
                if (result && result.data) {
                    const u = result.data;
                    const liveName = u.name || u.full_name || u.username;
                    const livePhone = u.phone || u.phone_number;
                    const liveAddress = u.address;

                    if (liveName && display_customer_name) {
                        display_customer_name.innerHTML = `<i class="fas fa-user-circle" style="color: #dc2626; margin-right: 6px;"></i> ${liveName}`;
                        localStorage.setItem('tb_user_name', liveName);
                    }
                    if (livePhone) {
                        if (display_customer_phone) display_customer_phone.innerHTML = `<i class="fas fa-phone-alt" style="font-size: 10px;"></i> ${livePhone}`;
                        if (checkout_customer_phone && !checkout_customer_phone.value) checkout_customer_phone.value = livePhone;
                        localStorage.setItem('tb_user_phone', livePhone);
                    }
                    if (liveAddress) {
                        if (display_customer_address) display_customer_address.textContent = liveAddress;
                        if (checkout_customer_address && !checkout_customer_address.value) checkout_customer_address.value = liveAddress;
                        localStorage.setItem('tb_user_shipping', liveAddress);
                    }
                }
            })
            .catch(() => {});
        }

        // Show edit fields if user has no saved address or phone
        if (address_edit_block) {
            if (!currentAddress || !currentPhone) {
                address_edit_block.style.display = 'block';
                if (btn_edit_addr_label) btn_edit_addr_label.textContent = 'Done';
            } else {
                address_edit_block.style.display = 'none';
                if (btn_edit_addr_label) btn_edit_addr_label.textContent = 'Edit';
            }
        }

        // Set fulfillment mode: if user has no saved e-wallets, default directly to Store Pick-up (Cash)
        const hasPayment = window.BICOBS_Payments ? window.BICOBS_Payments.hasMethod() : false;
        if (!hasPayment) {
            fulfillmentType = 'pickup';
        }

        if (fulfillmentType === 'pickup') {
            if (mode_pickup) mode_pickup.checked = true;
            if (mode_delivery) mode_delivery.checked = false;
            if (card_mode_pickup) card_mode_pickup.classList.add('active');
            if (card_mode_delivery) card_mode_delivery.classList.remove('active');
            if (section_delivery_address) section_delivery_address.style.display = 'none';
            if (section_pickup_info) section_pickup_info.style.display = 'block';
            if (delivery_payment_badge) delivery_payment_badge.style.display = 'none';
            if (delivery_payment_notice) delivery_payment_notice.style.display = 'none';
            selectedPaymentMethod = 'cash';
            selectedUserPaymentAccount = null;
        } else {
            if (mode_delivery) mode_delivery.checked = true;
            if (mode_pickup) mode_pickup.checked = false;
            if (card_mode_delivery) card_mode_delivery.classList.add('active');
            if (card_mode_pickup) card_mode_pickup.classList.remove('active');
            if (section_delivery_address) section_delivery_address.style.display = 'block';
            if (section_pickup_info) section_pickup_info.style.display = 'none';
            if (delivery_payment_badge) delivery_payment_badge.style.display = 'inline-block';
            if (delivery_payment_notice) delivery_payment_notice.style.display = 'block';

            const methods = window.BICOBS_Payments ? window.BICOBS_Payments.getMethods() : [];
            selectedUserPaymentAccount = methods.find(m => m.isPrimary) || methods[0] || null;
            selectedPaymentMethod = selectedUserPaymentAccount ? (selectedUserPaymentAccount.provider === 'paymaya' ? 'maya' : selectedUserPaymentAccount.provider) : '';
        }

        // Render available user accounts and selected details
        renderCheckoutPaymentMethods();
        renderPaymentAccountDetails();

        if (checkout_modal) {
            checkout_modal.classList.add('active');
            checkout_modal.style.display = 'flex';
        }
    }

    function closeCheckoutModal() {
        if (checkout_modal) {
            checkout_modal.classList.remove('active');
            checkout_modal.style.display = 'none';
        }
    }

    if (close_checkout_modal) close_checkout_modal.addEventListener('click', closeCheckoutModal);
    if (cancel_checkout_btn) cancel_checkout_btn.addEventListener('click', closeCheckoutModal);

    if (checkout_modal) {
        checkout_modal.addEventListener('click', (e) => {
            if (e.target === checkout_modal) closeCheckoutModal();
        });
    }

    // Populate checkout items preview with SELECTED items only
    function populateCheckoutPreview() {
        if (!checkout_items_preview) return;
        const { selectedItems } = getSelectedTotals();
        checkout_items_preview.innerHTML = '';

        if (selectedItems.length === 0) {
            checkout_items_preview.innerHTML = '<li style="padding: 10px; color: #94a3b8; text-align: center;">No items selected</li>';
            return;
        }

        selectedItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'checkout_item_row';
            li.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 13px;
            `;
            const itemSubtotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1);
            li.innerHTML = `
                <div>
                    <span style="font-weight: 600; color: #0f172a;">${item.name}</span>
                    <span style="color: #64748b; font-size: 12px; margin-left: 6px;">(x${item.quantity})</span>
                </div>
                <strong style="color: #0f172a;">₱${itemSubtotal.toLocaleString()}</strong>
            `;
            checkout_items_preview.appendChild(li);
        });
    }

    function updateCheckoutModalSummary() {
        const { selectedQty, selectedSubtotal } = getSelectedTotals();
        const shipping = 0; // Customer books and pays courier directly
        const total = Math.max(0, selectedSubtotal - discount + shipping);

        if (modal_total_items) modal_total_items.textContent = `${selectedQty} ${selectedQty === 1 ? 'item' : 'items'}`;
        if (modal_subtotal) modal_subtotal.textContent = `₱${selectedSubtotal.toLocaleString()}`;
        if (modal_shipping) modal_shipping.textContent = '₱0.00';
        if (modal_total_price) modal_total_price.textContent = `₱${total.toLocaleString()}`;

        if (modal_discount_row) {
            modal_discount_row.style.display = discount > 0 ? 'flex' : 'none';
            if (modal_discount_amount) modal_discount_amount.textContent = `-₱${discount.toLocaleString()}`;
        }
    }

    // Process Checkout Transaction (POST /api/orders)
    if (confirm_checkout_btn) {
        confirm_checkout_btn.addEventListener('click', async () => {
            const { selectedItems } = getSelectedTotals();
            if (selectedItems.length === 0) {
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Please select at least one item to checkout.', 'warning');
                return;
            }

            const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');

            if (!token && window.BICOBS_Auth) {
                window.BICOBS_Auth.showLoginModal({
                    message: 'Please sign in to confirm and place your order',
                    onSuccess: () => {
                        confirm_checkout_btn.click();
                    }
                });
                return;
            }

            // Validation: Delivery address & Phone
            const customerAddress = (checkout_customer_address?.value || '').trim();
            const customerPhone = (checkout_customer_phone?.value || '').trim();
            const customerNotes = (checkout_customer_notes?.value || '').trim();

            if (fulfillmentType === 'delivery' && !customerAddress) {
                alert('Please enter your complete delivery address.');
                if (checkout_customer_address) checkout_customer_address.focus();
                return;
            }

            if (!customerPhone) {
                alert('Please enter a valid contact phone number.');
                if (checkout_customer_phone) checkout_customer_phone.focus();
                return;
            }

            // CRITICAL VALIDATION: Payment handled first when mode is delivery!
            // Available payment methods must be BPI, Maya, or GCash
            const paymentRef = (checkout_payment_ref?.value || '').trim();
            const paymentSender = (checkout_payment_sender?.value || '').trim();

            const activeProvider = (fulfillmentType === 'pickup' && (!selectedUserPaymentAccount || selectedPaymentMethod === 'cash'))
                ? 'cash'
                : (selectedUserPaymentAccount ? selectedUserPaymentAccount.provider : selectedPaymentMethod);

            if (fulfillmentType === 'delivery') {
                const allowedDeliveryMethods = ['bpi', 'maya', 'paymaya', 'gcash', 'card'];
                if (!allowedDeliveryMethods.includes(activeProvider)) {
                    if (payment_error_msg) {
                        payment_error_msg.textContent = 'For delivery orders, payment must be handled first via your verified payment account.';
                        payment_error_msg.style.display = 'block';
                    }
                    return;
                }

                if (activeProvider === 'card') {
                    if (!paymentRef || paymentRef.length < 3) {
                        if (payment_error_msg) {
                            payment_error_msg.textContent = '⚠️ Please enter your 3-digit Card CVV / security authorization code.';
                            payment_error_msg.style.display = 'block';
                        }
                        if (checkout_payment_ref) checkout_payment_ref.focus();
                        return;
                    }
                } else {
                    if (!paymentRef || paymentRef.length < 5) {
                        if (payment_error_msg) {
                            payment_error_msg.textContent = '⚠️ Payment must be handled first for delivery orders. Please enter your valid payment reference / transaction number.';
                            payment_error_msg.style.display = 'block';
                        }
                        if (checkout_payment_ref) checkout_payment_ref.focus();
                        return;
                    }
                }
            } else if (fulfillmentType === 'pickup' && activeProvider !== 'cash') {
                // If customer is doing store pickup but chose to pay upfront via e-wallet or card
                if (!paymentRef) {
                    if (payment_error_msg) {
                        payment_error_msg.textContent = '⚠️ Please enter your payment reference / CVV code, or select "Cash on Pick-up" to pay at the counter.';
                        payment_error_msg.style.display = 'block';
                    }
                    if (checkout_payment_ref) checkout_payment_ref.focus();
                    return;
                }
            }

            if (payment_error_msg) payment_error_msg.style.display = 'none';

            confirm_checkout_btn.disabled = true;
            confirm_checkout_btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

            const { selectedSubtotal } = getSelectedTotals();
            const shipping = 0;
            const finalTotal = Math.max(0, selectedSubtotal - discount + shipping);

            const finalPaymentRef = (fulfillmentType === 'pickup' && activeProvider === 'cash')
                ? 'CASH_ON_PICKUP'
                : paymentRef;

            const paymentSummaryNote = (fulfillmentType === 'pickup' && activeProvider === 'cash')
                ? 'Payment Method: Cash on Store Pick-up (Pay at counter upon claim)'
                : (selectedUserPaymentAccount
                    ? `Paid via ${selectedUserPaymentAccount.provider.toUpperCase()} (${selectedUserPaymentAccount.accountNumber}) | Holder: ${selectedUserPaymentAccount.accountName} | Ref/Auth: ${finalPaymentRef}${paymentSender ? ` | Sender: ${paymentSender}` : ''}`
                    : `Paid via ${(activeProvider || 'Cash').toUpperCase()} | Ref: ${finalPaymentRef}${paymentSender ? ` | Sender: ${paymentSender}` : ''}`);

            const orderPayload = {
                orderItems: selectedItems.map(item => ({
                    product: item.id || item._id,
                    quantity: item.quantity
                })),
                shippingAddress: {
                    street: fulfillmentType === 'delivery' ? customerAddress : 'Store Pick-up (Taurus Bike Marilao)',
                    city: 'Marilao',
                    province: 'Bulacan',
                    phone: customerPhone
                },
                fulfillmentType: fulfillmentType,
                paymentMethod: (activeProvider === 'paymaya' || activeProvider === 'maya') ? 'maya' : (activeProvider || 'cash'),
                deliveryFee: 0,
                discount: discount,
                paymentReference: finalPaymentRef,
                notes: customerNotes ? `${customerNotes} [${paymentSummaryNote}]` : paymentSummaryNote
            };

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(orderPayload)
                });

                const data = await res.json();

                if (res.status === 401 && window.BICOBS_Auth) {
                    window.BICOBS_Auth.clearAuth();
                    window.BICOBS_Auth.showLoginModal({
                        message: 'Your session expired. Please sign in to confirm your order',
                        onSuccess: () => {
                            confirm_checkout_btn.click();
                        }
                    });
                    return;
                }

                if (res.ok && data.status === 'success') {
                    // Order confirmed!
                    closeCheckoutModal();

                    if (success_txn_id) success_txn_id.textContent = `#${data.data.orderNumber || data.data._id.slice(-8).toUpperCase()}`;
                    if (success_total_paid) success_total_paid.textContent = `₱${finalTotal.toLocaleString()}`;

                    if (order_success_modal) {
                        order_success_modal.classList.add('active');
                        order_success_modal.style.display = 'flex';
                    }

                    // Remove ONLY the ordered selected items from cart
                    const orderedIds = selectedItems.map(i => String(i.id || i._id));
                    if (window.BICOBS_Cart && typeof window.BICOBS_Cart.removeItemsFromCart === 'function') {
                        window.BICOBS_Cart.removeItemsFromCart(orderedIds);
                    } else if (window.BICOBS_Cart) {
                        orderedIds.forEach(id => window.BICOBS_Cart.removeFromCart(id));
                    }

                    // Clean up selection state
                    orderedIds.forEach(id => selectedItemIds.delete(id));
                    renderCart();

                    if (window.BICOBS_Cart) {
                        const toastMsg = (fulfillmentType === 'pickup' && activeProvider === 'cash')
                            ? 'Order reserved! Please pay in cash upon claiming at our Marilao counter.'
                            : `Order confirmed! Payment handled via ${(activeProvider || 'Cash').toUpperCase()}.`;
                        window.BICOBS_Cart.showToast(toastMsg, 'success');
                    }
                } else {
                    alert(data.message || 'Failed to place order. Please verify your details.');
                }
            } catch (err) {
                console.error('Order creation error:', err);
                alert('Connection error. Please check your internet connection.');
            } finally {
                confirm_checkout_btn.disabled = false;
                confirm_checkout_btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Transaction';
            }
        });
    }

    if (close_success_modal) {
        close_success_modal.addEventListener('click', () => {
            if (order_success_modal) {
                order_success_modal.classList.remove('active');
                order_success_modal.style.display = 'none';
            }
            window.location.href = '/frontend/pages/Dashboard/myorders.html';
        });
    }

    // Initialize fulfillment and payment handlers
    setupFulfillmentAndPayment();

    // Initial render
    renderCart();
});
