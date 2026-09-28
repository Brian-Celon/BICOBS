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
                <li class="empty_cart_message" style="text-align: center; padding: 48px 16px; list-style: none;">
                    <div style="font-size: 48px; color: #94a3b8; margin-bottom: 16px;"><i class="fas fa-shopping-cart"></i></div>
                    <h3 style="font-size: 20px; color: #1e293b; margin-bottom: 8px;">Your cart is currently empty</h3>
                    <p style="color: #64748b; margin-bottom: 24px;">Discover our bicycles, frames, components, and accessories.</p>
                    <a href="/frontend/pages/shop.html" class="btn_modal_submit" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; padding: 12px 24px; border-radius: 6px; background-color: #dc2626; color: #ffffff;">
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
            const li = document.createElement('li');
            li.className = 'cart_item_row';
            li.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                border-bottom: 1px solid #e2e8f0;
                gap: 16px;
                flex-wrap: wrap;
                list-style: none;
            `;

            const itemSubtotal = (item.price || 0) * (item.quantity || 1);

            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 240px;">
                    <img src="${item.imageUrl || '/frontend/Pictures/placeholder.png'}" alt="${item.name}" style="width: 72px; height: 72px; object-fit: contain; background: #f8fafc; border-radius: 8px; padding: 4px; border: 1px solid #e2e8f0;" onerror="this.onerror=null; this.src='/frontend/Pictures/placeholder.png';">
                    <div>
                        <h4 style="font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">${item.name}</h4>
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">${(item.category || 'Product').replace(/_/g, ' ')}</span>
                        <div style="font-size: 14px; font-weight: 600; color: #dc2626; margin-top: 4px;">₱${(item.price || 0).toLocaleString()}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div class="quantity_control_box" style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff;">
                        <button type="button" class="btn_qty_minus" data-id="${item.id}" style="width: 32px; height: 32px; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center;">-</button>
                        <span style="min-width: 36px; text-align: center; font-weight: 600; font-size: 14px;">${item.quantity}</span>
                        <button type="button" class="btn_qty_plus" data-id="${item.id}" style="width: 32px; height: 32px; border: none; background: #f1f5f9; cursor: pointer; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center;">+</button>
                    </div>
                    <div style="min-width: 90px; text-align: right; font-weight: 700; color: #0f172a; font-size: 15px;">
                        ₱${itemSubtotal.toLocaleString()}
                    </div>
                    <button type="button" class="btn_item_delete" data-id="${item.id}" title="Remove item" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px; padding: 6px;">
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

        if (total_items_el) total_items_el.textContent = `${totalItems} items`;
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
                const item = cart.find(i => i.id === id);
                if (item) {
                    window.BICOBS_Cart.updateQuantity(id, item.quantity - 1);
                    renderCart();
                }
            } else if (plusBtn && window.BICOBS_Cart) {
                const id = plusBtn.getAttribute('data-id');
                const cart = window.BICOBS_Cart.getCart();
                const item = cart.find(i => i.id === id);
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
            } else if (code === 'SAVE500') {
                discount = Math.min(subtotal, 500);
                if (discount_msg) {
                    discount_msg.textContent = '✓ SAVE500 applied (₱500 OFF discount)!';
                    discount_msg.style.color = '#16a34a';
                }
            } else {
                discount = 0;
                if (discount_msg) {
                    discount_msg.textContent = 'Invalid or expired discount coupon.';
                    discount_msg.style.color = '#dc2626';
                }
            }

            renderCart();
            populateModalSummary();
        });
    }

    // Populate checkout modal items & totals
    function populateModalSummary() {
        const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
        if (!checkout_items_preview) return;

        checkout_items_preview.innerHTML = '';
        cart.forEach(item => {
            const li = document.createElement('li');
            li.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px dashed #e2e8f0;';
            li.innerHTML = `
                <span>${item.name} <strong style="color: #64748b;">x${item.quantity}</strong></span>
                <span style="font-weight: 600;">₱${((item.price || 0) * item.quantity).toLocaleString()}</span>
            `;
            checkout_items_preview.appendChild(li);
        });

        const subtotal = window.BICOBS_Cart ? window.BICOBS_Cart.getCartSubtotal() : 0;
        const totalItems = window.BICOBS_Cart ? window.BICOBS_Cart.getCartCount() : 0;
        const shipping = subtotal > 0 && fulfillmentType === 'delivery' ? SHIPPING_FEE : 0;
        const total = Math.max(0, subtotal - discount + shipping);

        if (modal_total_items) modal_total_items.textContent = `${totalItems} items`;
        if (modal_subtotal) modal_subtotal.textContent = `₱${subtotal.toLocaleString()}`;
        if (modal_shipping) modal_shipping.textContent = shipping > 0 ? `₱${shipping.toFixed(2)}` : 'FREE';
        if (modal_total_price) modal_total_price.textContent = `₱${total.toLocaleString()}`;

        if (modal_discount_row) {
            modal_discount_row.style.display = discount > 0 ? 'flex' : 'none';
            if (modal_discount_amount) modal_discount_amount.textContent = `-₱${discount.toLocaleString()}`;
        }
    }

    // Open Checkout Modal
    if (btn_checkout) {
        btn_checkout.addEventListener('click', () => {
            const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
            if (cart.length === 0) {
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Your cart is empty!', 'warning');
                return;
            }
            populateModalSummary();
            if (checkout_modal) {
                checkout_modal.classList.add('active');
                checkout_modal.style.display = 'flex';
            }
        });
    }

    // Close Checkout Modal
    function closeModal() {
        if (checkout_modal) {
            checkout_modal.classList.remove('active');
            checkout_modal.style.display = 'none';
        }
    }

    if (close_checkout_modal) close_checkout_modal.addEventListener('click', closeModal);
    if (cancel_checkout_btn) cancel_checkout_btn.addEventListener('click', closeModal);

    // Close Success Modal
    if (close_success_modal) {
        close_success_modal.addEventListener('click', () => {
            if (order_success_modal) {
                order_success_modal.classList.remove('active');
                order_success_modal.style.display = 'none';
            }
            renderCart();
        });
    }

    // Process Checkout Transaction (POST /api/orders)
    if (confirm_checkout_btn) {
        confirm_checkout_btn.addEventListener('click', async () => {
            const cart = window.BICOBS_Cart ? window.BICOBS_Cart.getCart() : [];
            if (cart.length === 0) return;

            confirm_checkout_btn.disabled = true;
            confirm_checkout_btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

            const subtotal = window.BICOBS_Cart.getCartSubtotal();
            const shipping = subtotal > 0 && fulfillmentType === 'delivery' ? SHIPPING_FEE : 0;
            const finalTotal = Math.max(0, subtotal - discount + shipping);

            const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');

            // If no token exists, redirect to login page with cart redirect
            if (!token) {
                alert('Please sign in or create an account before completing your checkout.');
                window.location.href = '/frontend/pages/login.html?redirect=cart';
                return;
            }

            // Read user info for delivery details
            let userObj = {};
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) userObj = JSON.parse(userStr);
            } catch (e) {}

            const customerPhone = userObj.phone || localStorage.getItem('tb_user_phone') || '+63 912 345 6789';
            const customerAddress = userObj.address || localStorage.getItem('tb_user_shipping') || 'Sandico St, Marilao, Bulacan';

            const orderPayload = {
                orderItems: cart.map(item => ({
                    product: item.id,
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

                if (res.ok && data.status === 'success') {
                    // Order confirmed!
                    closeModal();

                    if (success_txn_id) success_txn_id.textContent = `#${data.data._id.slice(-8).toUpperCase()}`;
                    if (success_total_paid) success_total_paid.textContent = `₱${finalTotal.toLocaleString()}`;

                    if (order_success_modal) {
                        order_success_modal.classList.add('active');
                        order_success_modal.style.display = 'flex';
                    }

                    // Clear Cart
                    window.BICOBS_Cart.clearCart();
                    window.BICOBS_Cart.showToast('Transaction confirmed! Stock updated.', 'success');
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

    // Initial render
    renderCart();
});
