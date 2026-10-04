// shop catalog interactive filter, search, and cart controller
document.addEventListener('DOMContentLoaded', () => {
    // state
    const selected_categories = new Set(); // Empty means 'all' products
    let search_query = '';
    let sort_mode = 'featured';
    let max_price = 100000;
    let only_sale = false;
    let all_products = [];

    // dom elements
    const products_grid = document.getElementById('products_grid');
    let product_cards = [];
    const results_count_el = document.getElementById('results_count');
    const active_heading_el = document.getElementById('active_filter_heading');
    const empty_state_el = document.getElementById('empty_catalog_state');
    const search_input = document.getElementById('catalog_search_input');
    const sort_select = document.getElementById('catalog_sort_select');
    const mobile_sort_select = document.getElementById('mobile_sort_select');
    const price_slider = document.getElementById('price_slider');
    const max_price_display = document.getElementById('max_price_display');
    const sale_checkbox = document.getElementById('filter_sale');
    const btn_reset_filters = document.getElementById('btn_reset_filters');
    const category_item_btns = document.querySelectorAll('.category_item_btn');
    const mobile_active_cat_el = document.getElementById('mobile_btn_active_cat');
    const mobile_filter_badge = document.getElementById('mobile_filter_badge');
    const mobile_apply_badge = document.getElementById('mobile_apply_badge');

    // Mobile sidebar elements
    const shop_sidebar = document.getElementById('shop_sidebar');
    const sidebar_overlay = document.getElementById('sidebar_mobile_overlay');
    const btn_mobile_category = document.getElementById('btn_mobile_category_trigger');
    const btn_mobile_filter = document.getElementById('btn_mobile_filter');
    const btn_sidebar_close = document.getElementById('sidebar_close_mobile');
    const btn_apply_mobile = document.getElementById('btn_apply_mobile_filters');

    // Mobile drawer toggle handlers
    function openMobileDrawer() {
        if (shop_sidebar) shop_sidebar.classList.add('open');
        if (sidebar_overlay) sidebar_overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileDrawer() {
        if (shop_sidebar) shop_sidebar.classList.remove('open');
        if (sidebar_overlay) sidebar_overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (btn_mobile_category) btn_mobile_category.addEventListener('click', openMobileDrawer);
    if (btn_mobile_filter) btn_mobile_filter.addEventListener('click', openMobileDrawer);
    if (btn_sidebar_close) btn_sidebar_close.addEventListener('click', closeMobileDrawer);
    if (sidebar_overlay) sidebar_overlay.addEventListener('click', closeMobileDrawer);
    if (btn_apply_mobile) btn_apply_mobile.addEventListener('click', closeMobileDrawer);

    // Helper: Check if a product matches a specific category key
    function matchesCategory(item, catKey) {
        if (!catKey || catKey === 'all') return true;
        const cat = (item.category || '').toLowerCase().trim();
        const target = catKey.toLowerCase().trim();

        if (cat === target) return true;
        if (target === 'built_bikes' && (cat === 'bicycles' || cat === 'built bikes')) return true;
        return false;
    }

    // Helper: Check if product matches currently selected category checkboxes
    function matchesSelectedCategories(item) {
        if (selected_categories.size === 0) return true;
        for (const catKey of selected_categories) {
            if (matchesCategory(item, catKey)) return true;
        }
        return false;
    }

    // Update Category Badges & Counts in Sidebar
    function updateSidebarCategoryCounts(products) {
        if (!category_item_btns) return;

        category_item_btns.forEach(btn => {
            const targetCat = btn.getAttribute('data-category');
            if (targetCat === 'all') {
                const countSpan = btn.querySelector('.category_item_count');
                if (countSpan) countSpan.textContent = products.length;
                return;
            }
            const count = products.filter(p => matchesCategory(p, targetCat)).length;
            const countSpan = btn.querySelector('.category_item_count');
            if (countSpan) {
                countSpan.textContent = count;
            }
        });

        // Group counts in sidebar
        const badgeBuiltBikes = document.getElementById('badge_built_bikes');
        if (badgeBuiltBikes) {
            badgeBuiltBikes.textContent = products.filter(p => matchesCategory(p, 'built_bikes')).length;
        }

        const badgeFrames = document.getElementById('badge_frames_group');
        if (badgeFrames) {
            badgeFrames.textContent = products.filter(p => ['frame', 'fork', 'handle_bar', 'stem'].some(c => matchesCategory(p, c))).length;
        }

        const badgeDrivetrain = document.getElementById('badge_drivetrain_group');
        if (badgeDrivetrain) {
            badgeDrivetrain.textContent = products.filter(p => ['chain', 'upgrade_kit', 'pedals'].some(c => matchesCategory(p, c))).length;
        }

        const badgeWheels = document.getElementById('badge_wheels_group');
        if (badgeWheels) {
            badgeWheels.textContent = products.filter(p => ['tires', 'rims', 'hubs'].some(c => matchesCategory(p, c))).length;
        }

        const badgeAccessories = document.getElementById('badge_accessories_group');
        if (badgeAccessories) {
            badgeAccessories.textContent = products.filter(p => ['saddle', 'handle_grip'].some(c => matchesCategory(p, c))).length;
        }

        if (mobile_filter_badge) mobile_filter_badge.textContent = products.length;
        if (mobile_apply_badge) mobile_apply_badge.textContent = products.length;
    }

    // Helper: Update active category heading & mobile text
    function updateHeadingText() {
        if (selected_categories.size === 0) {
            if (active_heading_el) active_heading_el.textContent = 'All Products';
            if (mobile_active_cat_el) mobile_active_cat_el.textContent = 'All Products';
            return;
        }

        // Collect names of all selected categories
        const names = [];
        category_item_btns.forEach(btn => {
            const cat = btn.getAttribute('data-category');
            if (selected_categories.has(cat)) {
                const name = btn.querySelector('.category_name')?.textContent?.trim() || cat;
                names.push(name);
            }
        });

        let headingText = '';
        if (names.length === 1) {
            headingText = names[0];
        } else if (names.length === 2) {
            headingText = `${names[0]}, ${names[1]}`;
        } else {
            headingText = `${names[0]}, ${names[1]} (+${names.length - 2} more)`;
        }

        if (active_heading_el) active_heading_el.textContent = headingText;
        if (mobile_active_cat_el) {
            mobile_active_cat_el.textContent = names.length === 1 ? names[0] : `${names.length} Categories Selected`;
        }
    }

    // Fetch Products dynamically from Backend API
    async function loadProductsFromBackend() {
        if (results_count_el) results_count_el.textContent = 'Loading products...';

        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error('API response was not ok');
            const result = await res.json();
            if (result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
                all_products = result.data;
                updateSidebarCategoryCounts(all_products);
                renderProductsGrid(all_products);
                return;
            }
        } catch (err) {
            console.warn('Backend fetch failed, falling back to static cards:', err);
            product_cards = Array.from(document.querySelectorAll('.product_card_item'));
            apply_filters();
        }
    }

    function renderProductsGrid(products) {
        if (!products_grid) return;
        products_grid.innerHTML = '';

        products.forEach((item, index) => {
            const card = document.createElement('article');
            card.className = 'product_card_item';
            const prodId = item._id || item.id || String(index);
            const prodCategory = item.category || 'general';
            const prodPrice = parseFloat(item.price) || 0;
            const prodName = item.name || 'Bicycle Product';
            const prodStock = typeof item.stockQuantity === 'number' ? item.stockQuantity : (typeof item.stock_quantity === 'number' ? item.stock_quantity : 10);
            const isOutOfStock = prodStock <= 0;

            card.setAttribute('data-id', prodId);
            card.setAttribute('data-category', prodCategory);
            card.setAttribute('data-price', prodPrice);
            card.setAttribute('data-name', prodName);

            let badgeHTML = '';
            if (isOutOfStock) {
                badgeHTML = '<span class="card_tag_badge badge_sale">Out of Stock</span>';
            } else if (prodStock <= 3 && prodStock > 0) {
                badgeHTML = `<span class="card_tag_badge badge_new">Low Stock (${prodStock})</span>`;
            } else if (item.isFeatured || item.is_featured) {
                badgeHTML = '<span class="card_tag_badge badge_bestseller">FEATURED</span>';
            }

            const imgUrl = item.imageUrl || item.image_url || '/frontend/Pictures/placeholder.png';

            card.innerHTML = `
                ${badgeHTML}
                <div class="card_image_box">
                    <img class="card_image" src="${imgUrl}" alt="${prodName}" loading="lazy" onerror="this.onerror=null; this.src='/frontend/Pictures/placeholder.png';">
                </div>
                <div class="card_details">
                    <span class="card_category_type">${prodCategory.replace(/_/g, ' ').toUpperCase()}</span>
                    <h3 class="card_title">${prodName}</h3>
                    <div class="card_footer">
                        <div class="card_price_block">
                            <span class="card_current_price">&#8369;${prodPrice.toLocaleString()}</span>
                        </div>
                        <button type="button" class="btn_card_add_cart" data-id="${prodId}" ${isOutOfStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            ${isOutOfStock ? 'Out of Stock' : '+ Add to cart'}
                        </button>
                    </div>
                </div>
            `;
            products_grid.appendChild(card);
        });

        product_cards = Array.from(products_grid.querySelectorAll('.product_card_item'));
        apply_filters();
    }

    // Delegated Add to Cart click handler
    if (products_grid) {
        products_grid.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.btn_card_add_cart');
            if (!addBtn || addBtn.disabled) return;

            const productId = addBtn.getAttribute('data-id');
            const product = all_products.find(p => String(p._id || p.id) === String(productId));

            if (product && window.BICOBS_Cart) {
                const added = window.BICOBS_Cart.addToCart(product, 1);
                if (added) {
                    const originalHTML = addBtn.innerHTML;
                    addBtn.innerHTML = '✓ Added!';
                    addBtn.style.backgroundColor = '#16a34a';
                    addBtn.style.color = '#ffffff';
                    setTimeout(() => {
                        addBtn.innerHTML = originalHTML;
                        addBtn.style.backgroundColor = '';
                        addBtn.style.color = '';
                    }, 1200);
                }
            } else if (!product && window.BICOBS_Cart) {
                const card = addBtn.closest('.product_card_item');
                const name = card?.getAttribute('data-name') || 'Product';
                const price = parseFloat(card?.getAttribute('data-price')) || 0;
                const img = card?.querySelector('.card_image')?.src;
                window.BICOBS_Cart.addToCart({ id: productId || name, name, price, imageUrl: img, stockQuantity: 10 }, 1);
            }
        });
    }

    // Filter and sort execution
    function apply_filters() {
        let visible_count = 0;
        const visible_cards = [];

        product_cards.forEach(card => {
            const cardId = card.getAttribute('data-id');
            const card_price = parseFloat(card.getAttribute('data-price')) || 0;
            const card_title = (card.getAttribute('data-name') || '').toLowerCase();

            // Find matching product data object
            const prodObj = all_products.find(p => String(p._id || p.id) === String(cardId)) || {
                category: card.getAttribute('data-category'),
                name: card.getAttribute('data-name'),
                price: card_price
            };

            const matches_cat = matchesSelectedCategories(prodObj);
            const matches_search = !search_query || card_title.includes(search_query);
            const matches_price = card_price <= max_price;
            const matches_sale = !only_sale || Boolean(prodObj.isSale || prodObj.is_sale || (prodObj.stock_quantity <= 3 && prodObj.stock_quantity > 0));

            if (matches_cat && matches_search && matches_price && matches_sale) {
                card.style.display = 'block';
                visible_count++;
                visible_cards.push(card);
            } else {
                card.style.display = 'none';
            }
        });

        // Apply Sorting
        visible_cards.sort((a, b) => {
            const priceA = parseFloat(a.getAttribute('data-price')) || 0;
            const priceB = parseFloat(b.getAttribute('data-price')) || 0;
            const nameA = (a.getAttribute('data-name') || '').toLowerCase();
            const nameB = (b.getAttribute('data-name') || '').toLowerCase();

            if (sort_mode === 'price_asc' || sort_mode === 'price_low') return priceA - priceB;
            if (sort_mode === 'price_desc' || sort_mode === 'price_high') return priceB - priceA;
            if (sort_mode === 'name_asc' || sort_mode === 'name_az') return nameA.localeCompare(nameB);
            return 0; // featured/default
        });

        visible_cards.forEach(card => products_grid.appendChild(card));

        // Update counters in UI
        const totalCount = all_products.length || product_cards.length;
        if (results_count_el) {
            results_count_el.textContent = `Showing ${visible_count} of ${totalCount} items`;
        }
        if (mobile_filter_badge) mobile_filter_badge.textContent = visible_count;
        if (mobile_apply_badge) mobile_apply_badge.textContent = visible_count;
        if (empty_state_el) empty_state_el.style.display = visible_count === 0 ? 'block' : 'none';
    }

    // Category button filters (Checkboxes behavior: multi-select support)
    if (category_item_btns) {
        const allBtn = document.querySelector('.category_item_btn[data-category="all"]');

        category_item_btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const catKey = btn.getAttribute('data-category');

                if (catKey === 'all') {
                    // Clicking 'All Products' clears all category filters and activates 'All'
                    selected_categories.clear();
                    category_item_btns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                } else {
                    // Clicking any specific category toggles its checkbox
                    if (allBtn) allBtn.classList.remove('active');

                    if (selected_categories.has(catKey)) {
                        selected_categories.delete(catKey);
                        btn.classList.remove('active');
                    } else {
                        selected_categories.add(catKey);
                        btn.classList.add('active');
                    }

                    // If user unchecks all specific categories, default back to 'All Products'
                    if (selected_categories.size === 0) {
                        if (allBtn) allBtn.classList.add('active');
                    }
                }

                updateHeadingText();
                apply_filters();
            });
        });
    }

    // Live search input
    if (search_input) {
        search_input.addEventListener('input', (e) => {
            search_query = e.target.value.toLowerCase().trim();
            apply_filters();
        });
    }

    // Sort select (Desktop)
    if (sort_select) {
        sort_select.addEventListener('change', (e) => {
            sort_mode = e.target.value;
            if (mobile_sort_select) mobile_sort_select.value = sort_mode;
            apply_filters();
        });
    }

    // Sort select (Mobile)
    if (mobile_sort_select) {
        mobile_sort_select.addEventListener('change', (e) => {
            sort_mode = e.target.value;
            if (sort_select) sort_select.value = sort_mode;
            apply_filters();
        });
    }

    // Price slider
    if (price_slider) {
        price_slider.max = 100000;
        price_slider.value = 100000;
        max_price = 100000;
        if (max_price_display) max_price_display.textContent = '₱100,000';

        price_slider.addEventListener('input', (e) => {
            max_price = parseFloat(e.target.value) || 100000;
            if (max_price_display) max_price_display.textContent = `₱${max_price.toLocaleString()}`;
            apply_filters();
        });
    }

    // Sale checkbox
    if (sale_checkbox) {
        sale_checkbox.addEventListener('change', (e) => {
            only_sale = e.target.checked;
            apply_filters();
        });
    }

    // Reset filters
    if (btn_reset_filters) {
        btn_reset_filters.addEventListener('click', () => {
            selected_categories.clear();
            search_query = '';
            max_price = 100000;
            sort_mode = 'featured';
            only_sale = false;
            if (search_input) search_input.value = '';
            if (price_slider) price_slider.value = 100000;
            if (max_price_display) max_price_display.textContent = '₱100,000';
            if (sort_select) sort_select.value = 'featured';
            if (mobile_sort_select) mobile_sort_select.value = 'featured';
            if (sale_checkbox) sale_checkbox.checked = false;

            category_item_btns.forEach(b => b.classList.remove('active'));
            const allBtn = document.querySelector('.category_item_btn[data-category="all"]');
            if (allBtn) allBtn.classList.add('active');
            updateHeadingText();
            apply_filters();
        });
    }

    // Initial load
    loadProductsFromBackend();
});
