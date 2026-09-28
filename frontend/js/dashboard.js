/* dashboard interactivity script */

/* listen for DOM content load */
document.addEventListener("DOMContentLoaded", () => {
    /* initialize dashboard functionalities */
    setup_sidebar_links();
    setup_site_navigation();
    setup_responsive_search();
    setup_payment_modal();
    setup_ticket_modal();
    setup_global_keyboard();
    setup_profile_sync();
    setup_profile_navigation();
    setup_shopping_cart();
    setup_password_visibility();
    setup_search_and_filters();
    setup_add_to_cart_buttons();
    setup_order_details_modal();
    setup_ticket_chat_modal();
    setup_logout_modal();
    setup_products_catalog();
});

/* setup responsive mobile search bar dropdown */
function setup_responsive_search() {
    const searchBtn = document.getElementById('mobile_search_btn');
    const closeBtn = document.getElementById('close_mobile_search');
    const searchExpand = document.getElementById('mobile_search_bar_expand');
    const searchInput = document.getElementById('mobile_search_input');

    if (!searchExpand) return;

    const toggleSearch = () => {
        searchExpand.classList.toggle('active');
        if (searchExpand.classList.contains('active') && searchInput) {
            searchInput.focus();
        }
    };

    const closeSearch = () => {
        searchExpand.classList.remove('active');
    };

    if (searchBtn) searchBtn.addEventListener('click', toggleSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);
}

/* public site hamburger drawer uses the same controls as the Home page */
function setup_site_navigation() {
    const toggleBtn = document.getElementById('mobile_nav_toggle');
    const closeBtn = document.getElementById('mobile_nav_close');
    const siteNav = document.getElementById('dashboard_site_navigation');
    const overlay = document.getElementById('nav_overlay');
    if (!toggleBtn || !siteNav || !overlay) return;

    const closeMenu = () => {
        siteNav.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        toggleBtn.setAttribute('aria-expanded', 'false');
    };
    const openMenu = () => {
        siteNav.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        toggleBtn.setAttribute('aria-expanded', 'true');
    };

    toggleBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
    siteNav.querySelectorAll('.nav_link').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMenu();
    });
}

/* setup sidebar link clicks */
function setup_sidebar_links() {
    const nav_items = document.querySelectorAll('.nav_item');
    nav_items.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href') === '#') {
                e.preventDefault();
                nav_items.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

/* setup profile and location data persistence & sync across overview and profile */
function setup_profile_sync() {
    // Default profile values
    const defaults = {
        name: 'Juan Dela Cruz',
        email: 'juan@taurusbike.ph',
        phone: '+63 917 555 1234',
        shippingAddress: '1991 Roat State, Sector 4, Metro Manila, 19491',
        billingAddress: '2050 Roat State, Sector 4, Metro Manila, 19491'
    };

    // Helper to get stored profile values
    const getProfile = () => ({
        name: localStorage.getItem('tb_user_name') || defaults.name,
        email: localStorage.getItem('tb_user_email') || defaults.email,
        phone: localStorage.getItem('tb_user_phone') || defaults.phone,
        shippingAddress: localStorage.getItem('tb_user_shipping') || defaults.shippingAddress,
        billingAddress: localStorage.getItem('tb_user_billing') || defaults.billingAddress
    });

    // Helper to compute initials from full name
    const getInitials = (fullName) => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 0 || !parts[0]) return 'JD';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Update DOM elements on page with current profile data
    const updateUI = () => {
        const profile = getProfile();
        const initials = getInitials(profile.name);

        // Top navbar avatar circles and welcome card avatar
        const avatars = document.querySelectorAll('.user_avatar, #overview_welcome_avatar');
        avatars.forEach(av => {
            av.textContent = initials;
        });

        // Overview page text displays
        const overviewName = document.getElementById('overview_user_name');
        if (overviewName) overviewName.textContent = profile.name;

        const welcomeName = document.getElementById('overview_welcome_name');
        if (welcomeName) welcomeName.textContent = profile.name;

        const welcomeLoc = document.getElementById('overview_welcome_location');
        if (welcomeLoc) welcomeLoc.textContent = profile.shippingAddress;

        const overviewShipping = document.getElementById('overview_shipping_address');
        if (overviewShipping) overviewShipping.textContent = profile.shippingAddress;

        const overviewBilling = document.getElementById('overview_billing_address');
        if (overviewBilling) overviewBilling.textContent = profile.billingAddress;

        // Profile page input fields initialization
        const nameInput = document.getElementById('full_name_input');
        if (nameInput && !nameInput.dataset.initialized) {
            nameInput.value = profile.name;
            nameInput.dataset.initialized = 'true';
        }

        const emailInput = document.getElementById('email_address_input');
        if (emailInput && !emailInput.dataset.initialized) {
            emailInput.value = profile.email;
            emailInput.dataset.initialized = 'true';
        }

        const phoneInput = document.getElementById('phone_number_input');
        if (phoneInput && !phoneInput.dataset.initialized) {
            phoneInput.value = profile.phone;
            phoneInput.dataset.initialized = 'true';
        }

        const shippingInput = document.getElementById('shipping_address_input');
        if (shippingInput && !shippingInput.dataset.initialized) {
            shippingInput.value = profile.shippingAddress;
            shippingInput.dataset.initialized = 'true';
        }

        const billingInput = document.getElementById('billing_address_input');
        if (billingInput && !billingInput.dataset.initialized) {
            billingInput.value = profile.billingAddress;
            billingInput.dataset.initialized = 'true';
        }
    };

    // Initial load
    updateUI();

    // Attach form submit handler on profile page
    const profileForm = document.getElementById('profile_form');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const newName = document.getElementById('full_name_input')?.value.trim() || defaults.name;
            const newEmail = document.getElementById('email_address_input')?.value.trim() || defaults.email;
            const newPhone = document.getElementById('phone_number_input')?.value.trim() || defaults.phone;
            const newShipping = document.getElementById('shipping_address_input')?.value.trim() || defaults.shippingAddress;
            const newBilling = document.getElementById('billing_address_input')?.value.trim() || defaults.billingAddress;

            localStorage.setItem('tb_user_name', newName);
            localStorage.setItem('tb_user_email', newEmail);
            localStorage.setItem('tb_user_phone', newPhone);
            localStorage.setItem('tb_user_shipping', newShipping);
            localStorage.setItem('tb_user_billing', newBilling);

            updateUI();

            const toast = document.getElementById('profile_save_toast');
            if (toast) {
                toast.style.display = 'inline-flex';
                toast.style.alignItems = 'center';
                toast.style.gap = '6px';
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 3500);
            }
        });
    }
}

