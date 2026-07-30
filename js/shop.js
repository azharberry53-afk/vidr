/* ============================================
   SHOP MODULE
   ============================================ */

const Shop = {
    currentPostProducts: [],
    cart: [],
    currentProduct: null,
    stripePublicKey: 'pk_live_YOUR_STRIPE_KEY',
    
    /* ==================
       OPEN SHOP
       ================== */
    
    open() {
        document.getElementById('shop-overlay').style.display = 'block';
        this.loadProducts();
    },
    
    openFromLive(hostId) {
        document.getElementById('shop-overlay').style.display = 'block';
        this.loadProducts(hostId);
    },
    
    /* ==================
       LOAD PRODUCTS
       ================== */
    
    async loadProducts(sellerId = null) {
        const grid = document.getElementById('shop-content');
        grid.innerHTML = `
            <div style="grid-column:1/-1;padding:16px;">
                <!-- Search Bar -->
                <div class="search-bar" style="margin-bottom:16px;">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search products..." oninput="Shop.search(this.value)">
                </div>
                <!-- Category Filters -->
                <div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:8px;margin-bottom:16px;">
                    ${['All','Fashion','Electronics','Beauty','Food','Accessories','Digital','Other'].map((cat, i) => `
                        <button onclick="Shop.filterCategory('${cat}', this)"
                                style="padding:6px 14px;border-radius:var(--radius-full);font-size:0.78rem;font-weight:600;
                                       white-space:nowrap;background:${i === 0 ? 'var(--gradient-primary)' : 'var(--bg-tertiary)'};
                                       color:${i === 0 ? 'white' : 'var(--text-primary)'};
                                       border:1px solid var(--border-light);flex-shrink:0;">
                            ${cat}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div style="grid-column:1/-1;text-align:center;padding:20px;">
                <div class="spinner"></div>
            </div>
        `;
        
        try {
            let query = db.collection(Collections.PRODUCTS)
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(24);
            
            if (sellerId) {
                query = db.collection(Collections.PRODUCTS)
                    .where('sellerId', '==', sellerId)
                    .where('isActive', '==', true);
            }
            
            const snapshot = await query.get();
            
            // Remove loading spinner
            grid.querySelector('div:last-child').remove();
            
            if (snapshot.empty) {
                grid.innerHTML += '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-tertiary);"><p style="font-size:3rem;">🛍️</p><p>No products yet</p></div>';
                return;
            }
            
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                grid.innerHTML += this.renderProductCard(product);
            });
            
            // Add verified seller button
            if (App.currentUser?.isVerified || App.isAdmin) {
                grid.innerHTML += `
                    <div style="grid-column:1/-1;padding:16px;text-align:center;">
                        <button class="btn btn-primary" onclick="Shop.addProduct()">
                            + Add Product
                        </button>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Load products error:', error);
        }
    },
    
    renderProductCard(product) {
        const discount = product.originalPrice 
            ? Math.round((1 - product.price / product.originalPrice) * 100) 
            : 0;
        
        return `
            <div class="shop-product-card" onclick="Shop.viewProduct('${product.id}')">
                <div style="position:relative;">
                    <img src="${product.images?.[0] || 'assets/icons/default-product.png'}" 
                         class="shop-product-image" loading="lazy" alt="${App.escapeHtml(product.name)}">
                    ${discount > 0 ? `
                    <div style="position:absolute;top:8px;left:8px;background:var(--danger);color:white;
                                 padding:2px 6px;border-radius:var(--radius-full);font-size:0.7rem;font-weight:700;">
                        -${discount}%
                    </div>
                    ` : ''}
                    ${product.stock === 0 ? `
                    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
                        <span style="color:white;font-weight:700;font-size:0.85rem;">Sold Out</span>
                    </div>
                    ` : ''}
                </div>
                <div class="shop-product-info">
                    <div class="shop-product-name">${App.escapeHtml(product.name)}</div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div class="shop-product-price">$${product.price?.toFixed(2)}</div>
                        ${product.originalPrice ? `<div style="color:var(--text-tertiary);font-size:0.78rem;text-decoration:line-through;">$${product.originalPrice.toFixed(2)}</div>` : ''}
                    </div>
                    <div class="shop-product-sold">${product.sold || 0} sold</div>
                </div>
            </div>
        `;
    },
    
    /* ==================
       PRODUCT LISTING (Yellow Bag)
       ================== */
    
    async showProductListing(postId) {
        const postDoc = await db.collection(Collections.POSTS).doc(postId).get();
        if (!postDoc.exists) return;
        
        const post = postDoc.data();
        const products = post.products || [];
        
        if (products.length === 0) return;
        
        const modal = document.getElementById('product-listing-modal');
        modal.style.display = 'block';
        
        const itemsEl = document.getElementById('product-listing-items');
        itemsEl.innerHTML = '<div class="spinner"></div>';
        
        let html = '';
        
        for (const productRef of products) {
            try {
                const productDoc = await db.collection(Collections.PRODUCTS).doc(productRef.id).get();
                if (!productDoc.exists) continue;
                
                const product = productDoc.data();
                
                html += `
                    <div class="product-listing-item" onclick="Shop.viewProduct('${productDoc.id}')">
                        <img src="${product.images?.[0] || ''}" class="product-listing-thumb" loading="lazy">
                        <div class="product-listing-info">
                            <div class="product-listing-name">${App.escapeHtml(product.name)}</div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div class="product-listing-price">$${product.price?.toFixed(2)}</div>
                                ${product.sold ? `<div style="font-size:0.72rem;color:var(--text-tertiary);">${product.sold} sold</div>` : ''}
                            </div>
                        </div>
                        <button class="product-buy-btn" onclick="event.stopPropagation(); Shop.quickBuy('${productDoc.id}')">
                            Buy
                        </button>
                    </div>
                `;
            } catch (e) {
                continue;
            }
        }
        
        itemsEl.innerHTML = html || '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">Products unavailable</p>';
    },
    
    closeProductListing() {
        document.getElementById('product-listing-modal').style.display = 'none';
    },
    
    /* ==================
       VIEW PRODUCT
       ================== */
    
    async viewProduct(productId) {
        App.showLoading();
        
        try {
            const productDoc = await db.collection(Collections.PRODUCTS).doc(productId).get();
            if (!productDoc.exists) {
                App.showToast('Product not found', 'error');
                App.hideLoading();
                return;
            }
            
            this.currentProduct = { id: productId, ...productDoc.data() };
            const product = this.currentProduct;
            
            // Get seller info
            const sellerDoc = await db.collection(Collections.USERS).doc(product.sellerId).get();
            const seller = sellerDoc.exists ? sellerDoc.data() : {};
            
            // Get affiliate link if any
            const affiliateCode = this.getAffiliateCode();
            
            const modal = document.createElement('div');
            modal.className = 'overlay-page';
            modal.id = 'product-detail';
            modal.innerHTML = `
                <div class="overlay-header">
                    <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2>Product</h2>
                    <button class="header-icon-btn" onclick="Shop.shareProduct('${productId}')">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
                
                <div>
                    <!-- Image Gallery -->
                    <div style="position:relative;">
                        <div style="display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;" id="product-images">
                            ${(product.images || ['assets/icons/default-product.png']).map((img, i) => `
                                <div style="min-width:100%;scroll-snap-align:start;">
                                    <img src="${img}" style="width:100%;aspect-ratio:1;object-fit:cover;" loading="lazy">
                                </div>
                            `).join('')}
                        </div>
                        ${(product.images?.length > 1) ? `
                        <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px;">
                            ${product.images.map((_, i) => `
                                <div style="width:6px;height:6px;border-radius:50%;background:${i === 0 ? 'white' : 'rgba(255,255,255,0.5)'};"></div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Product Info -->
                    <div style="padding:16px;">
                        <!-- Price & Name -->
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                            <h2 style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;flex:1;margin-right:12px;">
                                ${App.escapeHtml(product.name)}
                            </h2>
                            <div>
                                <div style="font-size:1.5rem;font-weight:800;color:var(--danger);">$${product.price?.toFixed(2)}</div>
                                ${product.originalPrice ? `<div style="font-size:0.78rem;color:var(--text-tertiary);text-decoration:line-through;text-align:right;">$${product.originalPrice.toFixed(2)}</div>` : ''}
                            </div>
                        </div>
                        
                        <!-- Stats -->
                        <div style="display:flex;gap:16px;margin-bottom:12px;">
                            <span style="font-size:0.8rem;color:var(--text-secondary);">
                                <i class="fas fa-shopping-bag"></i> ${product.sold || 0} sold
                            </span>
                            <span style="font-size:0.8rem;color:var(--text-secondary);">
                                <i class="fas fa-box"></i> ${product.stock || 0} in stock
                            </span>
                            <span style="font-size:0.8rem;color:${product.rating >= 4 ? 'var(--warning)' : 'var(--text-secondary)'};">
                                ⭐ ${product.rating?.toFixed(1) || 'N/A'}
                            </span>
                        </div>
                        
                        <!-- Category -->
                        <div style="margin-bottom:12px;">
                            <span style="padding:4px 10px;background:rgba(var(--primary-rgb),0.1);color:var(--primary);
                                          border-radius:var(--radius-full);font-size:0.78rem;font-weight:600;">
                                ${product.category || 'General'}
                            </span>
                        </div>
                        
                        <!-- Description -->
                        <div style="margin-bottom:16px;">
                            <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:6px;">Description</h3>
                            <p style="font-size:0.88rem;color:var(--text-secondary);line-height:1.6;">
                                ${App.escapeHtml(product.description || '')}
                            </p>
                        </div>
                        
                        <!-- Variants (Size/Color) -->
                        ${product.variants ? this.renderVariants(product.variants) : ''}
                        
                        <!-- Seller Info -->
                        <div style="display:flex;align-items:center;gap:12px;padding:12px;
                                     background:var(--bg-tertiary);border-radius:var(--radius-md);margin-bottom:16px;"
                             onclick="Profile.viewProfile('${product.sellerId}')">
                            <img src="${seller.photoURL || 'assets/icons/default-avatar.png'}" 
                                 style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                            <div>
                                <div style="font-weight:600;font-size:0.9rem;display:flex;align-items:center;gap:4px;">
                                    ${App.escapeHtml(seller.displayName || 'Seller')}
                                    ${seller.isVerified ? '<i class="fas fa-check-circle" style="color:var(--accent);font-size:0.8rem;"></i>' : ''}
                                </div>
                                <div style="font-size:0.75rem;color:var(--text-secondary);">Verified Seller</div>
                            </div>
                            <i class="fas fa-chevron-right" style="margin-left:auto;color:var(--text-tertiary);"></i>
                        </div>
                        
                        <!-- Affiliate Link -->
                        ${App.currentUser?.isVerified ? `
                        <div style="padding:12px;background:rgba(var(--primary-rgb),0.05);border-radius:var(--radius-md);
                                     border:1px dashed var(--primary-light);margin-bottom:16px;">
                            <p style="font-size:0.82rem;font-weight:600;margin-bottom:6px;">💰 Affiliate Program</p>
                            <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px;">
                                Share this product and earn 5% commission on every sale!
                            </p>
                            <button class="btn btn-sm btn-secondary" onclick="Shop.copyAffiliateLink('${productId}')">
                                Copy Affiliate Link
                            </button>
                        </div>
                        ` : ''}
                        
                        <!-- Action Buttons -->
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-secondary" style="flex:1;" onclick="Shop.addToCart('${productId}')">
                                <i class="fas fa-shopping-cart"></i> Add to Cart
                            </button>
                            <button class="btn btn-primary" style="flex:2;background:var(--gradient-shop);color:#78350f;font-weight:800;"
                                    onclick="Shop.buyNow('${productId}')">
                                🛍️ Buy Now
                            </button>
                        </div>
                        
                        <!-- Reviews -->
                        <div style="margin-top:20px;">
                            <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">Reviews</h3>
                            <div id="product-reviews"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.loadReviews(productId);
            
        } catch (error) {
            console.error('View product error:', error);
            App.showToast('Error loading product', 'error');
        }
        
        App.hideLoading();
    },
    
    renderVariants(variants) {
        let html = '<div style="margin-bottom:16px;">';
        
        if (variants.sizes?.length > 0) {
            html += `
                <h3 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">Size</h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                    ${variants.sizes.map(size => `
                        <button onclick="Shop.selectVariant('size','${size}',this)"
                                style="padding:6px 14px;border:2px solid var(--border-color);border-radius:var(--radius-md);
                                       font-size:0.82rem;font-weight:600;background:var(--bg-tertiary);">
                            ${size}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        
        if (variants.colors?.length > 0) {
            html += `
                <h3 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">Color</h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                    ${variants.colors.map(color => `
                        <button onclick="Shop.selectVariant('color','${color}',this)"
                                style="width:28px;height:28px;border-radius:50%;background:${color};
                                       border:3px solid transparent;transition:border-color 0.2s;">
                        </button>
                    `).join('')}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    },
    
    selectedVariants: {},
    
    selectVariant(type, value, btn) {
        this.selectedVariants[type] = value;
        
        const parent = btn.parentElement;
        parent.querySelectorAll('button').forEach(b => {
            b.style.borderColor = 'transparent';
        });
        btn.style.borderColor = 'var(--primary)';
    },
    
    /* ==================
       ADD PRODUCT (Verified)
       ================== */
    
    addProduct() {
        if (!App.currentUser?.isVerified && !App.isAdmin) {
            document.getElementById('verified-modal').style.display = 'flex';
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.id = 'add-product-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-times"></i>
                </button>
                <h2>Add Product</h2>
                <button class="btn btn-sm btn-primary" onclick="Shop.submitProduct()">Publish</button>
            </div>
            <div style="padding:16px;overflow-y:auto;height:calc(100vh - 60px);">
                <!-- Product Images -->
                <div style="margin-bottom:16px;">
                    <label style="font-weight:600;font-size:0.85rem;margin-bottom:8px;display:block;">Product Images (max 5)</label>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;" id="product-image-previews">
                        <button onclick="Shop.addProductImage()" 
                                style="width:80px;height:80px;border:2px dashed var(--border-color);border-radius:var(--radius-md);
                                       display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-tertiary);">
                            <i class="fas fa-plus"></i>
                            <span style="font-size:0.7rem;margin-top:4px;">Add</span>
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Product Name *</label>
                    <input type="text" id="product-name" class="form-input" placeholder="Product name" maxlength="100">
                </div>
                
                <div style="display:flex;gap:8px;">
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Price ($) *</label>
                        <input type="number" id="product-price" class="form-input" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Original Price ($)</label>
                        <input type="number" id="product-original-price" class="form-input" placeholder="0.00" step="0.01" min="0">
                    </div>
                </div>
                
                <div style="display:flex;gap:8px;">
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Stock *</label>
                        <input type="number" id="product-stock" class="form-input" placeholder="0" min="0">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Category</label>
                        <select id="product-category" class="form-input" style="color:var(--text-primary);">
                            ${['Fashion','Electronics','Beauty','Food','Accessories','Digital','Other'].map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Description *</label>
                    <textarea id="product-description" class="form-input" rows="4" style="resize:none;" 
                              placeholder="Describe your product..." maxlength="1000"></textarea>
                </div>
                
                <!-- Variants -->
                <div class="form-group">
                    <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Sizes (comma separated)</label>
                    <input type="text" id="product-sizes" class="form-input" placeholder="S, M, L, XL">
                </div>
                
                <div class="form-group">
                    <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Colors (hex, comma separated)</label>
                    <input type="text" id="product-colors" class="form-input" placeholder="#ff0000, #00ff00">
                </div>
                
                <!-- Shipping -->
                <div class="form-group">
                    <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Shipping Info</label>
                    <input type="text" id="product-shipping" class="form-input" placeholder="Free shipping / $5 shipping">
                </div>
                
                <!-- Admin fee notice -->
                <div style="padding:12px;background:rgba(var(--primary-rgb),0.05);border-radius:var(--radius-md);margin-bottom:16px;">
                    <p style="font-size:0.82rem;color:var(--text-secondary);">
                        💡 Platform fee: <strong>8%</strong> per sale | Affiliate commission: <strong>5%</strong>
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.productImages = [];
    },
    
    productImages: [],
    
    addProductImage() {
        if (this.productImages.length >= 5) {
            App.showToast('Max 5 images', 'warning');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const url = URL.createObjectURL(file);
            this.productImages.push({ file, url });
            
            const previews = document.getElementById('product-image-previews');
            const newImg = document.createElement('div');
            newImg.style.cssText = 'position:relative;width:80px;height:80px;';
            newImg.innerHTML = `
                <img src="${url}" style="width:80px;height:80px;border-radius:var(--radius-md);object-fit:cover;">
                <button onclick="Shop.removeProductImage(${this.productImages.length - 1}, this.parentElement)"
                        style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;background:var(--danger);
                               color:white;border-radius:50%;font-size:0.6rem;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previews.insertBefore(newImg, previews.lastChild);
        };
        input.click();
    },
    
    removeProductImage(idx, el) {
        this.productImages.splice(idx, 1);
        el.remove();
    },
    
    async submitProduct() {
        const name = document.getElementById('product-name')?.value.trim();
        const price = parseFloat(document.getElementById('product-price')?.value);
        const stock = parseInt(document.getElementById('product-stock')?.value);
        const category = document.getElementById('product-category')?.value;
        const description = document.getElementById('product-description')?.value.trim();
        const originalPrice = parseFloat(document.getElementById('product-original-price')?.value) || null;
        const sizes = document.getElementById('product-sizes')?.value.split(',').map(s => s.trim()).filter(Boolean);
        const colors = document.getElementById('product-colors')?.value.split(',').map(c => c.trim()).filter(Boolean);
        const shipping = document.getElementById('product-shipping')?.value.trim();
        
        if (!name || !price || !stock || !description) {
            App.showToast('Please fill all required fields', 'warning');
            return;
        }
        
        if (this.productImages.length === 0) {
            App.showToast('Add at least one product image', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            // Upload images
            const imageURLs = [];
            for (const img of this.productImages) {
                const compressed = await Profile.compressImage(img.file, 800, 800);
                const ref = storage.ref(`products/${App.currentUser.uid}/${Date.now()}`);
                await ref.put(compressed);
                imageURLs.push(await ref.getDownloadURL());
            }
            
            const productData = {
                sellerId: App.currentUser.uid,
                sellerName: App.currentUser.displayName,
                sellerAvatar: App.currentUser.photoURL,
                sellerVerified: App.currentUser.isVerified,
                name,
                description,
                price,
                originalPrice,
                stock,
                category,
                images: imageURLs,
                shipping: shipping || 'Standard shipping',
                variants: {
                    sizes: sizes.length > 0 ? sizes : [],
                    colors: colors.length > 0 ? colors : []
                },
                sold: 0,
                rating: 0,
                reviewCount: 0,
                isActive: true,
                platformFee: 0.08,
                affiliateFee: 0.05,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection(Collections.PRODUCTS).add(productData);
            
            App.showToast('Product published! 🎉', 'success');
            document.getElementById('add-product-page')?.remove();
            this.loadProducts();
            
        } catch (error) {
            console.error('Submit product error:', error);
            App.showToast('Error publishing product', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       CART
       ================== */
    
    addToCart(productId) {
        const existing = this.cart.find(item => item.id === productId);
        
        if (existing) {
            existing.quantity++;
        } else {
            this.cart.push({
                id: productId,
                product: this.currentProduct,
                quantity: 1,
                variants: { ...this.selectedVariants }
            });
        }
        
        const badge = document.getElementById('cart-badge');
        badge.textContent = this.cart.reduce((a, b) => a + b.quantity, 0);
        badge.style.display = 'flex';
        
        App.showToast('Added to cart! 🛒', 'success');
    },
    
    openCart() {
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Shopping Cart (${this.cart.length})</h2>
            </div>
            <div style="padding:16px;overflow-y:auto;height:calc(100vh - 140px);">
                ${this.cart.length === 0 ? `
                    <div style="text-align:center;padding:80px 20px;color:var(--text-tertiary);">
                        <p style="font-size:3rem;margin-bottom:12px;">🛒</p>
                        <p>Your cart is empty</p>
                        <button class="btn btn-primary" style="margin-top:16px;" onclick="Shop.open()">Shop Now</button>
                    </div>
                ` : `
                    ${this.cart.map((item, i) => `
                        <div style="display:flex;gap:12px;padding:12px;background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:8px;border:1px solid var(--border-light);">
                            <img src="${item.product?.images?.[0] || ''}" style="width:64px;height:64px;border-radius:var(--radius-md);object-fit:cover;">
                            <div style="flex:1;">
                                <p style="font-weight:600;font-size:0.9rem;">${App.escapeHtml(item.product?.name || '')}</p>
                                <p style="color:var(--danger);font-weight:700;">$${item.product?.price?.toFixed(2)}</p>
                                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                                    <button onclick="Shop.decreaseQty(${i})" style="width:24px;height:24px;background:var(--bg-tertiary);border-radius:50%;font-weight:700;">-</button>
                                    <span style="font-weight:600;">${item.quantity}</span>
                                    <button onclick="Shop.increaseQty(${i})" style="width:24px;height:24px;background:var(--bg-tertiary);border-radius:50%;font-weight:700;">+</button>
                                </div>
                            </div>
                            <button onclick="Shop.removeFromCart(${i})" style="color:var(--danger);padding:4px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                `}
            </div>
            ${this.cart.length > 0 ? `
            <div style="position:sticky;bottom:0;padding:16px;background:var(--bg-glass);backdrop-filter:blur(20px);border-top:1px solid var(--border-light);">
                <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                    <span style="font-weight:600;">Total:</span>
                    <span style="font-weight:800;font-size:1.1rem;color:var(--danger);">
                        $${this.cart.reduce((a, b) => a + (b.product?.price || 0) * b.quantity, 0).toFixed(2)}
                    </span>
                </div>
                <button class="btn btn-primary btn-full" style="background:var(--gradient-shop);color:#78350f;font-weight:800;"
                        onclick="Shop.checkout()">
                    🛍️ Checkout
                </button>
            </div>
            ` : ''}
        `;
        document.body.appendChild(modal);
    },
    
    increaseQty(idx) { this.cart[idx].quantity++; this.openCart(); },
    decreaseQty(idx) { 
        if (this.cart[idx].quantity > 1) { this.cart[idx].quantity--; }
        else { this.cart.splice(idx, 1); }
        this.openCart();
    },
    removeFromCart(idx) { this.cart.splice(idx, 1); this.openCart(); },
    
    /* ==================
       CHECKOUT & PAYMENT
       ================== */
    
    async buyNow(productId) {
        this.cart = [{
            id: productId,
            product: this.currentProduct,
            quantity: 1,
            variants: { ...this.selectedVariants }
        }];
        this.checkout();
    },
    
    async quickBuy(productId) {
        App.showLoading();
        const doc = await db.collection(Collections.PRODUCTS).doc(productId).get();
        if (doc.exists) {
            this.currentProduct = { id: productId, ...doc.data() };
            this.cart = [{ id: productId, product: this.currentProduct, quantity: 1, variants: {} }];
        }
        App.hideLoading();
        this.checkout();
    },
    
    checkout() {
        if (this.cart.length === 0) return;
        
        const total = this.cart.reduce((a, b) => a + (b.product?.price || 0) * b.quantity, 0);
        
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Checkout</h2>
            </div>
            <div style="padding:16px;overflow-y:auto;height:calc(100vh - 60px);">
                <!-- Order Summary -->
                <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:16px;margin-bottom:16px;border:1px solid var(--border-light);">
                    <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">Order Summary</h3>
                    ${this.cart.map(item => `
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.85rem;">
                            <span>${App.escapeHtml(item.product?.name || '')} x${item.quantity}</span>
                            <span style="font-weight:600;">$${((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div style="border-top:1px solid var(--border-light);padding-top:8px;margin-top:8px;display:flex;justify-content:space-between;">
                        <strong>Total</strong>
                        <strong style="color:var(--danger);">$${total.toFixed(2)}</strong>
                    </div>
                </div>
                
                <!-- Shipping Address -->
                <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:16px;margin-bottom:16px;border:1px solid var(--border-light);">
                    <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">📦 Shipping Address</h3>
                    <input type="text" id="checkout-name" class="form-input" placeholder="Full name" style="margin-bottom:8px;">
                    <input type="text" id="checkout-address" class="form-input" placeholder="Street address" style="margin-bottom:8px;">
                    <div style="display:flex;gap:8px;">
                        <input type="text" id="checkout-city" class="form-input" placeholder="City" style="flex:1;">
                        <input type="text" id="checkout-postal" class="form-input" placeholder="Postal code" style="flex:1;">
                    </div>
                    <input type="text" id="checkout-country" class="form-input" placeholder="Country" style="margin-top:8px;">
                    <input type="tel" id="checkout-phone" class="form-input" placeholder="Phone number" style="margin-top:8px;">
                </div>
                
                <!-- Payment Methods -->
                <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:16px;margin-bottom:24px;border:1px solid var(--border-light);">
                    <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">💳 Payment Method</h3>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${[
                            { id: 'stripe', icon: '💳', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, Amex' },
                            { id: 'paypal', icon: '🔵', label: 'PayPal', sub: 'Pay with PayPal' },
                            { id: 'paynow', icon: '🇸🇬', label: 'PayNow', sub: 'Singapore' },
                            { id: 'dana', icon: '🇮🇩', label: 'DANA', sub: 'Indonesia' },
                            { id: 'tng', icon: '🇲🇾', label: 'Touch \'n Go', sub: 'Malaysia' }
                        ].map(method => `
                            <label style="display:flex;align-items:center;gap:12px;padding:12px;
                                          background:var(--bg-tertiary);border-radius:var(--radius-md);cursor:pointer;
                                          border:2px solid transparent;" 
                                   class="payment-method-label">
                                <input type="radio" name="payment" value="${method.id}" style="width:18px;height:18px;accent-color:var(--primary);">
                                <span style="font-size:1.3rem;">${method.icon}</span>
                                <div>
                                    <div style="font-weight:600;font-size:0.9rem;">${method.label}</div>
                                    <div style="font-size:0.75rem;color:var(--text-secondary);">${method.sub}</div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Place Order Button -->
                <button class="btn btn-primary btn-full" style="background:var(--gradient-shop);color:#78350f;font-weight:800;padding:16px;font-size:1rem;"
                        onclick="Shop.placeOrder(${total.toFixed(2)})">
                    🛍️ Place Order - $${total.toFixed(2)}
                </button>
                
                <p style="text-align:center;font-size:0.75rem;color:var(--text-tertiary);margin-top:12px;">
                    Secure checkout • Your data is protected
                </p>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Payment method selection highlight
        modal.querySelectorAll('input[name="payment"]').forEach(radio => {
            radio.addEventListener('change', () => {
                modal.querySelectorAll('.payment-method-label').forEach(l => l.style.borderColor = 'transparent');
                radio.closest('.payment-method-label').style.borderColor = 'var(--primary)';
            });
        });
    },
    
    async placeOrder(total) {
        const name = document.getElementById('checkout-name')?.value.trim();
        const address = document.getElementById('checkout-address')?.value.trim();
        const city = document.getElementById('checkout-city')?.value.trim();
        const postal = document.getElementById('checkout-postal')?.value.trim();
        const country = document.getElementById('checkout-country')?.value.trim();
        const phone = document.getElementById('checkout-phone')?.value.trim();
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
        
        if (!name || !address || !city || !postal || !country || !phone) {
            App.showToast('Please fill shipping address', 'warning');
            return;
        }
        
        if (!paymentMethod) {
            App.showToast('Please select a payment method', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            // Process payment based on method
            let paymentResult = false;
            
            switch (paymentMethod) {
                case 'stripe':
                    paymentResult = await this.processStripePayment(total);
                    break;
                case 'paypal':
                    paymentResult = await this.processPayPalPayment(total);
                    break;
                case 'paynow':
                    paymentResult = await this.processPayNow(total);
                    break;
                case 'dana':
                    paymentResult = await this.processDANA(total);
                    break;
                case 'tng':
                    paymentResult = await this.processTNG(total);
                    break;
            }
            
            if (!paymentResult) {
                App.hideLoading();
                return;
            }
            
            // Create order
            const orderData = {
                buyerId: App.currentUser.uid,
                buyerName: App.currentUser.displayName,
                items: this.cart.map(item => ({
                    productId: item.id,
                    productName: item.product?.name,
                    price: item.product?.price,
                    quantity: item.quantity,
                    sellerId: item.product?.sellerId,
                    sellerName: item.product?.sellerName,
                    variants: item.variants
                })),
                shipping: { name, address, city, postal, country, phone },
                total: parseFloat(total),
                paymentMethod,
                status: 'paid',
                affiliateCode: this.getAffiliateCode(),
                platformFee: parseFloat(total) * 0.08,
                affiliateFee: this.getAffiliateCode() ? parseFloat(total) * 0.05 : 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const orderDoc = await db.collection(Collections.ORDERS).add(orderData);
            
            // Update product stock and sold count
            for (const item of this.cart) {
                await db.collection(Collections.PRODUCTS).doc(item.id).update({
                    stock: firebase.firestore.FieldValue.increment(-item.quantity),
                    sold: firebase.firestore.FieldValue.increment(item.quantity)
                });
                
                // Pay seller (minus platform fee)
                const sellerEarning = item.product?.price * item.quantity * 0.87; // 8% platform + 5% affiliate
                await db.collection(Collections.USERS).doc(item.product?.sellerId).update({
                    goldCoins: firebase.firestore.FieldValue.increment(sellerEarning * 100)
                });
                
                // Pay affiliate if exists
                if (this.getAffiliateCode()) {
                    const affiliateEarning = item.product?.price * item.quantity * 0.05;
                    await db.collection(Collections.USERS).doc(this.getAffiliateCode()).update({
                        goldCoins: firebase.firestore.FieldValue.increment(affiliateEarning * 100)
                    });
                }
                
                // Notify seller
                Notifications.send(item.product?.sellerId, 'sale', {
                    fromUser: App.currentUser.displayName,
                    productName: item.product?.name,
                    amount: item.product?.price * item.quantity,
                    orderId: orderDoc.id
                });
            }
            
            // Record transaction
            await db.collection(Collections.TRANSACTIONS).add({
                type: 'purchase',
                buyerId: App.currentUser.uid,
                orderId: orderDoc.id,
                amount: parseFloat(total),
                paymentMethod,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // XP
            App.addXP(15, 'purchase');
            App.grantAchievement('shopper', 1);
            
            // Clear cart
            this.cart = [];
            const badge = document.getElementById('cart-badge');
            if (badge) badge.style.display = 'none';
            
            // Show success
            App.hideLoading();
            document.querySelector('.overlay-page:last-child')?.remove();
            
            this.showOrderSuccess(orderDoc.id);
            
        } catch (error) {
            console.error('Order error:', error);
            App.showToast('Error placing order', 'error');
            App.hideLoading();
        }
    },
    
    showOrderSuccess(orderId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:380px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:32px;text-align:center;box-shadow:var(--shadow-xl);">
                <div style="font-size:4rem;margin-bottom:16px;animation:bounceIn 0.6s ease;">🎉</div>
                <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:8px;">Order Placed!</h2>
                <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:8px;">
                    Your order #${orderId.substring(0, 8).toUpperCase()} has been confirmed
                </p>
                <p style="color:var(--text-tertiary);font-size:0.82rem;margin-bottom:24px;">
                    The seller will be notified. Track your order in profile.
                </p>
                <button class="btn btn-primary btn-full" onclick="this.closest('.modal-overlay').remove()">
                    Continue Shopping
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    /* ==================
       PAYMENT PROCESSORS
       ================== */
    
    async processStripePayment(amount) {
        try {
            // Create payment intent via your backend/cloud function
            // For now show Stripe card form
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div style="width:100%;max-width:380px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:24px;box-shadow:var(--shadow-xl);">
                    <div class="modal-header" style="padding:0 0 16px;">
                        <h2>💳 Card Payment</h2>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="form-group">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Card Number</label>
                        <input type="text" class="form-input" placeholder="4242 4242 4242 4242" maxlength="19"
                               oninput="this.value=this.value.replace(/\s/g,'').replace(/(.{4})/g,'$1 ').trim()">
                    </div>
                    <div style="display:flex;gap:8px;">
                        <div class="form-group" style="flex:1;">
                            <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Expiry</label>
                            <input type="text" class="form-input" placeholder="MM/YY" maxlength="5">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">CVV</label>
                            <input type="text" class="form-input" placeholder="123" maxlength="3">
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button class="btn btn-primary" style="flex:1;" onclick="Shop.confirmStripePayment(this, ${amount})">
                            Pay $${amount}
                        </button>
                    </div>
                    <p style="text-align:center;font-size:0.72rem;color:var(--text-tertiary);margin-top:12px;">
                        🔒 Secured by Stripe
                    </p>
                </div>
            `;
            document.body.appendChild(modal);
            
            return new Promise(resolve => {
                modal.dataset.resolve = 'true';
                window._stripeResolve = resolve;
            });
        } catch (error) {
            App.showToast('Payment failed', 'error');
            return false;
        }
    },
    
    async confirmStripePayment(btn, amount) {
        btn.disabled = true;
        btn.textContent = 'Processing...';
        
        await new Promise(r => setTimeout(r, 2000));
        
        document.querySelector('.modal-overlay:last-child')?.remove();
        
        if (window._stripeResolve) {
            window._stripeResolve(true);
            window._stripeResolve = null;
        }
    },
    
    async processPayPalPayment(amount) {
        App.showToast('Redirecting to PayPal...', 'info');
        // Integrate PayPal JS SDK here
        // window.open(`https://www.paypal.com/checkout?amount=${amount}`, '_blank');
        await new Promise(r => setTimeout(r, 1500));
        return true;
    },
    
    async processPayNow(amount) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:24px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="margin-bottom:8px;">🇸🇬 PayNow</h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;">Scan QR to pay $${amount}</p>
                <div style="width:200px;height:200px;background:var(--bg-tertiary);border-radius:var(--radius-md);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:3rem;">
                    📱
                </div>
                <p style="font-size:0.78rem;color:var(--text-tertiary);margin-bottom:16px;">
                    Scan with your banking app or PayNow-enabled app
                </p>
                <button class="btn btn-primary btn-full" onclick="Shop.confirmAltPayment(this)">I've Paid</button>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        return new Promise(resolve => {
            window._altPayResolve = resolve;
        });
    },
    
    async processDANA(amount) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:24px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="margin-bottom:8px;">🇮🇩 DANA</h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;">Pay Rp ${(amount * 15000).toLocaleString()}</p>
                <div style="width:200px;height:200px;background:#108EE9;border-radius:var(--radius-md);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                    <span style="color:white;font-size:2rem;font-weight:800;">DANA</span>
                </div>
                <button class="btn btn-primary btn-full" onclick="Shop.confirmAltPayment(this)">I've Paid</button>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        return new Promise(resolve => {
            window._altPayResolve = resolve;
        });
    },
    
    async processTNG(amount) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:24px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="margin-bottom:8px;">🇲🇾 Touch 'n Go</h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;">Pay RM ${(amount * 4.7).toFixed(2)}</p>
                <div style="width:200px;height:200px;background:#00AEEF;border-radius:var(--radius-md);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                    <span style="color:white;font-size:1.5rem;font-weight:800;">TNG eWallet</span>
                </div>
                <button class="btn btn-primary btn-full" onclick="Shop.confirmAltPayment(this)">I've Paid</button>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        return new Promise(resolve => {
            window._altPayResolve = resolve;
        });
    },
    
    confirmAltPayment(btn) {
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        setTimeout(() => {
            document.querySelector('.modal-overlay:last-child')?.remove();
            if (window._altPayResolve) {
                window._altPayResolve(true);
                window._altPayResolve = null;
            }
        }, 2000);
    },
    
    /* ==================
       AFFILIATE SYSTEM
       ================== */
    
    getAffiliateCode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('ref') || localStorage.getItem('vidr_affiliate') || null;
    },
    
    async copyAffiliateLink(productId) {
        const link = `https://vidr.click/product/${productId}?ref=${App.currentUser.uid}`;
        
        try {
            await navigator.clipboard.writeText(link);
            App.showToast('Affiliate link copied! 💰', 'success');
        } catch {
            App.showToast('Copy failed', 'error');
        }
    },
    
    /* ==================
       SEARCH & FILTER
       ================== */
    
    searchTimeout: null,
    
    search(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadFilteredProducts({ search: query });
        }, 400);
    },
    
    filterCategory(category, btn) {
        document.querySelectorAll('#shop-content button').forEach(b => {
            if (b.textContent.trim() === category || b.textContent.trim() !== category) {
                b.style.background = 'var(--bg-tertiary)';
                b.style.color = 'var(--text-primary)';
            }
        });
        btn.style.background = 'var(--gradient-primary)';
        btn.style.color = 'white';
        
        this.loadFilteredProducts({ category: category === 'All' ? null : category });
    },
    
    async loadFilteredProducts({ search, category } = {}) {
        const grid = document.getElementById('shop-content');
        const existingCards = grid.querySelectorAll('.shop-product-card');
        existingCards.forEach(c => c.remove());
        
        try {
            let query = db.collection(Collections.PRODUCTS).where('isActive', '==', true);
            
            if (category) query = query.where('category', '==', category);
            
            const snapshot = await query.limit(24).get();
            
            let added = 0;
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return;
                grid.innerHTML += this.renderProductCard(product);
                added++;
            });
            
            if (added === 0) {
                grid.innerHTML += '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-tertiary);">No products found</div>';
            }
        } catch (error) {
            console.error('Filter error:', error);
        }
    },
    
    /* ==================
       REVIEWS
       ================== */
    
    async loadReviews(productId) {
        const reviewsEl = document.getElementById('product-reviews');
        if (!reviewsEl) return;
        
        const snapshot = await db.collection(Collections.PRODUCTS)
            .doc(productId)
            .collection('reviews')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (snapshot.empty) {
            reviewsEl.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.85rem;padding:20px 0;text-align:center;">No reviews yet</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const review = doc.data();
            html += `
                <div style="padding:12px 0;border-bottom:1px solid var(--border-light);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <img src="${review.userAvatar || 'assets/icons/default-avatar.png'}" 
                             style="width:28px;height:28px;border-radius:50%;object-fit:cover;">
                        <span style="font-weight:600;font-size:0.85rem;">${App.escapeHtml(review.userName)}</span>
                        <span style="color:var(--warning);">${'⭐'.repeat(review.rating)}</span>
                        <span style="color:var(--text-tertiary);font-size:0.72rem;margin-left:auto;">${App.timeAgo(review.createdAt)}</span>
                    </div>
                    <p style="font-size:0.85rem;color:var(--text-secondary);">${App.escapeHtml(review.comment)}</p>
                </div>
            `;
        });
        
        reviewsEl.innerHTML = html;
    },
    
    async shareProduct(productId) {
        const link = `https://vidr.click/product/${productId}`;
        if (navigator.share) {
            navigator.share({ title: 'Check this out on Vidr!', url: link });
        } else {
            navigator.clipboard.writeText(link);
            App.showToast('Link copied!', 'success');
        }
    }
};