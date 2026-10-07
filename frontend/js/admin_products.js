/**
 * TaurOS Admin Panel - Products Controller
 * Loads real-time product catalog from GET /api/products, handles category filtering,
 * search, sorting, and full CRUD operations (POST, PUT, DELETE).
 */

const CATEGORY_NAMES = {
    all: "All Products",
    bicycles: "All Bikes",
    built_bikes: "Complete Bicycles",
    mountain_bikes: "Mountain Bikes",
    road_bikes: "Road Bikes",
    gravel_bikes: "Gravel Bikes",
    bmx_urban: "BMX & Urban",
    folding_commuter: "Folding Bikes",
    frame: "Framesets",
    frames: "Frames & Forks",
    fork: "Forks & Suspension",
    handle_bar: "Handlebars",
    handlebars_saddles: "Handlebars & Saddles",
    stem: "Stems",
    chain: "Chains",
    upgrade_kit: "Upgrade Kits & Groupsets",
    gears: "Gears & Drivetrain",
    pedals: "Pedals & Cleats",
    tires: "Tires",
    rims: "Rims & Wheelsets",
    rims_tires: "Rims & Tires",
    hubs: "Sealed Hubs",
    saddle: "Saddles",
    handle_grip: "Grips & Bartapes",
    brakes: "Brakes & Rotors",
    apparel: "Apparel & Shoes"
};

const BIKE_CATEGORIES = [
    "bicycles",
    "built_bikes",
    "mountain_bikes",
    "road_bikes",
    "gravel_bikes",
    "bmx_urban",
    "folding_commuter"
];

let storeProducts = [];
let selectedCategory = "all";
let currentSearchQuery = "";
let currentSort = "default";

document.addEventListener("DOMContentLoaded", () => {
    loadAdminProducts();
    initProductAutoSKU();
});

let productAutoSKURefresh = null;

function initProductAutoSKU() {
    if (typeof attachAutoSKUGenerator === 'function') {
        productAutoSKURefresh = attachAutoSKUGenerator({
            nameInputId: "new_product_title",
            catInputId: "new_product_category",
            skuInputId: "new_product_sku",
            regenBtnId: "regen_new_product_sku_btn"
        });
    }
}

function openAddProductModal() {
    if (typeof openModal === 'function') {
        openModal("add_product_modal");
    }
    const skuInput = document.getElementById("new_product_sku");
    if (skuInput && (!skuInput.value || skuInput.value.trim() === '')) {
        const cat = document.getElementById("new_product_category")?.value || "";
        const name = document.getElementById("new_product_title")?.value || "";
        if (typeof generateAutoSKU === 'function') {
            skuInput.value = generateAutoSKU(cat, name);
        }
    }
}
window.openAddProductModal = openAddProductModal;

// Load live products from backend API
async function loadAdminProducts() {
    const grid = document.getElementById("products_grid");
    const emptyState = document.getElementById("empty_products_state");

    if (grid) {
        grid.style.display = "grid";
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: #64748b;">
                <i class="fas fa-spinner fa-spin" style="font-size: 28px; color: #b91c1c; margin-bottom: 12px; display: block;"></i>
                Loading live product catalog from database...
            </div>
        `;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl("/api/products") : "/api/products";
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (res.ok && data.status === "success") {
            storeProducts = data.data || [];
            updateCategoryCounters();
            renderProductGrid();
        } else {
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: #ef4444;">
                        <i class="fas fa-triangle-exclamation" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                        Failed to load products: ${data.message || 'Unknown error'}
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Products load error:", err);
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: #ef4444;">
                    <i class="fas fa-plug-circle-xmark" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    Unable to connect to backend server.
                </div>
            `;
        }
    }
}

