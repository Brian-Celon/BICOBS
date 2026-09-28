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
    let product_cards = Array.from(document.querySelectorAll('.product_card_item'));
    const results_count_el = document.getElementById('results_count');
    const active_heading_el = document.getElementById('active_filter_heading');
    const empty_state_el = document.getElementById('empty_catalog_state');
    const search_input = document.getElementById('catalog_search_input');
    const sort_select = document.getElementById('catalog_sort_select');
    const price_slider = document.getElementById('price_slider');
    const max_price_display = document.getElementById('max_price_display');
    const sale_checkbox = document.getElementById('filter_sale');
    const btn_reset_filters = document.getElementById('btn_reset_filters');
    const category_item_btns = document.querySelectorAll('.category_item_btn');
    const cart_counter_badge = document.getElementById('cart_badge_counter');
    const cart_toast = document.getElementById('cart_toast');

    // Fetch Products dynamically from Backend API if available
    async function loadProductsFromBackend() {
        try {
            const res = await fetch('/api/products');
            if (!res.ok) return;
            const result = await res.json();
            if (result.status === 'success' && result.data && result.data.length > 0) {
                renderProductsGrid(result.data);
            }
        } catch (err) {
            console.log('Using static HTML product cards fallback.');
        }
    }

    function renderProductsGrid(products) {
        if (!products_grid) return;
        products_grid.innerHTML = '';

        products.forEach(item => {
            const card = document.createElement('div');
            card.className = 'product_card_item';
            card.setAttribute('data-category', item.category || 'all');
            card.setAttribute('data-type', item.category === 'bicycles' ? 'bike' : 'parts');
            card.setAttribute('data-price', item.price);
            card.setAttribute('data-name', item.name);

            let badgeHTML = '';
            if (item.stockQuantity === 0) {
                badgeHTML = '<span class="card_tag_badge badge_sale">Out of Stock</span>';
            } else if (item.stockQuantity <= 3 && item.stockQuantity > 0) {
                badgeHTML = '<span class="card_tag_badge badge_new">Low Stock</span>';
            }

            card.innerHTML = `
                ${badgeHTML}
                <div class="card_image_box">
                    <img class="card_image" src="${item.imageUrl || 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600'}" alt="${item.name}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600';">
                </div>
                <div class="card_details">
                    <span class="card_category_type">${(item.category || '').replace(/_/g, ' ').toUpperCase()}</span>
                    <h3 class="card_title">${item.name}</h3>
                    <div class="card_footer">
                        <div class="card_price_block">
                            <span class="card_current_price">&#8369;${item.price.toLocaleString()}</span>
                        </div>
                        <button class="btn_card_add_cart" data-id="${item._id}" data-name="${item.name}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            Add
                        </button>
                    </div>
                </div>
            `;
            products_grid.appendChild(card);
        });

        product_cards = Array.from(document.querySelectorAll('.product_card_item'));
        apply_filters();
    }

    // filter and sort execution
    function apply_filters() {
        let visible_count = 0;

        product_cards.forEach(card => {
            const card_category = card.getAttribute('data-category');
            const card_type = card.getAttribute('data-type');
            const card_price = parseFloat(card.getAttribute('data-price')) || 0;
            const card_title = (card.getAttribute('data-name') || '').toLowerCase();

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

            const matches_search = !search_query || card_title.includes(search_query);
            const matches_price = card_price <= max_price;

            if (matches_category && matches_search && matches_price) {
                card.style.display = 'block';
                visible_count++;
            } else {
                card.style.display = 'none';
            }
        });

        if (results_count_el) results_count_el.textContent = `${visible_count} Products`;
        if (empty_state_el) empty_state_el.style.display = visible_count === 0 ? 'block' : 'none';
    }

    if (search_input) {
        search_input.addEventListener('input', (e) => {
            search_query = e.target.value.toLowerCase().trim();
            apply_filters();
        });
    }

    // Try loading products from backend API
    loadProductsFromBackend();
    apply_filters();
});
