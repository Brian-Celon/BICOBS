/**
 * TaurOS Admin Panel - Inventory Management Controller
 * Dynamically loads all products, calculates stock KPIs, manages search & filtering,
 * renders paginated inventory table, and allows real-time stock updates (PUT /api/products/:id).
 */

const INVENTORY_CATEGORY_LABELS = {
    all: "All Categories",
    mountain_bikes: "Mountain Bikes",
    road_bikes: "Road Bikes",
    gravel_bikes: "Gravel Bikes",
    bmx_urban: "BMX & Urban",
    folding_commuter: "Folding Bikes",
    built_bikes: "Complete Bicycles",
    frame: "Framesets",
    fork: "Forks & Suspension",
    handle_bar: "Handlebars",
    stem: "Stems",
    chain: "Chains",
    upgrade_kit: "Upgrade Kits",
    pedals: "Pedals & Cleats",
    tires: "Tires",
    rims: "Rims & Wheelsets",
    hubs: "Sealed Hubs",
    saddle: "Saddles",
    handle_grip: "Grips & Tapes"
};

let inventoryProducts = [];
let filteredInventory = [];
let inventoryCurrentPage = 1;
const INVENTORY_PAGE_SIZE = 12;

let currentInvSearch = "";
let currentInvCategory = "all";
let currentInvStatus = "all";

document.addEventListener("DOMContentLoaded", () => {
    loadInventory();
    setupInventoryFilters();
});

// Load live products from backend
async function loadInventory() {
    const tbody = document.getElementById("inventory_tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #b91c1c; margin-bottom: 8px; display: block;"></i>
                    Loading live inventory from database...
                </td>
            </tr>
        `;
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl("/api/products") : "/api/products";
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (res.ok && data.status === "success") {
            inventoryProducts = data.data || [];
            updateInventoryStats();
            applyInventoryFilters();
        } else {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                            Failed to load inventory: ${data.message || 'Unknown error'}
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Inventory load error:", err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: #ef4444;">
                        Unable to connect to backend server.
                    </td>
                </tr>
            `;
        }
    }
}

// Compute & update KPI stat cards
function updateInventoryStats() {
    const total = inventoryProducts.length;
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;

    inventoryProducts.forEach(p => {
        const qty = parseInt(p.stock_quantity ?? p.stockQuantity ?? 0, 10);
        if (qty === 0) {
            outStock++;
        } else if (qty <= 3) {
            lowStock++;
        } else {
            inStock++;
        }
    });

    const elTotal = document.getElementById("stat_total_products");
    const elIn = document.getElementById("stat_in_stock");
    const elLow = document.getElementById("stat_low_stock");
    const elOut = document.getElementById("stat_out_stock");

    if (elTotal) elTotal.textContent = total;
    if (elIn) elIn.textContent = inStock;
    if (elLow) elLow.textContent = lowStock;
    if (elOut) elOut.textContent = outStock;
}

// Setup search & filter event listeners
function setupInventoryFilters() {
    const searchInput = document.getElementById("inventory_search_input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentInvSearch = e.target.value.toLowerCase().trim();
            inventoryCurrentPage = 1;
            applyInventoryFilters();
        });
    }

    const catSelect = document.getElementById("inventory_category_filter");
    if (catSelect) {
        catSelect.addEventListener("change", (e) => {
            currentInvCategory = e.target.value;
            inventoryCurrentPage = 1;
            applyInventoryFilters();
        });
    }

    const statusSelect = document.getElementById("inventory_status_filter");
    if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
            currentInvStatus = e.target.value;
            inventoryCurrentPage = 1;
            applyInventoryFilters();
        });
    }

    // Modal close buttons
    document.querySelectorAll(".btn_modal_cancel, .modal_close_btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (typeof closeModal === 'function') {
                closeModal("add_inventory_product_modal");
                closeModal("product_detail_modal");
            }
        });
    });
}