/* setup payment method modal popup and provider selection */
function setup_payment_modal() {
    const modal = document.getElementById('payment_modal');
    const open_btn = document.getElementById('btn_open_payment_modal');
    const back_btn = document.getElementById('close_payment_modal_back');
    const cancel_btn = document.getElementById('close_payment_modal_cancel');
    const form = document.getElementById('add_payment_form');
    
    if (!modal) return;

    // Open Modal
    if (open_btn) {
        open_btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
        });
    }

    // Close Modal helper
    const closeModal = () => {
        modal.classList.remove('active');
    };

    if (back_btn) back_btn.addEventListener('click', closeModal);
    if (cancel_btn) cancel_btn.addEventListener('click', closeModal);

    // Close on overlay backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Handle Payment Provider Selection Tabs
    const provider_options = modal.querySelectorAll('.provider_option');
    const form_sections = {
        card: document.getElementById('provider_card_fields'),
        gcash: document.getElementById('provider_gcash_fields'),
        paymaya: document.getElementById('provider_paymaya_fields')
    };

    provider_options.forEach(opt => {
        opt.addEventListener('click', () => {
            const selectedProvider = opt.getAttribute('data-provider');
            
            // Toggle active tab style
            provider_options.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');

            // Toggle form sections visibility
            Object.keys(form_sections).forEach(key => {
                if (form_sections[key]) {
                    form_sections[key].style.display = (key === selectedProvider) ? 'block' : 'none';
                }
            });
        });
    });

    // Handle Form Submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Determine active provider
            const activeOpt = modal.querySelector('.provider_option.active');
            const provider = activeOpt ? activeOpt.getAttribute('data-provider') : 'card';
            const isPrimary = document.getElementById('is_primary_payment')?.checked || false;

            const cardsGrid = document.querySelector('.payment_cards_grid');
            if (cardsGrid) {
                const newCard = document.createElement('article');
                
                if (provider === 'card') {
                    const cardNum = document.getElementById('card_number').value || '•••• •••• •••• 1234';
                    const expDate = document.getElementById('exp_date').value || '12/30';
                    const holderName = document.getElementById('cardholder_name').value || 'Juan Dela Cruz';
                    const last4 = cardNum.replace(/\s+/g, '').slice(-4) || '1234';

                    newCard.className = 'payment_card_item card_taurus';
                    newCard.innerHTML = `
                        <div class="card_top_row">
                            <span>Credit / Debit Card</span>
                            <span class="card_visa_badge">VISA</span>
                        </div>
                        <div>
                            <div class="card_field_label">Card Number</div>
                            <div class="card_number_text">•••• •••• •••• ${last4}</div>
                        </div>
                        <div class="card_bottom_row">
                            <div>
                                <div class="card_field_label">Cardholder</div>
                                <strong>${holderName}</strong>
                            </div>
                            <div style="text-align: right;">
                                <div class="card_field_label">Expires</div>
                                <strong>${expDate}</strong>
                            </div>
                        </div>
                    `;
                } else if (provider === 'gcash') {
                    const mobileNum = document.getElementById('gcash_number').value || '+63 917 ••• 0000';
                    const holderName = document.getElementById('gcash_name').value || 'Juan Dela Cruz';

                    newCard.className = 'payment_card_item card_gcash';
                    newCard.innerHTML = `
                        <div class="card_top_row">
                            <span>GCash / Wallet</span>
                            <i class="fas fa-wallet" style="font-size: 20px;"></i>
                        </div>
                        <div>
                            <div class="card_field_label">Mobile Account</div>
                            <div class="card_number_text">${mobileNum}</div>
                        </div>
                        <div class="card_bottom_row">
                            <div>
                                <div class="card_field_label">Account Name</div>
                                <strong>${holderName}</strong>
                            </div>
                            <div>
                                ${isPrimary ? '<span class="card_primary_badge">Primary</span>' : ''}
                            </div>
                        </div>
                    `;
                } else if (provider === 'paymaya') {
                    const mobileNum = document.getElementById('paymaya_number').value || '+63 918 ••• 0000';
                    const holderName = document.getElementById('paymaya_name').value || 'Juan Dela Cruz';

                    newCard.className = 'payment_card_item card_taurus';
                    newCard.style.backgroundColor = '#00a859';
                    newCard.innerHTML = `
                        <div class="card_top_row">
                            <span>PayMaya Wallet</span>
                            <i class="fas fa-mobile-alt" style="font-size: 20px;"></i>
                        </div>
                        <div>
                            <div class="card_field_label">Mobile Account</div>
                            <div class="card_number_text">${mobileNum}</div>
                        </div>
                        <div class="card_bottom_row">
                            <div>
                                <div class="card_field_label">Account Name</div>
                                <strong>${holderName}</strong>
                            </div>
                            <div>
                                ${isPrimary ? '<span class="card_primary_badge">Primary</span>' : ''}
                            </div>
                        </div>
                    `;
                }

                cardsGrid.appendChild(newCard);
            }

            form.reset();
            closeModal();
        });
    }
}

