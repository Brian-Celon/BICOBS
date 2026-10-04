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
    load_dashboard_summary_from_backend();
    load_user_orders_from_backend();
    load_user_payments_from_backend();

    // Check if on a protected customer dashboard page without auth
    check_page_auth_guard();
});

/* Page level auth guard for dashboard pages */
function check_page_auth_guard() {
    const isDashboardPage = window.location.pathname.includes('/Dashboard/') || 
        window.location.pathname.includes('profile.html') || 
        window.location.pathname.includes('myorders.html') || 
        window.location.pathname.includes('payments.html') || 
        window.location.pathname.includes('support.html');

    if (isDashboardPage && window.BICOBS_Auth && !window.BICOBS_Auth.isAuthenticated()) {
        const path = window.location.pathname;
        let msg = 'Please sign in to access your customer account';
        if (path.includes('profile.html')) msg = 'Please sign in to view and edit your profile settings';
        if (path.includes('myorders.html')) msg = 'Please sign in to view your order history and tracking';
        if (path.includes('payments.html')) msg = 'Please sign in to view your billing and payment history';
        if (path.includes('support.html')) msg = 'Please sign in to manage your support tickets';

        window.BICOBS_Auth.showLoginModal({
            message: msg,
            onSuccess: () => {
                load_user_orders_from_backend();
                load_user_payments_from_backend();
                setup_profile_sync();
            }
        });
    }
}

/* Fetch user orders from backend API for dashboard overview and order history */
async function load_user_orders_from_backend() {
    const tableBody = document.getElementById('orders_table_body');
    const overviewTable = document.getElementById('overview_orders_table');
    const overviewTotalOrders = document.getElementById('overview_total_orders');
    const overviewNoOrders = document.getElementById('overview_no_orders');
    const noOrdersFound = document.getElementById('no_orders_found');

    const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
    if (!token) {
        if (overviewNoOrders) overviewNoOrders.style.display = 'block';
        if (noOrdersFound) noOrdersFound.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/orders/myorders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            const orders = result.data;

            if (overviewTotalOrders) overviewTotalOrders.textContent = orders.length;

            if (orders.length > 0) {
                if (noOrdersFound) noOrdersFound.style.display = 'none';
                if (overviewNoOrders) overviewNoOrders.style.display = 'none';

                if (overviewTable) {
                    overviewTable.innerHTML = '';
                    orders.slice(0, 5).forEach(order => {
                        const tr = document.createElement('tr');
                        const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
                        tr.innerHTML = `
                            <td><strong>#${order._id.slice(-6).toUpperCase()}</strong></td>
                            <td>${orderDate}</td>
                            <td><span class="status_pill status_${order.orderStatus || 'processing'}">${(order.orderStatus || 'processing').replace('_', ' ').toUpperCase()}</span></td>
                            <td>₱${(order.totalPrice || 0).toLocaleString()}</td>
                            <td><a href="myorders.html" class="action_link">View Details</a></td>
                        `;
                        overviewTable.appendChild(tr);
                    });
                }
            } else {
                if (noOrdersFound) noOrdersFound.style.display = 'block';
                if (overviewNoOrders) overviewNoOrders.style.display = 'block';
            }
        }
    } catch (err) {
        console.log('Orders table backend sync offline:', err);
    }
}