// Filter and paginate dataset
function applyInventoryFilters() {
    filteredInventory = inventoryProducts.filter(item => {
        // Search filter
        if (currentInvSearch) {
            const name = (item.name || item.title || "").toLowerCase();
            const sku = (item.sku || "").toLowerCase();
            const cat = (item.category || "").toLowerCase();
            if (!name.includes(currentInvSearch) && !sku.includes(currentInvSearch) && !cat.includes(currentInvSearch)) {
                return false;
            }
        }

        // Category filter
        if (currentInvCategory && currentInvCategory !== "all") {
            const cat = (item.category || "").toLowerCase();
            if (currentInvCategory === "bicycles") {
                const bikeCats = ["mountain_bikes", "road_bikes", "gravel_bikes", "bmx_urban", "folding_commuter", "built_bikes"];
                if (!bikeCats.includes(cat)) return false;
            } else if (currentInvCategory === "components") {
                const compCats = ["frame", "fork", "handle_bar", "stem", "chain", "upgrade_kit", "pedals"];
                if (!compCats.includes(cat)) return false;
            } else if (currentInvCategory === "tires") {
                const wheelCats = ["tires", "rims", "hubs"];
                if (!wheelCats.includes(cat)) return false;
            } else if (currentInvCategory === "accessories") {
                const accCats = ["saddle", "handle_grip", "accessories"];
                if (!accCats.includes(cat)) return false;
            } else if (cat !== currentInvCategory.toLowerCase()) {
                return false;
            }
        }

        // Stock status filter
        const stock = parseInt(item.stock_quantity ?? item.stockQuantity ?? 0, 10);
        if (currentInvStatus === "in_stock" || currentInvStatus === "In Stock") {
            if (stock <= 3) return false;
        } else if (currentInvStatus === "low_stock" || currentInvStatus === "Low Stock") {
            if (stock === 0 || stock > 3) return false;
        } else if (currentInvStatus === "out_of_stock" || currentInvStatus === "Out of Stock") {
            if (stock !== 0) return false;
        }

        return true;
    });

    renderInventoryTable();
    renderInventoryPagination();
}

