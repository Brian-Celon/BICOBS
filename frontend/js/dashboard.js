/* dashboard interactivity script */

/* listen for DOM content load */
document.addEventListener("DOMContentLoaded", () => {
    /* initialize dashboard functionalities */
    setup_sidebar_links();
    setup_mobile_sidebar();
    setup_responsive_search();
    setup_payment_modal();
    setup_ticket_modal();
    setup_global_keyboard();
    setup_profile_sync();
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

/* setup responsive side navigation bar toggle for small screens */
function setup_mobile_sidebar() {
    const toggleBtn = document.getElementById('mobile_nav_toggle');
    const closeBtn = document.getElementById('sidebar_close_btn');
    const sidebar = document.getElementById('dashboard_sidebar');
    let overlay = document.getElementById('sidebar_overlay');

    // Create backdrop overlay dynamically if not present in DOM
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebar_overlay';
        overlay.className = 'sidebar_overlay';
        document.body.appendChild(overlay);
    }

    const openSidebar = () => {
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    };

    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    };

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Close side nav when clicking any nav item link on mobile screens
    const navItems = document.querySelectorAll('.sidebar_container .nav_item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                closeSidebar();
            }
        });
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