/* Fetch customer billing transactions from backend API for payments.html */
async function load_user_payments_from_backend() {
    const tableBody = document.getElementById('payment_transactions_body');
    const noPayments = document.getElementById('no_payments_found');
    if (!tableBody) return;

    const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
    if (!token) {
        if (noPayments) noPayments.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/billing/mybilling', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            const billings = result.data;

            if (billings.length > 0) {
                if (noPayments) noPayments.style.display = 'none';
                tableBody.innerHTML = '';

                billings.forEach(item => {
                    const tr = document.createElement('tr');
                    const invDate = new Date(item.createdAt).toISOString().slice(0, 10);
                    const isPaid = item.paymentStatus === 'paid';
                    const statusPill = isPaid 
                        ? '<span class="status_pill status_delivered"><i class="fas fa-check-circle"></i> Paid</span>'
                        : '<span class="status_pill status_processing"><i class="fas fa-clock"></i> Pending (COD)</span>';

                    tr.innerHTML = `
                        <td><strong>${item.invoiceNumber || '#' + item._id.slice(-6).toUpperCase()}</strong></td>
                        <td>${invDate}</td>
                        <td style="text-transform: capitalize;"><i class="fas fa-money-bill-wave" style="color: #10b981; margin-right: 6px;"></i> ${item.paymentMethod || 'Cash'}</td>
                        <td><strong>₱${(item.totalAmount || 0).toLocaleString()}</strong></td>
                        <td>${statusPill}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            } else {
                if (noPayments) noPayments.style.display = 'block';
            }
        }
    } catch (err) {
        console.log('Payments backend sync offline:', err);
    }
}


/* Fetch live summary metrics from backend API */
async function load_dashboard_summary_from_backend() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/dashboard/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const result = await response.json();
        if (result.status === 'success' && result.data) {
            const { revenue, orders, inventory } = result.data;

            const revenueEl = document.getElementById('stat_total_revenue');
            const ordersEl = document.getElementById('stat_total_orders');
            const productsEl = document.getElementById('stat_total_products');
            const lowStockEl = document.getElementById('stat_low_stock');

            if (revenueEl) revenueEl.textContent = `₱${revenue.totalRevenue.toLocaleString()}`;
            if (ordersEl) ordersEl.textContent = orders.totalOrders;
            if (productsEl) productsEl.textContent = inventory.totalProducts;
            if (lowStockEl) lowStockEl.textContent = inventory.lowStockProducts;
        }
    } catch (err) {
        console.log('Dashboard backend fetch offline, using UI default values.');
    }
}

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
    // Helper to get stored profile values
    const getProfile = () => {
        let storedUser = null;
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) storedUser = JSON.parse(userStr);
        } catch (e) {}

        const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
        const isLoggedIn = !!(token && (storedUser || localStorage.getItem('tb_user_name')));

        if (isLoggedIn) {
            return {
                name: (storedUser ? storedUser.name : localStorage.getItem('tb_user_name')) || 'Customer Rider',
                email: (storedUser ? storedUser.email : localStorage.getItem('tb_user_email')) || '',
                phone: (storedUser ? storedUser.phone : localStorage.getItem('tb_user_phone')) || '',
                shippingAddress: (storedUser ? storedUser.address : localStorage.getItem('tb_user_shipping')) || '',
                billingAddress: localStorage.getItem('tb_user_billing') || '',
                isLoggedIn: true
            };
        }

        return {
            name: '',
            email: '',
            phone: '',
            shippingAddress: '',
            billingAddress: '',
            isLoggedIn: false
        };
    };

    // Helper to compute initials from full name
    const getInitials = (fullName, isLoggedIn) => {
        if (!isLoggedIn || !fullName) return 'TB';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 0 || !parts[0]) return 'TB';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Update DOM elements on page with current profile data
    const updateUI = () => {
        const profile = getProfile();
        const initials = getInitials(profile.name, profile.isLoggedIn);

        // Top navbar avatar circles and welcome card avatar
        const avatars = document.querySelectorAll('.user_avatar, #overview_welcome_avatar');
        avatars.forEach(av => {
            av.textContent = initials;
        });

        // Overview page text displays
        const overviewName = document.getElementById('overview_user_name');
        if (overviewName) overviewName.textContent = profile.name || 'Customer Rider';

        const welcomeName = document.getElementById('overview_welcome_name');
        if (welcomeName) welcomeName.textContent = profile.name || 'Customer Rider';

        const welcomeLoc = document.getElementById('overview_welcome_location');
        if (welcomeLoc) welcomeLoc.textContent = profile.shippingAddress || 'Marilao, Bulacan';

        const overviewShipping = document.getElementById('overview_shipping_address');
        if (overviewShipping) overviewShipping.textContent = profile.shippingAddress || 'No address set yet';

        const overviewBilling = document.getElementById('overview_billing_address');
        if (overviewBilling) overviewBilling.textContent = profile.billingAddress || profile.shippingAddress || 'No billing address set yet';

        // Profile page input fields initialization (only populate if user is logged in)
        if (profile.isLoggedIn) {
            const nameInput = document.getElementById('full_name_input');
            if (nameInput) nameInput.value = profile.name;

            const emailInput = document.getElementById('email_address_input');
            if (emailInput) emailInput.value = profile.email;

            const phoneInput = document.getElementById('phone_number_input');
            if (phoneInput) phoneInput.value = profile.phone;

            const shippingInput = document.getElementById('shipping_address_input');
            if (shippingInput) shippingInput.value = profile.shippingAddress;

            const billingInput = document.getElementById('billing_address_input');
            if (billingInput) billingInput.value = profile.billingAddress;
        }
    };

    // Initial load
    updateUI();

    // Attach form submit handler on profile page
    const profileForm = document.getElementById('profile_form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
            if (!token && window.BICOBS_Auth) {
                window.BICOBS_Auth.showLoginModal({
                    message: 'Please sign in to save your profile changes',
                    onSuccess: () => {
                        profileForm.dispatchEvent(new Event('submit'));
                    }
                });
                return;
            }

            const newName = document.getElementById('full_name_input')?.value.trim();
            const newEmail = document.getElementById('email_address_input')?.value.trim();
            const newPhone = document.getElementById('phone_number_input')?.value.trim();
            const newShipping = document.getElementById('shipping_address_input')?.value.trim();
            const newBilling = document.getElementById('billing_address_input')?.value.trim();

            const newPassword = document.getElementById('new_password_input')?.value;
            const confirmPassword = document.getElementById('confirm_password_input')?.value;
            const pwdError = document.getElementById('password_match_error');

            if (newPassword && newPassword !== confirmPassword) {
                if (pwdError) pwdError.style.display = 'block';
                return;
            } else if (pwdError) {
                pwdError.style.display = 'none';
            }

            const payload = {
                name: newName,
                email: newEmail,
                phone: newPhone,
                address: newShipping
            };

            if (newPassword && newPassword.trim() !== '') {
                payload.password = newPassword;
            }

            try {
                const res = await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();

                if (res.ok && result.status === 'success') {
                    if (newName) localStorage.setItem('tb_user_name', newName);
                    if (newEmail) localStorage.setItem('tb_user_email', newEmail);
                    if (newPhone) localStorage.setItem('tb_user_phone', newPhone);
                    if (newShipping) localStorage.setItem('tb_user_shipping', newShipping);
                    if (newBilling) localStorage.setItem('tb_user_billing', newBilling);

                    if (result.data) {
                        localStorage.setItem('user', JSON.stringify(result.data));
                    }

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

                    if (document.getElementById('new_password_input')) document.getElementById('new_password_input').value = '';
                    if (document.getElementById('confirm_password_input')) document.getElementById('confirm_password_input').value = '';
                } else {
                    alert(result.message || 'Could not update profile. Please try again.');
                }
            } catch (err) {
                console.error('Profile update error:', err);
                if (newName) localStorage.setItem('tb_user_name', newName);
                if (newEmail) localStorage.setItem('tb_user_email', newEmail);
                if (newPhone) localStorage.setItem('tb_user_phone', newPhone);
                if (newShipping) localStorage.setItem('tb_user_shipping', newShipping);
                if (newBilling) localStorage.setItem('tb_user_billing', newBilling);
                updateUI();
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

    // Open Modal with Auth Guard
    if (open_btn) {
        open_btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.BICOBS_Auth) {
                window.BICOBS_Auth.requireAuth(() => {
                    modal.classList.add('active');
                }, 'Please sign in to add a payment method');
            } else {
                modal.classList.add('active');
            }
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
            const noCards = document.getElementById('no_payment_methods');
            if (cardsGrid) {
                const newCard = document.createElement('article');
                const currentUserName = localStorage.getItem('tb_user_name') || 'Account Holder';

                if (provider === 'card') {
                    const cardNum = document.getElementById('card_number')?.value || '•••• •••• •••• 1234';
                    const expDate = document.getElementById('exp_date')?.value || '12/30';
                    const holderName = document.getElementById('cardholder_name')?.value.trim() || currentUserName;
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
                    const mobileNum = document.getElementById('gcash_number')?.value || '+63 917 ••• 0000';
                    const holderName = document.getElementById('gcash_name')?.value.trim() || currentUserName;

                    newCard.className = 'payment_card_item card_gcash';
                    newCard.innerHTML = `
                        <div class="card_top_row">
                            <span>GCash Wallet</span>
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
                    const mobileNum = document.getElementById('paymaya_number')?.value || '+63 918 ••• 0000';
                    const holderName = document.getElementById('paymaya_name')?.value.trim() || currentUserName;

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

                if (noCards) noCards.style.display = 'none';
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

    // Open Modal with Auth Guard
    if (open_btn) {
        open_btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.BICOBS_Auth) {
                window.BICOBS_Auth.requireAuth(() => {
                    modal.classList.add('active');
                }, 'Please sign in to create a support ticket');
            } else {
                modal.classList.add('active');
            }
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

            const subject = document.getElementById('ticket_subject')?.value || 'General Inquiry';
            const category = document.getElementById('ticket_category')?.value || 'Support';
            const ticketList = document.getElementById('tickets_list') || document.querySelector('.ticket_list');
            const noTickets = document.getElementById('no_tickets_found');

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

                if (noTickets) noTickets.style.display = 'none';
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

/* Toggle password visibility */
function setup_password_visibility() {
    document.querySelectorAll('.btn_toggle_pwd').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;
            const isPwd = input.type === 'password';
            input.type = isPwd ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPwd ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        });
    });
}

/* Global search and table filters */
function setup_search_and_filters() {
    const searchInputs = document.querySelectorAll('.search_wrapper input, .search_input');
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll('.orders_table tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
        });
    });
}