// Render Table Rows
function renderInventoryTable() {
    const tbody = document.getElementById("inventory_tbody");
    if (!tbody) return;

    if (filteredInventory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px; color: #64748b;">
                    <i class="fas fa-box-open" style="font-size: 32px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    No inventory products match your filters.
                </td>
            </tr>
        `;
        return;
    }

    const startIdx = (inventoryCurrentPage - 1) * INVENTORY_PAGE_SIZE;
    const endIdx = startIdx + INVENTORY_PAGE_SIZE;
    const pageItems = filteredInventory.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems.map(item => {
        const id = item.id || item._id;
        const name = escapeHtml(item.name || item.title || "Product");
        const sku = escapeHtml(item.sku || `SKU-${id}`);
        const categoryKey = item.category || "other";
        const catLabel = INVENTORY_CATEGORY_LABELS[categoryKey] || categoryKey.replace(/_/g, ' ');
        const stock = parseInt(item.stock_quantity ?? item.stockQuantity ?? 0, 10);
        const price = parseFloat(item.price) || 0;
        const img = item.image_url || item.imageUrl || item.image || "";

        let statusBadge = '<span class="status_pill status_in_stock">In Stock</span>';
        if (stock === 0) {
            statusBadge = '<span class="status_pill status_out_of_stock">Out of Stock</span>';
        } else if (stock <= 3) {
            statusBadge = '<span class="status_pill status_low_stock">Low Stock</span>';
        }

        const catIcon = getCategoryIcon(categoryKey);

        const imgHtml = img
            ? `<img src="${img}" alt="${name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="product_img_placeholder" style="width: 40px; height: 40px; display: none;"><i class="fas ${catIcon}"></i></div>`
            : `<div class="product_img_placeholder" style="width: 40px; height: 40px;"><i class="fas ${catIcon}"></i></div>`;

        return `
            <tr id="inv_row_${id}">
                <td>
                    <div style="display: flex; align-items: center; justify-content: center;">
                        ${imgHtml}
                    </div>
                </td>
                <td class="cell_customer_name prod_name_val" style="font-weight: 600; color: #0f172a;">${name}</td>
                <td class="prod_sku_val" style="font-family: monospace; font-size: 12px; color: #64748b;">${sku}</td>
                <td class="prod_category_val" style="text-transform: capitalize;">${catLabel}</td>
                <td class="cell_amount prod_stock_val" style="font-weight: 700;">
                    <div style="display: inline-flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn_icon_action" style="width: 24px; height: 24px; font-size: 11px; padding: 0; border: 1px solid #e2e8f0; border-radius: 4px; background: #fff;" onclick="quickAdjustStock('${id}', -1)" title="Decrease stock by 1">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span id="stock_display_${id}" style="min-width: 24px; text-align: center;">${stock}</span>
                        <button type="button" class="btn_icon_action" style="width: 24px; height: 24px; font-size: 11px; padding: 0; border: 1px solid #e2e8f0; border-radius: 4px; background: #fff;" onclick="quickAdjustStock('${id}', 1)" title="Increase stock by 1">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td class="prod_status_val" id="status_display_${id}">${statusBadge}</td>
                <td>
                    <button type="button" class="table_action_link" onclick="openProductDetailModal('${id}')">
                        <i class="fas fa-sliders" style="margin-right: 4px;"></i> Manage
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Category Icon helper
function getCategoryIcon(cat) {
    if (["mountain_bikes", "road_bikes", "gravel_bikes", "bmx_urban", "folding_commuter", "built_bikes"].includes(cat)) {
        return "fa-bicycle";
    }
    if (["tires", "rims", "hubs"].includes(cat)) {
        return "fa-circle-notch";
    }
    if (["chain", "upgrade_kit"].includes(cat)) {
        return "fa-link";
    }
    if (["pedals"].includes(cat)) {
        return "fa-shoe-prints";
    }
    if (["saddle", "handle_grip", "stem", "handle_bar"].includes(cat)) {
        return "fa-wrench";
    }
    return "fa-boxes-stacked";
}

// Render pagination info and buttons
function renderInventoryPagination() {
    const total = filteredInventory.length;
    const totalPages = Math.ceil(total / INVENTORY_PAGE_SIZE) || 1;

    const startIdx = total === 0 ? 0 : (inventoryCurrentPage - 1) * INVENTORY_PAGE_SIZE + 1;
    const endIdx = Math.min(inventoryCurrentPage * INVENTORY_PAGE_SIZE, total);

    const infoEl = document.getElementById("inventory_pagination_info");
    if (infoEl) {
        infoEl.textContent = `Showing ${startIdx}-${endIdx} of ${total} products`;
    }

    const controls = document.getElementById("inventory_pagination_controls");
    if (!controls) return;

    let html = `
        <button type="button" class="pagination_btn" id="inv_prev_btn" aria-label="Previous page" onclick="changeInventoryPage(${inventoryCurrentPage - 1})" ${inventoryCurrentPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= inventoryCurrentPage - 1 && p <= inventoryCurrentPage + 1)) {
            html += `
                <button type="button" class="pagination_btn ${p === inventoryCurrentPage ? 'page_active' : ''}" data-page="${p}" onclick="changeInventoryPage(${p})">
                    ${p}
                </button>
            `;
        } else if (p === inventoryCurrentPage - 2 || p === inventoryCurrentPage + 2) {
            html += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
        }
    }

    html += `
        <button type="button" class="pagination_btn" id="inv_next_btn" aria-label="Next page" onclick="changeInventoryPage(${inventoryCurrentPage + 1})" ${inventoryCurrentPage >= totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    controls.innerHTML = html;
}

function changeInventoryPage(page) {
    const totalPages = Math.ceil(filteredInventory.length / INVENTORY_PAGE_SIZE) || 1;
    if (page < 1 || page > totalPages) return;
    inventoryCurrentPage = page;
    renderInventoryTable();
    renderInventoryPagination();
}

// Quick Inline Stock Adjustment (+1 / -1)
async function quickAdjustStock(productId, delta) {
    const item = inventoryProducts.find(p => String(p.id || p._id) === String(productId));
    if (!item) return;

    const currentStock = parseInt(item.stock_quantity ?? item.stockQuantity ?? 0, 10);
    const newStock = Math.max(0, currentStock + delta);
    if (newStock === currentStock) return;

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) {
        alert("Authentication required to modify stock.");
        return;
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/products/${productId}`) : `/api/products/${productId}`;
        const res = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                stock_quantity: newStock
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            item.stock_quantity = newStock;
            updateInventoryStats();
            applyInventoryFilters();
            if (typeof showToast === 'function') {
                showToast(`Stock updated: ${item.name || item.title} is now ${newStock}`, true);
            }
        } else {
            alert(data.message || "Failed to update stock");
        }
    } catch (err) {
        console.error("Stock adjust error:", err);
        alert("Server error when adjusting stock.");
    }
}