// Helper: Category display resolver
function getCategoryDisplayName(item) {
    if (!item) return "General";
    const cat = (item.category || '').toLowerCase();
    if (CATEGORY_NAMES[cat]) return CATEGORY_NAMES[cat];
    return cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function isBikeCategory(cat) {
    return BIKE_CATEGORIES.includes((cat || '').toLowerCase());
}

// Update category tab badges and dropdown counters
function updateCategoryCounters() {
    const counts = {
        all: storeProducts.length,
        bicycles: storeProducts.filter(p => isBikeCategory(p.category)).length,
        mountain_bikes: storeProducts.filter(p => p.category === "mountain_bikes").length,
        road_bikes: storeProducts.filter(p => p.category === "road_bikes").length,
        gravel_bikes: storeProducts.filter(p => p.category === "gravel_bikes").length,
        bmx_urban: storeProducts.filter(p => p.category === "bmx_urban").length,
        folding_commuter: storeProducts.filter(p => p.category === "folding_commuter").length,
        frames: storeProducts.filter(p => p.category === "frame" || p.category === "frames" || p.category === "fork").length,
        gears: storeProducts.filter(p => p.category === "upgrade_kit" || p.category === "chain" || p.category === "gears").length,
        brakes: storeProducts.filter(p => p.category === "brakes").length,
        pedals: storeProducts.filter(p => p.category === "pedals").length,
        rims_tires: storeProducts.filter(p => p.category === "tires" || p.category === "rims" || p.category === "hubs" || p.category === "rims_tires").length,
        handlebars_saddles: storeProducts.filter(p => p.category === "handle_bar" || p.category === "stem" || p.category === "saddle" || p.category === "handle_grip" || p.category === "handlebars_saddles").length,
        apparel: storeProducts.filter(p => p.category === "apparel").length
    };

    for (const key in counts) {
        const badgeEl = document.getElementById("count_" + key);
        if (badgeEl) badgeEl.textContent = `(${counts[key]})`;
    }

    const selectEl = document.getElementById("product_category_select");
    if (selectEl) {
        Array.from(selectEl.options).forEach(opt => {
            const val = opt.value;
            if (counts[val] !== undefined) {
                const baseText = opt.textContent.replace(/\s\(\d+\)$/, "");
                opt.textContent = `${baseText} (${counts[val]})`;
            }
        });
    }
}

// Get filtered and sorted products
function getFilteredProducts() {
    let list = [...storeProducts];

    // Filter by category
    if (selectedCategory && selectedCategory !== "all") {
        if (selectedCategory === "bicycles") {
            list = list.filter(p => isBikeCategory(p.category));
        } else if (selectedCategory === "frames") {
            list = list.filter(p => p.category === "frame" || p.category === "frames" || p.category === "fork");
        } else if (selectedCategory === "gears") {
            list = list.filter(p => p.category === "upgrade_kit" || p.category === "chain" || p.category === "gears");
        } else if (selectedCategory === "rims_tires") {
            list = list.filter(p => p.category === "tires" || p.category === "rims" || p.category === "hubs" || p.category === "rims_tires");
        } else if (selectedCategory === "handlebars_saddles") {
            list = list.filter(p => p.category === "handle_bar" || p.category === "stem" || p.category === "saddle" || p.category === "handle_grip" || p.category === "handlebars_saddles");
        } else {
            list = list.filter(p => (p.category || "").toLowerCase() === selectedCategory.toLowerCase());
        }
    }

    // Filter by search query
    if (currentSearchQuery) {
        list = list.filter(p => {
            const name = (p.name || p.title || "").toLowerCase();
            const sku = (p.sku || "").toLowerCase();
            const cat = (p.category || "").toLowerCase();
            const desc = (p.description || "").toLowerCase();
            return name.includes(currentSearchQuery) || sku.includes(currentSearchQuery) || cat.includes(currentSearchQuery) || desc.includes(currentSearchQuery);
        });
    }

    // Sort products
    if (currentSort === "price_asc") {
        list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (currentSort === "price_desc") {
        list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (currentSort === "name_asc") {
        list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    }

    return list;
}

// Render products grid
function renderProductGrid(items = null) {
    const list = items || getFilteredProducts();
    const grid = document.getElementById("products_grid");
    const emptyState = document.getElementById("empty_products_state");

    if (list.length === 0) {
        if (grid) grid.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (grid) {
        grid.style.display = "grid";
        grid.innerHTML = list.map(item => {
            const id = item.id || item._id;
            const title = item.name || item.title || "Product";
            const price = parseFloat(item.price) || 0;
            const stock = parseInt(item.stock_quantity ?? item.stockQuantity ?? 0, 10);
            const sku = item.sku || `SKU-${id}`;
            const image = item.image_url || item.imageUrl || item.image || "/frontend/Pictures/placeholder.png";
            const catName = getCategoryDisplayName(item);

            const stockColor = stock === 0 ? "#dc2626" : (stock <= 3 ? "#d97706" : "#16a34a");
            const stockLabel = stock === 0 ? "Out of Stock" : `Stock: ${stock}`;

            return `
                <article class="product_card" data_item="${id}">
                    <div class="product_card_img_wrap" style="position: relative;">
                        <img src="${image}" alt="${title}" class="product_card_img" onerror="this.onerror=null; this.src='/frontend/Pictures/placeholder.png';">
                        <span style="position: absolute; top: 10px; right: 10px; background: rgba(15, 23, 42, 0.85); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; backdrop-filter: blur(4px);">
                            ${sku}
                        </span>
                    </div>
                    <div class="product_card_body">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span class="product_card_category">${catName}</span>
                            <span style="font-size: 11px; font-weight: 700; color: ${stockColor};">${stockLabel}</span>
                        </div>
                        <h3 class="product_card_title" title="${title}">${title}</h3>
                        <div class="product_card_footer" style="margin-top: 10px;">
                            <span class="product_card_price">₱${price.toLocaleString()}</span>
                            <div class="product_card_actions">
                                <button type="button" class="product_action_btn" onclick="openEditProduct('${id}')" title="Edit Product">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button type="button" class="product_action_btn product_action_btn_danger" onclick="deleteProductItem('${id}')" title="Delete Product">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    }
}

// Category tab switching
function selectCategoryTab(category, btnElement = null) {
    selectedCategory = category;

    document.querySelectorAll(".products_tab_btn").forEach(btn => {
        btn.classList.remove("tab_active");
    });

    if (btnElement) {
        btnElement.classList.add("tab_active");
    } else {
        const matchingBtn = document.querySelector(`.products_tab_btn[data-cat="${category}"]`);
        if (matchingBtn) matchingBtn.classList.add("tab_active");
    }

    const selectEl = document.getElementById("product_category_select");
    if (selectEl) selectEl.value = category;

    renderProductGrid();
}

function handleCategorySelectChange(val) {
    selectCategoryTab(val);
}

function filterProducts() {
    const searchInput = document.getElementById("product_search_input");
    const sortSelect = document.getElementById("product_sort_select");

    if (searchInput) currentSearchQuery = searchInput.value.toLowerCase().trim();
    if (sortSelect) currentSort = sortSelect.value;

    renderProductGrid();
}

function resetProductFilters() {
    const searchInput = document.getElementById("product_search_input");
    const sortSelect = document.getElementById("product_sort_select");

    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "default";

    currentSearchQuery = "";
    currentSort = "default";
    selectCategoryTab("all");
}

// Image Preset & Upload Helpers for Add Modal
function pickPresetAsset(url, el) {
    document.querySelectorAll(".clean_preset_thumb").forEach(t => t.style.borderColor = "#e2e8f0");
    if (el) el.style.borderColor = "#b91c1c";

    const hiddenVal = document.getElementById("new_product_image_val");
    if (hiddenVal) hiddenVal.value = url;

    const previewWrap = document.getElementById("new_product_preview_wrap");
    const previewImg = document.getElementById("new_product_preview_img");
    if (previewWrap && previewImg) {
        previewImg.src = url;
        previewWrap.style.display = "flex";
    }
}

function handleProductImageFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64 = evt.target.result;
        pickPresetAsset(base64, null);
    };
    reader.readAsDataURL(file);
}

function resetProductImage() {
    const hiddenVal = document.getElementById("new_product_image_val");
    const fileInput = document.getElementById("new_product_file");
    const previewWrap = document.getElementById("new_product_preview_wrap");

    if (hiddenVal) hiddenVal.value = "/frontend/Pictures/placeholder.png";
    if (fileInput) fileInput.value = "";
    if (previewWrap) previewWrap.style.display = "none";
}

// Add New Product Submission
async function handleAddProductSubmit(e) {
    e.preventDefault();
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) {
        alert("You must be logged in as an administrator.");
        return;
    }

    const title = (document.getElementById("new_product_title")?.value || "").trim();
    const category = document.getElementById("new_product_category")?.value || "";
    const sku = (document.getElementById("new_product_sku")?.value || "").trim();
    const price = parseFloat(document.getElementById("new_product_price")?.value || 0);
    const stock = parseInt(document.getElementById("new_product_stock")?.value || 0, 10);
    const desc = (document.getElementById("new_product_desc")?.value || "").trim();
    const image = document.getElementById("new_product_image_val")?.value || "/frontend/Pictures/placeholder.png";

    if (!title || !category || price <= 0) {
        alert("Please provide product name, category, and a valid price.");
        return;
    }

    const submitBtn = e.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Product...';
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl("/api/products") : "/api/products";
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: title,
                category: category,
                sku: sku || undefined,
                price: price,
                stock_quantity: stock,
                description: desc,
                image_url: image
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof closeModal === 'function') closeModal("add_product_modal");
            if (typeof showToast === 'function') showToast(`Product "${title}" added to catalog!`, true);
            e.target.reset();
            resetProductImage();
            if (typeof productAutoSKURefresh === 'function') {
                productAutoSKURefresh(true);
            }
            await loadAdminProducts();
        } else {
            alert(data.message || "Failed to create product");
        }
    } catch (err) {
        console.error("Product creation error:", err);
        alert("Server error when adding product.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> <span>Add Product</span>';
        }
    }
}

// Open Edit Product Modal
function openEditProduct(productId) {
    const item = storeProducts.find(p => String(p.id || p._id) === String(productId));
    if (!item) return;

    const idInput = document.getElementById("edit_item_id");
    const titleInput = document.getElementById("edit_item_title");
    const priceInput = document.getElementById("edit_item_price");
    const catInput = document.getElementById("edit_item_category");
    const stockInput = document.getElementById("edit_item_stock");
    const descInput = document.getElementById("edit_item_desc");

    if (idInput) idInput.value = item.id || item._id;
    if (titleInput) titleInput.value = item.name || item.title || "";
    if (priceInput) priceInput.value = item.price || 0;
    if (catInput) catInput.value = item.category || "mountain_bikes";
    if (stockInput) stockInput.value = item.stock_quantity ?? item.stockQuantity ?? 0;
    if (descInput) descInput.value = item.description || "";

    if (typeof openModal === 'function') openModal("edit_product_modal");
}

// Submit Edit Product Changes
async function handleEditProductSubmit(e) {
    e.preventDefault();
    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    const id = document.getElementById("edit_item_id")?.value;
    const title = (document.getElementById("edit_item_title")?.value || "").trim();
    const price = parseFloat(document.getElementById("edit_item_price")?.value || 0);
    const category = document.getElementById("edit_item_category")?.value || "";
    const stock = parseInt(document.getElementById("edit_item_stock")?.value || 0, 10);
    const desc = (document.getElementById("edit_item_desc")?.value || "").trim();

    if (!id || !title || price <= 0) {
        alert("Please enter a valid product name and price.");
        return;
    }

    const submitBtn = e.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Changes...';
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/products/${id}`) : `/api/products/${id}`;
        const res = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: title,
                price: price,
                category: category,
                stock_quantity: stock,
                description: desc
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof closeModal === 'function') closeModal("edit_product_modal");
            if (typeof showToast === 'function') showToast(`Product "${title}" updated successfully!`, true);
            await loadAdminProducts();
        } else {
            alert(data.message || "Failed to update product");
        }
    } catch (err) {
        console.error("Product update error:", err);
        alert("Server error when updating product.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> <span>Save Changes</span>';
        }
    }
}

// Delete Product from Catalog
async function deleteProductItem(productId) {
    const item = storeProducts.find(p => String(p.id || p._id) === String(productId));
    const title = item ? (item.name || item.title) : `Product #${productId}`;

    const confirmDelete = confirm(`Are you sure you want to permanently delete "${title}" from the store catalog?`);
    if (!confirmDelete) return;

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) return;

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/products/${productId}`) : `/api/products/${productId}`;
        const res = await fetch(apiUrl, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof showToast === 'function') showToast(`Product "${title}" deleted from catalog.`, true);
            await loadAdminProducts();
        } else {
            alert(data.message || "Failed to delete product");
        }
    } catch (err) {
        console.error("Product deletion error:", err);
        alert("Server error when deleting product.");
    }
}
