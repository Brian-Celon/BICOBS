// shop catalog interactive filter, search, and cart controller
document.addEventListener('DOMContentLoaded', () => {
    // state
    let active_category = 'all';
    let search_query = '';
    let sort_mode = 'featured';
    let max_price = 50000;
    let only_sale = false;
    let cart_items_count = 0;

    // dom elements
    const products_grid = document.getElementById('products_grid');
    const product_cards = Array.from(document.querySelectorAll('.product_card_item'));
    const results_count_el = document.getElementById('results_count');
    const active_heading_el = document.getElementById('active_filter_heading');
    const empty_state_el = document.getElementById('empty_catalog_state');
    const search_input = document.getElementById('catalog_search_input');
    const header_search_input = document.querySelector('.search_input');
    const sort_select = document.getElementById('catalog_sort_select');
    const price_slider = document.getElementById('price_slider');
    const max_price_display = document.getElementById('max_price_display');
    const sale_checkbox = document.getElementById('filter_sale');
    const btn_reset_filters = document.getElementById('btn_reset_filters');
    const category_item_btns = document.querySelectorAll('.category_item_btn');
    const pill_btns = document.querySelectorAll('.pill_btn');
    const cart_counter_badge = document.getElementById('cart_badge_counter');
    const cart_toast = document.getElementById('cart_toast');
    const toast_product_name = document.getElementById('toast_product_name');

    // mobile category bar and drawer elements
    const btn_mobile_category_trigger = document.getElementById('btn_mobile_category_trigger');
    const btn_mobile_filter = document.getElementById('btn_mobile_filter');
    const btn_apply_mobile_filters = document.getElementById('btn_apply_mobile_filters');
    const mobile_btn_active_cat = document.getElementById('mobile_btn_active_cat');
    const mobile_filter_badge = document.getElementById('mobile_filter_badge');
    const mobile_apply_badge = document.getElementById('mobile_apply_badge');
    const mobile_sort_select = document.getElementById('mobile_sort_select');
    const shop_sidebar = document.getElementById('shop_sidebar');
    const sidebar_overlay = document.getElementById('sidebar_mobile_overlay');
    const sidebar_close_mobile = document.getElementById('sidebar_close_mobile');

    // mobile main navigation elements
    const mobile_nav_toggle = document.getElementById('mobile_nav_toggle');
    const mobile_nav_close = document.getElementById('mobile_nav_close');
    const main_navigation = document.getElementById('main_navigation');
    const nav_overlay = document.getElementById('nav_overlay');

    // filter and sort execution
    function apply_filters() {
        let visible_count = 0;

        product_cards.forEach(card => {
            const card_category = card.getAttribute('data-category');
            const card_type = card.getAttribute('data-type');
            const card_price = parseFloat(card.getAttribute('data-price')) || 0;
            const card_sale = card.getAttribute('data-sale') === 'true';
            const card_title = (card.getAttribute('data-name') || '').toLowerCase();
            const card_specs = (card.innerText || '').toLowerCase();

            // category filter check
            let matches_category = false;
            if (active_category === 'all') {
                matches_category = true;
            } else if (active_category === 'all_bikes') {
                matches_category = (card_type === 'bike');
            } else if (active_category === 'all_parts') {
                matches_category = (card_type === 'parts');
            } else {
                matches_category = (card_category === active_category);
            }

            // search check
            const matches_search = !search_query || card_title.includes(search_query) || card_specs.includes(search_query);

            // price check
            const matches_price = card_price <= max_price;

            // sale check
            const matches_sale = !only_sale || card_sale;

            if (matches_category && matches_search && matches_price && matches_sale) {
                card.style.display = 'flex';
                visible_count++;
            } else {
                card.style.display = 'none';
            }
        });

        // sort visible cards
        sort_products();

        // update results counter and badges
        if (results_count_el) {
            results_count_el.textContent = `Showing ${visible_count} of ${product_cards.length} items`;
        }
        if (mobile_filter_badge) {
            mobile_filter_badge.textContent = visible_count;
        }
        if (mobile_apply_badge) {
            mobile_apply_badge.textContent = visible_count;
        }

        // empty state display
        if (empty_state_el) {
            if (visible_count === 0) {
                empty_state_el.classList.add('show');
            } else {
                empty_state_el.classList.remove('show');
            }
        }
    }

    // sort products in dom
    function sort_products() {
        if (!products_grid) return;

        const visible_cards = product_cards.filter(card => card.style.display !== 'none');

        visible_cards.sort((a, b) => {
            const price_a = parseFloat(a.getAttribute('data-price')) || 0;
            const price_b = parseFloat(b.getAttribute('data-price')) || 0;
            const name_a = (a.getAttribute('data-name') || '').toLowerCase();
            const name_b = (b.getAttribute('data-name') || '').toLowerCase();
            const original_index_a = parseInt(a.getAttribute('data-index')) || 0;
            const original_index_b = parseInt(b.getAttribute('data-index')) || 0;

            if (sort_mode === 'price_asc') {
                return price_a - price_b;
            } else if (sort_mode === 'price_desc') {
                return price_b - price_a;
            } else if (sort_mode === 'name_asc') {
                return name_a.localeCompare(name_b);
            } else {
                return original_index_a - original_index_b;
            }
        });

        visible_cards.forEach(card => products_grid.appendChild(card));
    }

    // set active category across sidebar and pills
    function set_active_category(category_key, display_label) {
        active_category = category_key;

        // update sidebar active state
        category_item_btns.forEach(btn => {
            if (btn.getAttribute('data-category') === category_key) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // update pills active state
        pill_btns.forEach(pill => {
            if (pill.getAttribute('data-category') === category_key) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        // update heading label and mobile category bar
        const formatted_label = display_label || format_category_name(category_key);
        if (active_heading_el) {
            active_heading_el.textContent = formatted_label;
        }
        if (mobile_btn_active_cat) {
            mobile_btn_active_cat.textContent = formatted_label;
        }

        apply_filters();
    }

    function format_category_name(key) {
        if (key === 'all') return 'All Products';
        if (key === 'all_bikes') return 'All Prebuilt Bikes';
        if (key === 'all_parts') return 'All Bike Parts';
        if (key === 'mountain_bikes') return 'Mountain Bikes (MTB)';
        if (key === 'road_bikes') return 'Road Bikes';
        if (key === 'gravel_bikes') return 'Gravel Bikes';
        if (key === 'bmx_urban') return 'BMX & Urban Bikes';
        if (key === 'folding_commuter') return 'Folding & Commuter Bikes';
        if (key === 'pedals') return 'Pedals & Cleats';
        if (key === 'gears') return 'Gears & Drivetrain';
        if (key === 'brakes') return 'Brakes & Rotors';
        if (key === 'frames') return 'Frames & Forks';
        if (key === 'rims_tires') return 'Rims, Wheels & Tires';
        if (key === 'handlebars_saddles') return 'Handlebars & Saddles';
        return key;
    }

    // sidebar category click
    category_item_btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-category');
            const label = btn.querySelector('.category_name') ? btn.querySelector('.category_name').textContent : btn.textContent;
            set_active_category(cat, label);
            close_mobile_sidebar();
        });
    });

    // horizontal pills click
    pill_btns.forEach(pill => {
        pill.addEventListener('click', () => {
            const cat = pill.getAttribute('data-category');
            set_active_category(cat, pill.textContent);
        });
    });

    // search input
    if (search_input) {
        search_input.addEventListener('input', (e) => {
            search_query = e.target.value.trim().toLowerCase();
            apply_filters();
        });
    }

    if (header_search_input) {
        header_search_input.addEventListener('input', (e) => {
            search_query = e.target.value.trim().toLowerCase();
            if (search_input) search_input.value = search_query;
            apply_filters();
        });
    }

    // sort select
    if (sort_select) {
        sort_select.addEventListener('change', (e) => {
            sort_mode = e.target.value;
            apply_filters();
        });
    }

    // price slider
    if (price_slider) {
        price_slider.addEventListener('input', (e) => {
            max_price = parseFloat(e.target.value);
            if (max_price_display) {
                max_price_display.textContent = `₱${max_price.toLocaleString()}`;
            }
            apply_filters();
        });
    }

    // sale checkbox
    if (sale_checkbox) {
        sale_checkbox.addEventListener('change', (e) => {
            only_sale = e.target.checked;
            apply_filters();
        });
    }

    // reset filters button
    if (btn_reset_filters) {
        btn_reset_filters.addEventListener('click', () => {
            search_query = '';
            if (search_input) search_input.value = '';
            if (header_search_input) header_search_input.value = '';
            sort_mode = 'featured';
            if (sort_select) sort_select.value = 'featured';
            max_price = 50000;
            if (price_slider) price_slider.value = 50000;
            if (max_price_display) max_price_display.textContent = '₱50,000';
            if (sale_checkbox) sale_checkbox.checked = false;
            only_sale = false;
            set_active_category('all', 'All Products');
        });
    }

    // toast notification for cart
    let toast_timeout;
    function show_cart_toast(product_name) {
        if (!cart_toast) return;
        if (toast_product_name) toast_product_name.textContent = product_name;
        cart_toast.classList.add('show');
        clearTimeout(toast_timeout);
        toast_timeout = setTimeout(() => {
            cart_toast.classList.remove('show');
        }, 2800);
    }

    // add to cart click
    document.querySelectorAll('.btn_card_add_cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.product_card_item');
            const name = card ? card.getAttribute('data-name') : 'Item';
            cart_items_count++;
            if (cart_counter_badge) {
                cart_counter_badge.textContent = cart_items_count;
            }
            show_cart_toast(name);
        });
    });

    // mobile filter drawer interactions
    function open_mobile_sidebar() {
        if (shop_sidebar) shop_sidebar.classList.add('open');
        if (sidebar_overlay) sidebar_overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close_mobile_sidebar() {
        if (shop_sidebar) shop_sidebar.classList.remove('open');
        if (sidebar_overlay) sidebar_overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (btn_mobile_category_trigger) btn_mobile_category_trigger.addEventListener('click', open_mobile_sidebar);
    if (btn_mobile_filter) btn_mobile_filter.addEventListener('click', open_mobile_sidebar);
    if (btn_apply_mobile_filters) btn_apply_mobile_filters.addEventListener('click', close_mobile_sidebar);
    if (sidebar_close_mobile) sidebar_close_mobile.addEventListener('click', close_mobile_sidebar);
    if (sidebar_overlay) sidebar_overlay.addEventListener('click', close_mobile_sidebar);

    // sync mobile and desktop sort selects
    if (mobile_sort_select) {
        mobile_sort_select.addEventListener('change', (e) => {
            sort_mode = e.target.value;
            if (sort_select) sort_select.value = sort_mode;
            apply_filters();
        });
    }

    if (sort_select) {
        sort_select.addEventListener('change', (e) => {
            sort_mode = e.target.value;
            if (mobile_sort_select) mobile_sort_select.value = sort_mode;
            apply_filters();
        });
    }

    // mobile main navigation interactions
    function open_main_nav() {
        if (main_navigation) main_navigation.classList.add('open');
        if (nav_overlay) nav_overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close_main_nav() {
        if (main_navigation) main_navigation.classList.remove('open');
        if (nav_overlay) nav_overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (mobile_nav_toggle) mobile_nav_toggle.addEventListener('click', open_main_nav);
    if (mobile_nav_close) mobile_nav_close.addEventListener('click', close_main_nav);
    if (nav_overlay) nav_overlay.addEventListener('click', close_main_nav);

    // initial setup
    apply_filters();
});