/* setup support ticket modal popup */
function setup_ticket_modal() {
    const modal = document.getElementById('ticket_modal');
    const open_btn = document.getElementById('btn_open_ticket_modal');
    const close_x = document.getElementById('close_ticket_modal_x');
    const cancel_btn = document.getElementById('close_ticket_modal_cancel');
    const form = document.getElementById('create_ticket_form');

    if (!modal) return;

    // Open Modal
    if (open_btn) {
        open_btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
        });
    }

    // Close Modal helper
    const closeModal = () => {
        modal.classList.remove('active');
    };

    if (close_x) close_x.addEventListener('click', closeModal);
    if (cancel_btn) cancel_btn.addEventListener('click', closeModal);

    // Close on overlay backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Handle Form Submit
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const subject = document.getElementById('ticket_subject').value || 'General Inquiry';
            const category = document.getElementById('ticket_category').value || 'Support';
            const ticketList = document.querySelector('.ticket_list');

            if (ticketList) {
                const randomId = Math.floor(1000 + Math.random() * 9000);
                const todayStr = new Date().toISOString().split('T')[0];

                const newTicket = document.createElement('li');
                newTicket.className = 'ticket_card';
                newTicket.innerHTML = `
                    <div class="ticket_info">
                        <div class="ticket_title_row">
                            <h4 class="ticket_title">#TCK-${randomId}: ${subject} (${category})</h4>
                            <span class="ticket_status_open">Open</span>
                        </div>
                        <p class="ticket_meta">Created on ${todayStr} • 1 message in thread</p>
                    </div>
                    <a href="#" class="btn_open_chat">Open Chat</a>
                `;

                ticketList.prepend(newTicket);
            }

            form.reset();
            closeModal();
        });
    }
}

/* Close active modals on Escape key press */
function setup_global_keyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModals = document.querySelectorAll('.modal_overlay.active');
            activeModals.forEach(modal => modal.classList.remove('active'));
        }
    });
}

/* setup profile navigation to redirect directly to profile.html */
function setup_profile_navigation() {
    const avatars = document.querySelectorAll('.user_avatar');
    avatars.forEach(avatar => {
        avatar.style.cursor = 'pointer';
        avatar.addEventListener('click', (e) => {
            if (!avatar.closest('a')) {
                window.location.href = 'profile.html';
            }
        });
    });
}