/* Shopping Cart Interactivity, Quantity Updates, Delete Handling, Totals & Checkout Modal */
function setup_shopping_cart() {
    // If BICOBS_Cart and cart_view.js are active, delegate cart rendering to cart_view.js
    if (window.BICOBS_Cart && document.getElementById('cart_item_list')) {
        return;
    }

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

        // Update Top Nav, Sidebar, and Overview card badges
        const badges = document.querySelectorAll('.cart_badge_top, .badge_green');
        badges.forEach(badge => {
            badge.textContent = data.totalQty;
        });
        const overviewCartEl = document.getElementById('overview_cart_count');
        if (overviewCartEl) overviewCartEl.textContent = data.totalQty;

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
        confirmCheckoutBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
            const userStr = localStorage.getItem('user');

            if (!token) {
                if (window.BICOBS_Auth) {
                    window.BICOBS_Auth.showLoginModal({
                        message: 'Please sign in to confirm and place your order',
                        onSuccess: () => {
                            confirmCheckoutBtn.click();
                        }
                    });
                }
                return;
            }

            const user = userStr ? JSON.parse(userStr) : {};
            const data = calculateTotals();

            if (!data.items || data.items.length === 0) {
                if (window.BICOBS_Cart) window.BICOBS_Cart.showToast('Your cart is empty', 'warning');
                return;
            }

            const payload = {
                orderItems: data.items.map(i => ({
                    product: i.id || '650000000000000000000001',
                    name: i.name,
                    quantity: i.qty,
                    price: i.unitPrice
                })),
                shippingAddress: {
                    phone: user.phone || localStorage.getItem('tb_user_phone') || '09171234567',
                    street: user.address || localStorage.getItem('tb_user_shipping') || 'Abangan Sur',
                    city: 'Marilao',
                    province: 'Bulacan'
                },
                fulfillmentType: 'pickup',
                paymentMethod: 'cash',
                deliveryFee: data.shippingFee
            };

            try {
                confirmCheckoutBtn.disabled = true;
                confirmCheckoutBtn.textContent = 'Processing Order...';

                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                confirmCheckoutBtn.disabled = false;
                confirmCheckoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Transaction';

                if (response.status === 401 && window.BICOBS_Auth) {
                    window.BICOBS_Auth.clearAuth();
                    window.BICOBS_Auth.showLoginModal({
                        message: 'Your session has expired. Please sign in to place your order',
                        onSuccess: () => {
                            confirmCheckoutBtn.click();
                        }
                    });
                    return;
                }

                if (response.ok && result.status === 'success') {
                    closeCheckout();

                    const successTxnEl = document.getElementById('success_txn_id');
                    const successTotalEl = document.getElementById('success_total_paid');

                    if (successTxnEl) successTxnEl.textContent = `#ORD-${result.data._id.slice(-6).toUpperCase()}`;
                    if (successTotalEl) successTotalEl.textContent = `₱${result.data.totalPrice.toLocaleString('en-US')}`;

                    if (successModal) successModal.classList.add('active');

                    // Clear cart items upon confirmed order completion
                    if (cartList) {
                        cartList.innerHTML = '';
                        activeDiscount = null;
                        if (discountInput) discountInput.value = '';
                        if (discountMsg) discountMsg.textContent = '';
                        updateCartUI();
                    }
                } else {
                    if (window.BICOBS_Cart) {
                        window.BICOBS_Cart.showToast(result.message || 'Failed to place order. Please try again.', 'error');
                    }
                }
            } catch (err) {
                console.error('Order submission error:', err);
                confirmCheckoutBtn.disabled = false;
                confirmCheckoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Transaction';
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

        const card = btn.closest('.product_card') || btn.closest('.product_card_item') || btn.closest('.catalog_card');
        let id = btn.getAttribute('data-id') || (card ? card.getAttribute('data-id') : null);
        let name = btn.getAttribute('data-name');
        let price = parseFloat(btn.getAttribute('data-price'));
        let img = btn.getAttribute('data-img');

        if (card) {
            if (!name) {
                const nameEl = card.querySelector('.product_name') || card.querySelector('.card_title') || card.querySelector('.product_title');
                name = nameEl ? nameEl.textContent.trim() : 'Bike Product';
            }
            if (isNaN(price)) {
                const priceEl = card.querySelector('.product_price') || card.querySelector('.card_current_price') || card.querySelector('.price_current');
                price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) : 1000;
            }
            if (!img) {
                const imgEl = card.querySelector('img');
                img = imgEl ? imgEl.src : '/frontend/Pictures/placeholder.png';
            }
            if (!id) {
                id = name;
            }
        }

        if (!name) return;

        if (window.BICOBS_Cart) {
            window.BICOBS_Cart.addToCart({
                id: id || name,
                name: name,
                price: price || 0,
                imageUrl: img || '/frontend/Pictures/placeholder.png',
                stockQuantity: 10
            }, 1);
        } else {
            showToast(`Added "${name}" to your cart!`, true);
        }
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

                const userMsg = document.createElement('div');
                userMsg.className = 'chat_message message_user';
                const authorName = localStorage.getItem('tb_user_name') || 'You';
                userMsg.innerHTML = `
                    <div class="chat_msg_author">${escapeHTML(authorName)}</div>
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
            localStorage.removeItem('token');
            localStorage.removeItem('bicobs_token');
            localStorage.removeItem('user');
            localStorage.removeItem('tb_user_name');
            localStorage.removeItem('tb_user_email');
            localStorage.removeItem('tb_user_phone');
            localStorage.removeItem('tb_user_shipping');
            showToast('Logged out successfully! Redirecting to login...', true);
            setTimeout(() => {
                window.location.href = '/frontend/pages/login.html';
            }, 1000);
        });
    }
}

/* Products Catalog Filtering & Sorting (products.html) */
/* Products Catalog Filtering & Sorting (products.html) */
async function setup_products_catalog() {
    const categoryBtns = document.querySelectorAll('.category_btn');
    const sortSelect = document.getElementById('product_sort_select');
    const grid = document.getElementById('products_catalog_grid');

    if (!grid) return;

    let activeCategory = 'all';

    // Fetch products dynamically from backend API
    try {
        const res = await fetch('/api/products');
        if (res.ok) {
            const result = await res.json();
            if (result.status === 'success' && result.data && result.data.length > 0) {
                renderDashboardProductsGrid(result.data);
            }
        }
    } catch (err) {
        console.log('Using HTML template products fallback');
    }

    function renderDashboardProductsGrid(products) {
        grid.innerHTML = '';
        products.forEach(item => {
            const article = document.createElement('article');
            article.className = 'product_card_item';
            article.setAttribute('data-category', item.category || 'all');
            article.setAttribute('data-price', item.price);
            article.setAttribute('data-name', item.name);

            article.innerHTML = `
                <div class="product_img_box">
                    <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600'}" alt="${item.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600';">
                </div>
                <div class="product_card_body">
                    <span class="product_category_tag">${(item.category || '').toUpperCase()}</span>
                    <h4 class="product_name">${item.name}</h4>
                    <p class="product_description">${item.description || ''}</p>
                    <div class="product_card_footer">
                        <span class="product_price">₱${item.price.toLocaleString()}</span>
                        <button type="button" class="btn_add_to_cart_action" data-id="${item._id}" data-name="${item.name}" data-price="${item.price}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(article);
        });
        filterAndSortProducts();
    }

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
            const cat = (card.getAttribute('data-category') || '').toLowerCase();
            const name = (card.getAttribute('data-name') || '').toLowerCase();
            const text = `${cat} ${name}`;

            let matches = false;
            if (activeCategory === 'all') {
                matches = true;
            } else if (activeCategory === 'bikes') {
                matches = (cat === 'bicycles') || text.includes('bike') || text.includes('frame');
            } else if (activeCategory === 'parts') {
                matches = (cat === 'spare_parts') && !text.includes('tire') && !text.includes('wheel');
            } else if (activeCategory === 'tires') {
                matches = text.includes('tire') || text.includes('rim') || text.includes('wheel') || text.includes('tube') || text.includes('tanwall');
            } else if (activeCategory === 'apparel') {
                matches = (cat === 'accessories') || text.includes('shoe') || text.includes('helmet') || text.includes('pedal') || text.includes('cleat');
            } else {
                matches = (cat === activeCategory) || text.includes(activeCategory);
            }

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
            return 0;
        });

        cards.forEach(card => grid.appendChild(card));

        const noProductsMsg = document.getElementById('no_products_found');
        if (noProductsMsg) {
            noProductsMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
        }
    }

    filterAndSortProducts();
}