// Open Detail Modal
function openProductDetailModal(productId) {
    const item = inventoryProducts.find(p => String(p.id || p._id) === String(productId));
    if (!item) return;

    const id = item.id || item._id;
    const name = item.name || item.title || "Product";
    const sku = item.sku || `SKU-${id}`;
    const price = parseFloat(item.price) || 0;
    const stock = parseInt(item.stock_quantity ?? item.stockQuantity ?? 0, 10);
    const categoryKey = item.category || "other";
    const img = item.image_url || item.imageUrl || item.image || "";

    const rowIdInput = document.getElementById("detail_row_id");
    if (rowIdInput) rowIdInput.value = id;

    const nameEl = document.getElementById("detail_name");
    if (nameEl) nameEl.textContent = name;

    const skuEl = document.getElementById("detail_sku");
    if (skuEl) skuEl.textContent = "SKU: " + sku;

    const priceEl = document.getElementById("detail_price");
    if (priceEl) priceEl.textContent = "₱" + price.toLocaleString();

    const stockInput = document.getElementById("detail_stock_input");
    if (stockInput) stockInput.value = stock;

    const iconEl = document.getElementById("detail_icon");
    if (iconEl) {
        iconEl.className = "fas " + getCategoryIcon(categoryKey);
    }

    if (typeof openModal === 'function') {
        openModal("product_detail_modal");
    }
}

// Save Stock from Modal
async function saveProductStock() {
    const rowIdInput = document.getElementById("detail_row_id");
    const productId = rowIdInput ? rowIdInput.value : null;
    const stockInput = document.getElementById("detail_stock_input");
    const newStock = stockInput ? parseInt(stockInput.value, 10) : NaN;

    if (!productId || isNaN(newStock) || newStock < 0) {
        alert("Please enter a valid stock quantity (0 or greater).");
        return;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) {
        alert("Admin authentication required.");
        return;
    }

    const saveBtn = document.getElementById("btn_save_stock") || document.querySelector("#product_detail_modal .btn_primary");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    }

    try {
        const apiUrl = typeof getApiUrl === 'function' ? getApiUrl(`/api/products/${productId}`) : `/api/products/${productId}`;
        const res = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                stock_quantity: newStock
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            const item = inventoryProducts.find(p => String(p.id || p._id) === String(productId));
            if (item) item.stock_quantity = newStock;

            updateInventoryStats();
            applyInventoryFilters();
            if (typeof closeModal === 'function') closeModal("product_detail_modal");
            if (typeof showToast === 'function') showToast("Stock quantity successfully updated!", true);
        } else {
            alert(data.message || "Failed to update stock");
        }
    } catch (err) {
        console.error("Save stock error:", err);
        alert("Server error when updating stock.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Update Stock';
        }
    }
}

// Handle Add Product from Modal
async function handleCreateProduct(event) {
    event.preventDefault();

    const name = (document.getElementById("inv_product_name")?.value || "").trim();
    const sku = (document.getElementById("inv_product_sku")?.value || "").trim();
    const category = document.getElementById("inv_product_category")?.value || "mountain_bikes";
    const price = parseFloat(document.getElementById("inv_product_price")?.value || 0);
    const stock = parseInt(document.getElementById("inv_product_stock")?.value || 0, 10);

    if (!name || price <= 0) {
        alert("Please provide a valid product name and price.");
        return;
    }

    const token = typeof getAdminToken === 'function' ? getAdminToken() : localStorage.getItem("taurus_admin_token");
    if (!token) {
        alert("Admin authentication required.");
        return;
    }

    const submitBtn = event.target.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
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
                name: name,
                sku: sku || undefined,
                category: category,
                price: price,
                stock_quantity: stock,
                image_url: "/frontend/Pictures/placeholder.png"
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            if (typeof closeModal === 'function') closeModal("add_inventory_product_modal");
            if (typeof showToast === 'function') showToast(`Added "${name}" to inventory!`, true);
            event.target.reset();
            await loadInventory();
        } else {
            alert(data.message || "Failed to add product");
        }
    } catch (err) {
        console.error("Create inventory product error:", err);
        alert("Server error when creating product.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Product';
        }
    }
}

// Escape HTML helper
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