/* Shopping Cart Interactivity, Quantity Updates, Delete Handling, Totals & Checkout Modal */
function setup_shopping_cart() {
    const cartList = document.getElementById('cart_item_list') || document.querySelector('.cart_item_list');
    const orderSummary = document.querySelector('.order_summary_section');

    if (!cartList && !orderSummary) return;

    // Table of valid discount codes
    const validDiscounts = {
        'TAURUS10': { type: 'percent', val: 10, label: '10% OFF' },
        'TAURUS20': { type: 'percent', val: 20, label: '20% OFF' },
        'BICOBS15': { type: 'percent', val: 15, label: '15% OFF' },
        'SAVE500': { type: 'fixed', val: 500, label: '₱500 OFF' },
        'FREE1000': { type: 'fixed', val: 1000, label: '₱1,000 OFF' }
    };

    let activeDiscount = null;

    // Helper to compute subtotal and totals from DOM item cards
    function calculateTotals() {
        const itemCards = document.querySelectorAll('.cart_item_card');
        let totalQty = 0;
        let subtotal = 0;
        const items = [];

        itemCards.forEach(card => {
            const nameEl = card.querySelector('.item_name');
            const priceEl = card.querySelector('.item_price');
            const qtyEl = card.querySelector('.qty_value');

            if (priceEl && qtyEl) {
                let unitPrice = parseFloat(card.getAttribute('data-unit-price') || priceEl.getAttribute('data-unit-price'));
                if (isNaN(unitPrice)) {
                    unitPrice = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) || 0;
                    priceEl.setAttribute('data-unit-price', unitPrice);
                    card.setAttribute('data-unit-price', unitPrice);
                }

                const qty = parseInt(qtyEl.textContent, 10) || 1;
                const name = nameEl ? nameEl.textContent.trim() : 'Item';

                totalQty += qty;
                subtotal += unitPrice * qty;
                items.push({ name, qty, unitPrice, itemTotal: unitPrice * qty });
            }
        });

        const shippingFee = (itemCards.length > 0) ? 150 : 0;

        let discountAmount = 0;
        if (activeDiscount) {
            if (activeDiscount.type === 'percent') {
                discountAmount = (subtotal * activeDiscount.val) / 100;
            } else if (activeDiscount.type === 'fixed') {
                discountAmount = Math.min(subtotal, activeDiscount.val);
            }
        }

        const total = Math.max(0, subtotal - discountAmount + shippingFee);

        return { itemCardsCount: itemCards.length, totalQty, subtotal, discountAmount, shippingFee, total, items };
    }

    // Main update UI function for Cart page & badges
    function updateCartUI() {
        const data = calculateTotals();

        // Update Order Summary on Cart Page
        const totalItemsEl = document.getElementById('cart_total_items');
        const subtotalEl = document.getElementById('cart_subtotal');
        const discountRowEl = document.getElementById('cart_discount_row');
        const discountAmtEl = document.getElementById('cart_discount_amount');
        const shippingEl = document.getElementById('cart_shipping');
        const totalPriceEl = document.getElementById('cart_total_price');

        if (totalItemsEl) totalItemsEl.textContent = `${data.totalQty} ${data.totalQty === 1 ? 'item' : 'items'}`;
        if (subtotalEl) subtotalEl.textContent = `₱${data.subtotal.toLocaleString('en-US')}`;

        if (discountRowEl && discountAmtEl) {
            if (data.discountAmount > 0) {
                discountRowEl.style.display = 'flex';
                discountAmtEl.textContent = `-₱${data.discountAmount.toLocaleString('en-US')}`;
            } else {
                discountRowEl.style.display = 'none';
            }
        }

        if (shippingEl) shippingEl.textContent = `₱${data.shippingFee.toFixed(2)}`;
        if (totalPriceEl) totalPriceEl.textContent = `₱${data.total.toLocaleString('en-US')}`;

        // Update Top Nav and Sidebar badges
        const badges = document.querySelectorAll('.cart_badge_top, .badge_green');
        badges.forEach(badge => {
            badge.textContent = data.totalQty;
        });

        // Handle Empty Cart View
        const cartSection = document.querySelector('.cart_items_section');
        if (data.itemCardsCount === 0 && cartSection) {
            let emptyState = document.getElementById('cart_empty_msg');
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.id = 'cart_empty_msg';
                emptyState.className = 'cart_empty_state';
                emptyState.innerHTML = `
                    <i class="fas fa-shopping-cart cart_empty_icon"></i>
                    <h3>Your Shopping Cart is Empty</h3>
                    <p>Looks like you haven't added any bike items to your cart yet.</p>
                `;
                if (cartList) cartList.style.display = 'none';
                cartSection.appendChild(emptyState);
            }
        } else if (cartList && data.itemCardsCount > 0) {
            cartList.style.display = 'flex';
            const emptyState = document.getElementById('cart_empty_msg');
            if (emptyState) emptyState.remove();
        }

        return data;
    }

    // Event Listener for Quantity buttons and Delete buttons
    if (cartList) {
        cartList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete_btn');
            const qtyPlusBtn = e.target.closest('.qty_plus') || (e.target.classList.contains('qty_btn') && e.target.textContent.trim() === '+');
            const qtyMinusBtn = e.target.closest('.qty_minus') || (e.target.classList.contains('qty_btn') && e.target.textContent.trim() === '-');

            if (deleteBtn) {
                const card = deleteBtn.closest('.cart_item_card');
                if (card) {
                    card.classList.add('removing');
                    setTimeout(() => {
                        card.remove();
                        updateCartUI();
                    }, 150);
                }
            } else if (qtyPlusBtn) {
                const card = qtyPlusBtn.closest('.cart_item_card');
                const qtyValEl = card.querySelector('.qty_value');
                if (qtyValEl) {
                    let qty = parseInt(qtyValEl.textContent, 10) || 1;
                    qty++;
                    qtyValEl.textContent = qty;
                    updateCartUI();
                }
            } else if (qtyMinusBtn) {
                const card = qtyMinusBtn.closest('.cart_item_card');
                const qtyValEl = card.querySelector('.qty_value');
                if (qtyValEl) {
                    let qty = parseInt(qtyValEl.textContent, 10) || 1;
                    if (qty > 1) {
                        qty--;
                        qtyValEl.textContent = qty;
                        updateCartUI();
                    }
                }
            }
        });
    }

    // Perform initial calculation on load
    updateCartUI();

    // Checkout Confirmation Modal Logic
    const checkoutBtn = document.getElementById('btn_checkout') || document.querySelector('.checkout_button');
    const checkoutModal = document.getElementById('checkout_modal');
    const closeCheckoutBtn = document.getElementById('close_checkout_modal');
    const cancelCheckoutBtn = document.getElementById('cancel_checkout_btn');
    const confirmCheckoutBtn = document.getElementById('confirm_checkout_btn');
    const applyDiscountBtn = document.getElementById('btn_apply_discount');
    const discountInput = document.getElementById('checkout_discount_input');
    const discountMsg = document.getElementById('discount_msg');

    const successModal = document.getElementById('order_success_modal');
    const closeSuccessBtn = document.getElementById('close_success_modal');

    // Populate and open Checkout Modal
    function openCheckoutModal() {
        const data = calculateTotals();
        if (data.itemCardsCount === 0) {
            alert('Your shopping cart is empty! Please add items before checking out.');
            return;
        }

        // Render preview list of items
        const previewContainer = document.getElementById('checkout_items_preview');
        if (previewContainer) {
            previewContainer.innerHTML = data.items.map(item => `
                <li class="checkout_item_row">
                    <span class="checkout_item_name">${item.name}</span>
                    <span class="checkout_item_qty">x${item.qty}</span>
                    <span class="checkout_item_price">₱${item.itemTotal.toLocaleString('en-US')}</span>
                </li>
            `).join('');
        }

        updateModalSummary(data);

        if (checkoutModal) checkoutModal.classList.add('active');
    }

    function updateModalSummary(data) {
        if (!data) data = calculateTotals();

        const modalQty = document.getElementById('modal_total_items');
        const modalSubtotal = document.getElementById('modal_subtotal');
        const modalDiscountRow = document.getElementById('modal_discount_row');
        const modalDiscountAmt = document.getElementById('modal_discount_amount');
        const modalShipping = document.getElementById('modal_shipping');
        const modalTotal = document.getElementById('modal_total_price');

        if (modalQty) modalQty.textContent = `${data.totalQty} ${data.totalQty === 1 ? 'item' : 'items'}`;
        if (modalSubtotal) modalSubtotal.textContent = `₱${data.subtotal.toLocaleString('en-US')}`;

        if (modalDiscountRow && modalDiscountAmt) {
            if (data.discountAmount > 0) {
                modalDiscountRow.style.display = 'flex';
                modalDiscountAmt.textContent = `-₱${data.discountAmount.toLocaleString('en-US')}`;
            } else {
                modalDiscountRow.style.display = 'none';
            }
        }

        if (modalShipping) modalShipping.textContent = `₱${data.shippingFee.toFixed(2)}`;
        if (modalTotal) modalTotal.textContent = `₱${data.total.toLocaleString('en-US')}`;
    }

    const closeCheckout = () => {
        if (checkoutModal) checkoutModal.classList.remove('active');
    };

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openCheckoutModal();
        });
    }

    if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckout);
    if (cancelCheckoutBtn) cancelCheckoutBtn.addEventListener('click', closeCheckout);

    // Close on backdrop overlay click
    if (checkoutModal) {
        checkoutModal.addEventListener('click', (e) => {
            if (e.target === checkoutModal) closeCheckout();
        });
    }

    // Apply Discount Code handler
    const handleApplyDiscount = () => {
        if (!discountInput || !discountMsg) return;
        const code = discountInput.value.trim().toUpperCase();

        if (!code) {
            discountMsg.className = 'discount_msg error';
            discountMsg.textContent = 'Please enter a discount code.';
            return;
        }

        if (validDiscounts[code]) {
            activeDiscount = validDiscounts[code];
            discountMsg.className = 'discount_msg success';
            discountMsg.textContent = `✓ Discount code "${code}" applied! (${activeDiscount.label})`;

            const data = updateCartUI();
            updateModalSummary(data);
        } else {
            discountMsg.className = 'discount_msg error';
            discountMsg.textContent = 'Invalid code. Try TAURUS10, TAURUS20, or SAVE500.';
        }
    };

    if (applyDiscountBtn) applyDiscountBtn.addEventListener('click', handleApplyDiscount);
    if (discountInput) {
        discountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyDiscount();
            }
        });
    }

    // Confirm Order Handler
    if (confirmCheckoutBtn) {
        confirmCheckoutBtn.addEventListener('click', () => {
            const data = calculateTotals();
            closeCheckout();

            // Populate Success Modal
            const randomTxnNum = Math.floor(100000 + Math.random() * 900000);
            const txnId = '#TXN-' + randomTxnNum;
            const successTxnEl = document.getElementById('success_txn_id');
            const successTotalEl = document.getElementById('success_total_paid');

            if (successTxnEl) successTxnEl.textContent = txnId;
            if (successTotalEl) successTotalEl.textContent = `₱${data.total.toLocaleString('en-US')}`;

            if (successModal) successModal.classList.add('active');

            // Clear cart items upon confirmed order completion
            if (cartList) {
                cartList.innerHTML = '';
                activeDiscount = null;
                if (discountInput) discountInput.value = '';
                if (discountMsg) discountMsg.textContent = '';
                updateCartUI();
            }
        });
    }

    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            if (successModal) successModal.classList.remove('active');
        });
    }

    if (successModal) {
        successModal.addEventListener('click', (e) => {
            if (e.target === successModal) {
                successModal.classList.remove('active');
            }
        });
    }
}