/* Universal Add to Cart Delegated Listener for Dashboard Products Catalog */
function setup_add_to_cart_buttons() {
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn_add_to_cart_action');
        if (!btn || btn.disabled) return;

        const id = btn.getAttribute('data-id');
        const card = btn.closest('.product_card_item') || btn.closest('article');
        const name = btn.getAttribute('data-name') || card?.getAttribute('data-name') || card?.querySelector('.product_name')?.textContent?.trim() || 'Product';
        const price = parseFloat(btn.getAttribute('data-price') || card?.getAttribute('data-price') || card?.querySelector('.product_price')?.textContent?.replace(/[^0-9.]/g, '')) || 0;
        const img = card?.querySelector('img')?.src || '/frontend/Pictures/placeholder.png';
        const category = card?.getAttribute('data-category') || '';

        if (window.BICOBS_Cart && id) {
            const added = window.BICOBS_Cart.addToCart({
                id: id,
                _id: id,
                name: name,
                price: price,
                imageUrl: img,
                category: category,
                stockQuantity: 99
            }, 1);

            if (added) {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Added!';
                btn.style.backgroundColor = '#16a34a';
                btn.style.color = '#ffffff';
                setTimeout(() => {
                    btn.innerHTML = orig;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                }, 1200);
            }
        }
    });
}


