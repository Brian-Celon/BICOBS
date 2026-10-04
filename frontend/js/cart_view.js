/**
 * BICOBS - My Cart View & Checkout Controller
 * Powers dynamic cart rendering, quantity changes, discounts, and real-time checkout API submission.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const cart_list_el = document.getElementById('cart_item_list');
    const total_items_el = document.getElementById('cart_total_items');
    const subtotal_el = document.getElementById('cart_subtotal');
    const shipping_el = document.getElementById('cart_shipping');
    const total_price_el = document.getElementById('cart_total_price');
    const discount_row = document.getElementById('cart_discount_row');
    const discount_amount_el = document.getElementById('cart_discount_amount');
    const btn_checkout = document.getElementById('btn_checkout');

    // Checkout Modal Elements
    const checkout_modal = document.getElementById('checkout_modal');
    const close_checkout_modal = document.getElementById('close_checkout_modal');
    const cancel_checkout_btn = document.getElementById('cancel_checkout_btn');
    const confirm_checkout_btn = document.getElementById('confirm_checkout_btn');
    const checkout_items_preview = document.getElementById('checkout_items_preview');
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

    // State
    let discount = 0;
    let fulfillmentType = 'delivery'; // 'delivery' | 'pickup'
    const SHIPPING_FEE = 150;

    // Render cart items
    function renderCart() {
        if (!cart_list_el) return;
        const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];

        if (cart.length === 0) {
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
            updateSummaryTotals(0, 0);
            return;
        }

        if (btn_checkout) {
            btn_checkout.disabled = false;
            btn_checkout.style.opacity = '1';
            btn_checkout.style.cursor = 'pointer';
        }

        cart_list_el.innerHTML = '';

        cart.forEach(item => {
            const itemId = String(item.id || item._id);
            const itemName = item.name || 'Product';
            const itemPrice = parseFloat(item.price) || 0;
            const itemQty = parseInt(item.quantity, 10) || 1;
            const itemSubtotal = itemPrice * itemQty;
            const itemImg = item.imageUrl || item.image || '/frontend/Pictures/placeholder.png';
            const itemCat = (item.category || 'Product').replace(/_/g, ' ');

            const li = document.createElement('li');
            li.className = 'cart_item_card';
            li.setAttribute('data-id', itemId);
            li.style.cssText = `
                background: #fafbfc;
                border: 1px solid #eef1f5;
                border-radius: 10px;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
                margin-bottom: 12px;
                list-style: none;
            `;

            li.innerHTML = `
                <div style="width: 70px; height: 70px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; padding: 4px;">
                    <img src="${itemImg}" alt="${itemName}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='/frontend/Pictures/placeholder.png';">
                </div>
                <div class="item_details" style="flex: 1; min-width: 200px;">
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${itemCat}</span>
                    <h4 class="item_name" style="font-size: 15px; color: #0f172a; margin: 4px 0 6px; font-weight: 600;">${itemName}</h4>
                    <div class="item_price" style="font-size: 15px; color: #dc2626; font-weight: 700;">₱${itemPrice.toLocaleString()}</div>
                </div>
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

        const subtotal = window.BICOBS_Cart.getCartSubtotal();
        const totalItems = window.BICOBS_Cart.getCartCount();
        updateSummaryTotals(subtotal, totalItems);
    }

    // Update order summary values
    function updateSummaryTotals(subtotal, totalItems) {
        const shipping = subtotal > 0 && fulfillmentType === 'delivery' ? SHIPPING_FEE : 0;
        const total = Math.max(0, subtotal - discount + shipping);

        if (total_items_el) total_items_el.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
        if (subtotal_el) subtotal_el.textContent = `₱${subtotal.toLocaleString()}`;
        if (shipping_el) shipping_el.textContent = shipping > 0 ? `₱${shipping.toFixed(2)}` : 'FREE / ₱0.00';
        if (total_price_el) total_price_el.textContent = `₱${total.toLocaleString()}`;

        if (discount_row) {
            discount_row.style.display = discount > 0 ? 'flex' : 'none';
            if (discount_amount_el) discount_amount_el.textContent = `-₱${discount.toLocaleString()}`;
        }
    }

    // Cart item interactions (delegated event listener)
    if (cart_list_el) {
        cart_list_el.addEventListener('click', (e) => {
            const minusBtn = e.target.closest('.btn_qty_minus');
            const plusBtn = e.target.closest('.btn_qty_plus');
            const deleteBtn = e.target.closest('.btn_item_delete');

            if (minusBtn && window.BICOBS_Cart) {
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
                window.BICOBS_Cart.removeFromCart(id);
                renderCart();
            }
        });
    }

    // Listen for custom cart updates
    window.addEventListener('bicobs_cart_updated', renderCart);

    // Empty Cart Button
    const btn_clear_cart_all = document.getElementById('btn_clear_cart_all');
    if (btn_clear_cart_all) {
        btn_clear_cart_all.addEventListener('click', () => {
            if (confirm('Are you sure you want to empty your shopping cart?')) {
                if (window.BICOBS_Cart) {
                    window.BICOBS_Cart.clearCart();
                    window.BICOBS_Cart.showToast('Cart has been emptied', 'info');
                }
                renderCart();
            }
        });
    }

    // Apply discount code
    if (btn_apply_discount) {
        btn_apply_discount.addEventListener('click', () => {
            const code = (discount_input?.value || '').trim().toUpperCase();
            const subtotal = window.BICOBS_Cart ? window.BICOBS_Cart.getCartSubtotal() : 0;

            if (!code) {
                if (discount_msg) {
                    discount_msg.textContent = 'Please enter a valid discount code.';
                    discount_msg.style.color = '#dc2626';
                }
                return;
            }

            if (code === 'TAURUS10') {
                discount = Math.round(subtotal * 0.10);
                if (discount_msg) {
                    discount_msg.textContent = '✓ TAURUS10 applied (10% OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else if (code === 'TAURUS20') {
                discount = Math.round(subtotal * 0.20);
                if (discount_msg) {
                    discount_msg.textContent = '✓ TAURUS20 applied (20% OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else if (code === 'SAVE500') {
                discount = Math.min(subtotal, 500);
                if (discount_msg) {
                    discount_msg.textContent = '✓ SAVE500 applied (₱500 OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else if (code === 'FREE1000') {
                discount = Math.min(subtotal, 1000);
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
            renderCart();
            updateCheckoutModalSummary();
        });
    }

    // Checkout Modal interactions
    if (btn_checkout) {
        btn_checkout.addEventListener('click', () => {
            const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
            if (cart.length === 0) {
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Your cart is empty', 'warning');
                return;
            }

            // Require auth before proceeding to checkout modal
            if (window.BICOBS_Auth && !window.BICOBS_Auth.isAuthenticated()) {
                window.BICOBS_Auth.showLoginModal({
                    message: 'Please sign in to confirm and place your order',
                    onSuccess: () => {
                        openCheckoutModal();
                    }
                });
                return;
            }

            openCheckoutModal();
        });
    }

    function openCheckoutModal() {
        populateCheckoutPreview();
        updateCheckoutModalSummary();
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

    function populateCheckoutPreview() {
        if (!checkout_items_preview) return;
        const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
        checkout_items_preview.innerHTML = '';

        cart.forEach(item => {
            const li = document.createElement('li');
            li.className = 'checkout_item_row';
            li.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
            `;
            const itemSubtotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1);
            li.innerHTML = `
                <div>
                    <span style="font-weight: 600; color: #0f172a;">${item.name}</span>
                    <span style="color: #64748b; font-size: 13px; margin-left: 6px;">(x${item.quantity})</span>
                </div>
                <strong style="color: #0f172a;">₱${itemSubtotal.toLocaleString()}</strong>
            `;
            checkout_items_preview.appendChild(li);
        });
    }

    function updateCheckoutModalSummary() {
        const subtotal = window.BICOBS_Cart ? window.BICOBS_Cart.getCartSubtotal() : 0;
        const totalItems = window.BICOBS_Cart ? window.BICOBS_Cart.getCartCount() : 0;
        const shipping = subtotal > 0 && fulfillmentType === 'delivery' ? SHIPPING_FEE : 0;
        const total = Math.max(0, subtotal - discount + shipping);

        if (modal_total_items) modal_total_items.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
        if (modal_subtotal) modal_subtotal.textContent = `₱${subtotal.toLocaleString()}`;
        if (modal_shipping) modal_shipping.textContent = shipping > 0 ? `₱${shipping.toFixed(2)}` : 'FREE / ₱0.00';
        if (modal_total_price) modal_total_price.textContent = `₱${total.toLocaleString()}`;

        if (modal_discount_row) {
            modal_discount_row.style.display = discount > 0 ? 'flex' : 'none';
            if (modal_discount_amount) modal_discount_amount.textContent = `-₱${discount.toLocaleString()}`;
        }
    }

    // Process Checkout Transaction (POST /api/orders)
    if (confirm_checkout_btn) {
        confirm_checkout_btn.addEventListener('click', async () => {
            const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
            if (cart.length === 0) return;

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

            confirm_checkout_btn.disabled = true;
            confirm_checkout_btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

            const subtotal = window.BICOBS_Cart.getCartSubtotal();
            const shipping = subtotal > 0 && fulfillmentType === 'delivery' ? SHIPPING_FEE : 0;
            const finalTotal = Math.max(0, subtotal - discount + shipping);

            // Read user info for delivery details
            let userObj = {};
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) userObj = JSON.parse(userStr);
            } catch (e) {}

            const customerPhone = userObj.phone || localStorage.getItem('tb_user_phone') || '09171234567';
            const customerAddress = userObj.address || localStorage.getItem('tb_user_shipping') || 'Sandico St, Abangan Sur, Marilao, Bulacan';

            const orderPayload = {
                orderItems: cart.map(item => ({
                    product: item.id || item._id,
                    quantity: item.quantity
                })),
                shippingAddress: {
                    street: customerAddress,
                    city: 'Marilao',
                    province: 'Bulacan',
                    phone: customerPhone
                },
                fulfillmentType: fulfillmentType,
                paymentMethod: 'cash',
                deliveryFee: shipping
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

                    if (success_txn_id) success_txn_id.textContent = `#${data.data._id.slice(-8).toUpperCase()}`;
                    if (success_total_paid) success_total_paid.textContent = `₱${finalTotal.toLocaleString()}`;

                    if (order_success_modal) {
                        order_success_modal.classList.add('active');
                        order_success_modal.style.display = 'flex';
                    }

                    // Clear Cart
                    window.BICOBS_Cart.clearCart();
                    if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Transaction confirmed! Stock updated.', 'success');
                } else {
                    alert(data.message || 'Failed to place order. Please try again.');
                }
            } catch (err) {
                console.error('Order creation error:', err);
                alert('Connection error. Please check server connection.');
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

    // Initial render
    renderCart();
});