/* Helper to safely sanitize text rendering to prevent HTML injection */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* Toast Notification Utility */
function showToast(message, isSuccess = true) {
    let container = document.getElementById('toast_container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast_container';
        container.className = 'toast_container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast_msg';
    toast.innerHTML = `<i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}" style="color: ${isSuccess ? '#4ade80' : '#f87171'};"></i> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3200);
}

/* Password Visibility Toggle & Validation */
function setup_password_visibility() {
    const toggleBtns = document.querySelectorAll('.btn_toggle_pwd');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) {
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    }
                } else {
                    input.type = 'password';
                    if (icon) {
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                }
            }
        });
    });

    const newPwd = document.getElementById('new_password_input');
    const confirmPwd = document.getElementById('confirm_password_input');
    const matchError = document.getElementById('password_match_error');
    const profileForm = document.getElementById('profile_form');

    if (profileForm && newPwd && confirmPwd) {
        profileForm.addEventListener('submit', (e) => {
            if (newPwd.value.trim() !== '' || confirmPwd.value.trim() !== '') {
                if (newPwd.value !== confirmPwd.value) {
                    e.preventDefault();
                    if (matchError) matchError.style.display = 'block';
                    confirmPwd.focus();
                    return false;
                }
            }
            if (matchError) matchError.style.display = 'none';
        });
    }
}

/* Global & Page-Specific Live Search and Filter Controls */
function setup_search_and_filters() {
    const searchInputs = document.querySelectorAll('.search_input, #global_search_input');

    const handleSearch = (query) => {
        const q = query.toLowerCase().trim();

        // Orders Table filter (myorders.html)
        const orderRows = document.querySelectorAll('#orders_table_body tr');
        let visibleOrders = 0;
        orderRows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(q);
            row.style.display = matches ? '' : 'none';
            if (matches) visibleOrders++;
        });
        const noOrdersMsg = document.getElementById('no_orders_found');
        if (noOrdersMsg && orderRows.length > 0) {
            noOrdersMsg.style.display = (visibleOrders === 0) ? 'block' : 'none';
        }

        // Support Tickets filter (support.html)
        const ticketCards = document.querySelectorAll('.ticket_card');
        let visibleTickets = 0;
        ticketCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matches = text.includes(q);
            card.style.display = matches ? '' : 'none';
            if (matches) visibleTickets++;
        });
        const noTicketsMsg = document.getElementById('no_tickets_found');
        if (noTicketsMsg && ticketCards.length > 0) {
            noTicketsMsg.style.display = (visibleTickets === 0) ? 'block' : 'none';
        }

        // Products Catalog filter (products.html)
        const productItems = document.querySelectorAll('.product_card_item');
        let visibleProducts = 0;
        productItems.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matches = text.includes(q);
            card.style.display = matches ? '' : 'none';
            if (matches) visibleProducts++;
        });
        const noProductsMsg = document.getElementById('no_products_found');
        if (noProductsMsg && productItems.length > 0) {
            noProductsMsg.style.display = (visibleProducts === 0) ? 'block' : 'none';
        }
    };

    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    });

    // Status filter select for Orders (myorders.html)
    const orderStatusFilter = document.getElementById('order_status_filter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', () => {
            const val = orderStatusFilter.value.toLowerCase();
            const orderRows = document.querySelectorAll('#orders_table_body tr');
            let visible = 0;
            orderRows.forEach(row => {
                const status = (row.getAttribute('data-status') || '').toLowerCase();
                const matches = (val === 'all' || status.includes(val));
                row.style.display = matches ? '' : 'none';
                if (matches) visible++;
            });
            const noOrdersMsg = document.getElementById('no_orders_found');
            if (noOrdersMsg) noOrdersMsg.style.display = (visible === 0) ? 'block' : 'none';
        });
    }
}

/* "Add to Cart" Handlers across overview and products pages */
function setup_add_to_cart_buttons() {
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn_add_to_cart_action') || e.target.closest('.action_button');
        if (!btn || btn.textContent.trim() !== 'Add to Cart' && !btn.classList.contains('btn_add_to_cart_action')) return;

        // Ensure it's not a modal trigger or different action button
        if (btn.id === 'btn_open_ticket_modal' || btn.classList.contains('user_welcome_card') || btn.closest('.profile_form')) return;

        let name = btn.getAttribute('data-name');

        if (!name) {
            const card = btn.closest('.product_card') || btn.closest('.product_card_item');
            if (card) {
                const nameEl = card.querySelector('.product_name');
                name = nameEl ? nameEl.textContent.trim() : 'Bike Product';
            }
        }

        if (!name) return;

        // Increment cart badges in UI
        const badges = document.querySelectorAll('.cart_badge_top, .badge_green');
        badges.forEach(badge => {
            let current = parseInt(badge.textContent, 10) || 0;
            badge.textContent = current + 1;
        });

        showToast(`Added "${name}" to your cart!`, true);
    });
}

/* Order Details Modal Popup (myorders.html) */
function setup_order_details_modal() {
    const modal = document.getElementById('order_details_modal');
    const closeX = document.getElementById('close_order_details_modal');
    const closeBtn = document.getElementById('close_order_details_btn');

    if (!modal) return;

    const closeModal = () => modal.classList.remove('active');
    if (closeX) closeX.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn_view_order_details');
        if (btn) {
            const row = btn.closest('tr');
            if (row) {
                const orderId = row.getAttribute('data-order-id') || '#TBR1045';
                const date = row.getAttribute('data-date') || '2026-05-15';
                const items = row.getAttribute('data-items') || 'Bike Item';
                const status = row.getAttribute('data-status') || 'Processing';
                const total = row.getAttribute('data-total') || '₱11,000';

                const headId = document.getElementById('modal_order_id_head');
                const dateEl = document.getElementById('modal_order_date');
                const itemsList = document.getElementById('modal_order_items_list');
                const totalEl = document.getElementById('modal_order_total');
                const badgeEl = document.getElementById('modal_order_status_badge');

                if (headId) headId.textContent = orderId;
                if (dateEl) dateEl.textContent = date;
                if (totalEl) totalEl.textContent = total;

                if (itemsList) {
                    const itemArray = items.split(',');
                    itemsList.innerHTML = itemArray.map(item => `
                        <li class="checkout_item_row">
                            <span class="checkout_item_name">${escapeHTML(item.trim())}</span>
                            <span class="checkout_item_qty">x1</span>
                        </li>
                    `).join('');
                }

                if (badgeEl) {
                    const statusClass = status.toLowerCase() === 'delivered' ? 'status_delivered' : status.toLowerCase() === 'shipped' ? 'status_shipped' : 'status_processing';
                    badgeEl.innerHTML = `<span class="status_pill ${statusClass}"><i class="fas fa-circle" style="font-size: 7px;"></i> ${escapeHTML(status)}</span>`;
                }

                modal.classList.add('active');
            }
        }
    });
}

/* Ticket Chat Conversation Modal Popup (support.html) */
function setup_ticket_chat_modal() {
    const modal = document.getElementById('ticket_chat_modal');
    const closeBtn = document.getElementById('close_chat_modal');
    const replyForm = document.getElementById('chat_reply_form');
    const replyInput = document.getElementById('chat_reply_input');
    const chatBox = document.getElementById('chat_messages_box');

    if (!modal) return;

    const closeModal = () => modal.classList.remove('active');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn_open_chat');
        if (btn) {
            e.preventDefault();
            const card = btn.closest('.ticket_card');
            const titleEl = card ? card.querySelector('.ticket_title') : null;
            const subtitleEl = document.getElementById('chat_modal_subtitle');
            if (titleEl && subtitleEl) {
                subtitleEl.textContent = titleEl.textContent.trim();
            }
            modal.classList.add('active');
        }
    });

    if (replyForm) {
        replyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = replyInput.value.trim();
            if (!text) return;

            if (chatBox) {
                const userMsg = document.createElement('div');
                userMsg.className = 'chat_message message_user';
                userMsg.innerHTML = `
                    <div class="chat_msg_author">Juan Dela Cruz (You)</div>
                    <div class="chat_msg_text">${escapeHTML(text)}</div>
                `;
                chatBox.appendChild(userMsg);
                chatBox.scrollTop = chatBox.scrollHeight;
            }

            replyInput.value = '';

            setTimeout(() => {
                if (chatBox) {
                    const supportMsg = document.createElement('div');
                    supportMsg.className = 'chat_message message_support';
                    supportMsg.innerHTML = `
                        <div class="chat_msg_author">Taurus Support Rep</div>
                        <div class="chat_msg_text">Thank you for your update! Our team has received your message and is processing your request.</div>
                    `;
                    chatBox.appendChild(supportMsg);
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
            }, 1000);
        });
    }
}

/* Logout Confirmation Modal */
function setup_logout_modal() {
    let modal = document.getElementById('logout_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'logout_modal';
        modal.className = 'modal_overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="modal_container checkout_modal_container text_center">
                <h3 class="modal_title">Log Out Confirmation</h3>
                <p class="modal_subtitle">Are you sure you want to log out of your Taurus Bike customer account?</p>
                <div class="modal_actions flex_center" style="margin-top: 20px;">
                    <button type="button" class="btn_modal_cancel" id="cancel_logout_btn">Cancel</button>
                    <button type="button" class="btn_modal_submit" id="confirm_logout_btn"><i class="fas fa-sign-out-alt"></i> Log Out</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const closeModal = () => modal.classList.remove('active');

    document.body.addEventListener('click', (e) => {
        const logoutLink = e.target.closest('.logout_item') || e.target.closest('.sidebar_logout a');
        if (logoutLink) {
            e.preventDefault();
            modal.classList.add('active');
        }
    });

    const cancelBtn = modal.querySelector('#cancel_logout_btn');
    const confirmBtn = modal.querySelector('#confirm_logout_btn');

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            closeModal();
            showToast('Logged out successfully! Redirecting to Overview...', true);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);
        });
    }
}

/* Products Catalog Filtering & Sorting (products.html) */
function setup_products_catalog() {
    const categoryBtns = document.querySelectorAll('.category_btn');
    const sortSelect = document.getElementById('product_sort_select');
    const grid = document.getElementById('products_catalog_grid');

    if (!grid) return;

    let activeCategory = 'all';

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category') || 'all';
            filterAndSortProducts();
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', filterAndSortProducts);
    }

    function filterAndSortProducts() {
        const cards = Array.from(grid.querySelectorAll('.product_card_item'));
        const sortVal = sortSelect ? sortSelect.value : 'featured';

        let visibleCount = 0;

        cards.forEach(card => {
            const cat = card.getAttribute('data-category') || '';
            const matches = (activeCategory === 'all' || cat === activeCategory);
            card.style.display = matches ? 'flex' : 'none';
            if (matches) visibleCount++;
        });

        // Sorting visible cards
        cards.sort((a, b) => {
            const priceA = parseFloat(a.getAttribute('data-price')) || 0;
            const priceB = parseFloat(b.getAttribute('data-price')) || 0;
            const nameA = (a.getAttribute('data-name') || '').toLowerCase();
            const nameB = (b.getAttribute('data-name') || '').toLowerCase();

            if (sortVal === 'price_low') return priceA - priceB;
            if (sortVal === 'price_high') return priceB - priceA;
            if (sortVal === 'name_az') return nameA.localeCompare(nameB);
            return 0; // featured default
        });

        cards.forEach(card => grid.appendChild(card));

        const noProductsMsg = document.getElementById('no_products_found');
        if (noProductsMsg) {
            noProductsMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        }
    }
}

