/* ============================================
   COINS & WALLET MODULE
   ============================================ */

const Wallet = {
    
    coinPackages: [
        { id: 'starter', coins: 100, price: 0.99, bonus: 0, popular: false, label: 'Starter' },
        { id: 'basic', coins: 500, price: 3.99, bonus: 50, popular: false, label: 'Basic' },
        { id: 'popular', coins: 1200, price: 7.99, bonus: 200, popular: true, label: 'Popular' },
        { id: 'pro', coins: 2500, price: 14.99, bonus: 500, popular: false, label: 'Pro' },
        { id: 'elite', coins: 5500, price: 29.99, bonus: 1500, popular: false, label: 'Elite' },
        { id: 'premium', coins: 12000, price: 59.99, bonus: 4000, popular: false, label: 'Premium' },
        { id: 'ultimate', coins: 30000, price: 129.99, bonus: 12000, popular: false, label: 'Ultimate' }
    ],
    
    /* ==================
       OPEN WALLET
       ================== */
    
    open() {
        const overlay = document.getElementById('wallet-overlay');
        overlay.style.display = 'block';
        this.updateBalance();
        this.showCoinPackages();
    },
    
    updateBalance() {
        const freeEl = document.getElementById('free-coins-balance');
        const goldEl = document.getElementById('gold-coins-balance');
        
        if (freeEl) freeEl.textContent = App.formatNumber(App.currentUser?.freeCoins || 0);
        if (goldEl) goldEl.textContent = App.formatNumber(App.currentUser?.goldCoins || 0);
    },
    
    /* ==================
       COIN PACKAGES
       ================== */
    
    showCoinPackages() {
        const container = document.getElementById('coin-packages');
        if (!container) return;
        
        container.innerHTML = `
            <h3 style="font-size:1rem;font-weight:700;margin-bottom:12px;padding:0 4px;">🪙 Buy Gold Coins</h3>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                ${this.coinPackages.map(pkg => `
                    <div class="coin-package-card ${pkg.popular ? 'popular-package' : ''}"
                         onclick="Wallet.purchaseCoins('${pkg.id}')">
                        ${pkg.popular ? '<div class="popular-badge">🔥 Best Value</div>' : ''}
                        <div class="package-coins">
                            <span class="coin-icon">🪙</span>
                            <span class="coin-amount">${App.formatNumber(pkg.coins + pkg.bonus)}</span>
                        </div>
                        ${pkg.bonus > 0 ? `
                        <div class="package-bonus">+${pkg.bonus} bonus</div>
                        ` : ''}
                        <div class="package-price">$${pkg.price.toFixed(2)}</div>
                        <div class="package-label">${pkg.label}</div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Verified Subscription -->
            <div style="margin-top:20px;padding:16px;background:var(--gradient-primary);border-radius:var(--radius-lg);cursor:pointer;"
                 onclick="Wallet.purchaseVerified()">
                <div style="display:flex;align-items:center;justify-content:space-between;color:white;">
                    <div>
                        <p style="font-weight:800;font-size:1rem;">✨ Get Verified</p>
                        <p style="font-size:0.78rem;opacity:0.9;">Glow effects + Shop + Boosts</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="font-weight:800;font-size:1.2rem;">$18</p>
                        <p style="font-size:0.72rem;opacity:0.8;">/month</p>
                    </div>
                </div>
            </div>
            
            <!-- How to earn free coins -->
            <div style="margin-top:16px;padding:14px;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-light);">
                <h4 style="font-size:0.88rem;font-weight:700;margin-bottom:10px;">⚡ Earn Free Coins</h4>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${[
                        { action: 'Daily Login', coins: '1-200', icon: '📅' },
                        { action: 'Spin Wheel (Watch 3 Ads)', coins: '1-200', icon: '🎰' },
                        { action: 'Mini Games', coins: 'Varies', icon: '🎮' },
                        { action: 'Post Content', coins: '5-10', icon: '📸' },
                        { action: 'Get Likes', coins: '0.3', icon: '❤️' },
                        { action: 'Get Comments', coins: '0.5', icon: '💬' },
                        { action: 'Refer Friends', coins: '50', icon: '👥' }
                    ].map(item => `
                        <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.8rem;">
                            <span>${item.icon} ${item.action}</span>
                            <span style="color:var(--primary);font-weight:600;">+⚡${item.coins}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Add coin package styles
        this.addPackageStyles();
    },
    
    addPackageStyles() {
        if (document.getElementById('wallet-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'wallet-styles';
        style.textContent = `
            .coin-package-card {
                position: relative;
                padding: 16px 12px;
                background: var(--bg-card);
                border-radius: var(--radius-lg);
                border: 2px solid var(--border-light);
                text-align: center;
                cursor: pointer;
                transition: all var(--transition-fast);
                overflow: hidden;
            }
            .coin-package-card:active {
                transform: scale(0.96);
            }
            .popular-package {
                border-color: var(--primary);
                background: rgba(var(--primary-rgb), 0.05);
            }
            .popular-badge {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                background: var(--gradient-primary);
                color: white;
                font-size: 0.65rem;
                font-weight: 700;
                padding: 3px;
                text-align: center;
            }
            .package-coins {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                margin-top: 8px;
                margin-bottom: 4px;
            }
            .coin-icon { font-size: 1.3rem; }
            .coin-amount {
                font-family: var(--font-display);
                font-size: 1.3rem;
                font-weight: 800;
                color: var(--text-primary);
            }
            .package-bonus {
                font-size: 0.7rem;
                color: var(--success);
                font-weight: 700;
                margin-bottom: 4px;
            }
            .package-price {
                font-size: 1rem;
                font-weight: 800;
                color: var(--primary);
                margin-bottom: 2px;
            }
            .package-label {
                font-size: 0.7rem;
                color: var(--text-tertiary);
            }
        `;
        document.head.appendChild(style);
    },
    
    /* ==================
       PURCHASE COINS
       ================== */
    
    async purchaseCoins(packageId) {
        const pkg = this.coinPackages.find(p => p.id === packageId);
        if (!pkg) return;
        
        // Show interstitial before payment
        Ads.showInterstitial(async () => {
            await this.processCoinsPayment(pkg);
        });
    },
    
    async processCoinsPayment(pkg) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:380px;background:var(--bg-secondary);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>Buy ${App.formatNumber(pkg.coins + pkg.bonus)} 🪙</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:0 20px 20px;">
                    <!-- Package Preview -->
                    <div style="text-align:center;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius-lg);margin-bottom:20px;">
                        <div style="font-size:3rem;margin-bottom:8px;">🪙</div>
                        <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800;">${App.formatNumber(pkg.coins + pkg.bonus)}</h2>
                        <p style="color:var(--text-secondary);font-size:0.85rem;">Gold Coins</p>
                        ${pkg.bonus > 0 ? `<p style="color:var(--success);font-size:0.82rem;font-weight:600;margin-top:4px;">Includes +${pkg.bonus} bonus coins!</p>` : ''}
                    </div>
                    
                    <!-- Payment Methods -->
                    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
                        ${[
                            { id: 'stripe', icon: '💳', label: 'Card', sub: 'Visa / Mastercard' },
                            { id: 'paypal', icon: '🔵', label: 'PayPal', sub: '' },
                            { id: 'paynow', icon: '🇸🇬', label: 'PayNow', sub: 'SG' },
                            { id: 'dana', icon: '🇮🇩', label: 'DANA', sub: 'ID' },
                            { id: 'tng', icon: '🇲🇾', label: "TNG", sub: 'MY' }
                        ].map(m => `
                            <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                                          background:var(--bg-tertiary);border-radius:var(--radius-md);cursor:pointer;
                                          border:2px solid transparent;" class="pay-method-opt">
                                <input type="radio" name="coin-payment" value="${m.id}" style="width:16px;height:16px;accent-color:var(--primary);">
                                <span>${m.icon}</span>
                                <div>
                                    <span style="font-weight:600;font-size:0.88rem;">${m.label}</span>
                                    ${m.sub ? `<span style="color:var(--text-tertiary);font-size:0.75rem;margin-left:4px;">${m.sub}</span>` : ''}
                                </div>
                            </label>
                        `).join('')}
                    </div>
                    
                    <button class="btn btn-primary btn-full" style="padding:14px;font-size:1rem;font-weight:800;"
                            onclick="Wallet.confirmCoinPurchase('${pkg.id}', this)">
                        Pay $${pkg.price.toFixed(2)}
                    </button>
                    <p style="text-align:center;font-size:0.72rem;color:var(--text-tertiary);margin-top:8px;">
                        🔒 Secure payment
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelectorAll('input[name="coin-payment"]').forEach(radio => {
            radio.addEventListener('change', () => {
                modal.querySelectorAll('.pay-method-opt').forEach(l => l.style.borderColor = 'transparent');
                radio.closest('.pay-method-opt').style.borderColor = 'var(--primary)';
            });
        });
    },
    
    async confirmCoinPurchase(packageId, btn) {
        const pkg = this.coinPackages.find(p => p.id === packageId);
        if (!pkg) return;
        
        const paymentMethod = document.querySelector('input[name="coin-payment"]:checked')?.value;
        if (!paymentMethod) {
            App.showToast('Select a payment method', 'warning');
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Processing...';
        
        // Process payment (using Shop's payment methods)
        let success = false;
        switch (paymentMethod) {
            case 'stripe': success = await Shop.processStripePayment(pkg.price); break;
            case 'paypal': success = await Shop.processPayPalPayment(pkg.price); break;
            case 'paynow': success = await Shop.processPayNow(pkg.price); break;
            case 'dana': success = await Shop.processDANA(pkg.price); break;
            case 'tng': success = await Shop.processTNG(pkg.price); break;
        }
        
        if (!success) {
Sound.play('purchase');
Sound.haptic('success');
            btn.disabled = false;
            btn.textContent = `Pay $${pkg.price.toFixed(2)}`;
            return;
        }
        
        // Close modal
        btn.closest('.modal-overlay')?.remove();
        
        App.showLoading();
        
        try {
            // Add coins to user
            const totalCoins = pkg.coins + pkg.bonus;
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                goldCoins: firebase.firestore.FieldValue.increment(totalCoins)
            });
            
            App.currentUser.goldCoins = (App.currentUser.goldCoins || 0) + totalCoins;
            
            // Record transaction
            await db.collection(Collections.TRANSACTIONS).add({
                type: 'coin_purchase',
                userId: App.currentUser.uid,
                packageId: pkg.id,
                coins: totalCoins,
                price: pkg.price,
                paymentMethod,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update UI
            this.updateBalance();
            App.updateCoinDisplay();
            
            // Show success
            App.hideLoading();
            
            const success_modal = document.createElement('div');
            success_modal.className = 'modal-overlay';
            success_modal.innerHTML = `
                <div style="width:100%;max-width:320px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:32px;text-align:center;box-shadow:var(--shadow-xl);">
                    <div style="font-size:4rem;margin-bottom:12px;animation:bounceIn 0.5s ease;">🎉</div>
                    <h2 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:8px;">Purchase Successful!</h2>
                    <p style="color:var(--text-secondary);margin-bottom:4px;">You received</p>
                    <p style="font-size:2rem;font-weight:800;color:var(--primary);">🪙 ${App.formatNumber(totalCoins)}</p>
                    ${pkg.bonus > 0 ? `<p style="color:var(--success);font-size:0.82rem;margin-top:4px;">(+${pkg.bonus} bonus!)</p>` : ''}
                    <button class="btn btn-primary btn-full" style="margin-top:20px;" onclick="this.closest('.modal-overlay').remove()">
                        Awesome! 🎊
                    </button>
                </div>
            `;
            document.body.appendChild(success_modal);
            
            // Confetti
            this.showConfetti();
            
            App.grantAchievement('earner', totalCoins);
            
        } catch (error) {
            console.error('Coin purchase error:', error);
            App.showToast('Error processing purchase', 'error');
            App.hideLoading();
        }
    },
    
    showConfetti() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    top: -20px;
                    left: ${Math.random() * 100}vw;
                    font-size: ${Math.random() * 1 + 0.8}rem;
                    z-index: 9999;
                    pointer-events: none;
                    animation: confetti ${Math.random() * 2 + 2}s ease-in forwards;
                `;
                confetti.textContent = ['🪙', '⭐', '✨', '🎊', '💜', '🎉'][Math.floor(Math.random() * 6)];
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 4000);
            }, i * 60);
        }
    },
    
    /* ==================
       PURCHASE VERIFIED
       ================== */
    
    async purchaseVerified() {
        document.getElementById('verified-modal').style.display = 'flex';
        
        // Override verify button
        const verifyBtn = document.querySelector('#verified-modal .btn-primary');
        if (verifyBtn) {
            verifyBtn.onclick = () => this.processVerifiedPurchase();
        }
    },
    
    async processVerifiedPurchase() {
        const modal = document.getElementById('verified-modal');
        
        // Show payment selection
        const payModal = document.createElement('div');
        payModal.className = 'modal-overlay';
        payModal.style.zIndex = '400';
        payModal.innerHTML = `
            <div style="width:100%;max-width:380px;background:var(--bg-secondary);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>✨ Get Verified - $18/mo</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:0 20px 20px;">
                    <div style="padding:12px;background:rgba(var(--primary-rgb),0.08);border-radius:var(--radius-md);margin-bottom:16px;">
                        <p style="font-size:0.82rem;color:var(--text-secondary);">
                            Your verified badge will be active for <strong>30 days</strong>. Auto-renewal available.
                        </p>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
                        ${[
                            { id: 'stripe', icon: '💳', label: 'Credit / Debit Card' },
                            { id: 'paypal', icon: '🔵', label: 'PayPal' },
                            { id: 'paynow', icon: '🇸🇬', label: 'PayNow (SG)' },
                            { id: 'dana', icon: '🇮🇩', label: 'DANA (ID)' },
                            { id: 'tng', icon: '🇲🇾', label: "Touch 'n Go (MY)" }
                        ].map(m => `
                            <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                                          background:var(--bg-tertiary);border-radius:var(--radius-md);cursor:pointer;
                                          border:2px solid transparent;" class="pay-method-opt">
                                <input type="radio" name="verified-payment" value="${m.id}" style="width:16px;height:16px;accent-color:var(--primary);">
                                <span>${m.icon}</span>
                                <span style="font-weight:600;font-size:0.88rem;">${m.label}</span>
                            </label>
                        `).join('')}
                    </div>
                    <button class="btn btn-primary btn-full glow-btn" style="padding:14px;font-weight:800;"
                            onclick="Wallet.confirmVerified(this)">
                        ✨ Subscribe - $18/month
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(payModal);
        
        payModal.querySelectorAll('input[name="verified-payment"]').forEach(radio => {
            radio.addEventListener('change', () => {
                payModal.querySelectorAll('.pay-method-opt').forEach(l => l.style.borderColor = 'transparent');
                radio.closest('.pay-method-opt').style.borderColor = 'var(--primary)';
            });
        });
    },
    
    async confirmVerified(btn) {
        const paymentMethod = document.querySelector('input[name="verified-payment"]:checked')?.value;
        if (!paymentMethod) {
            App.showToast('Select payment method', 'warning');
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Processing...';
        
        let success = false;
        switch (paymentMethod) {
            case 'stripe': success = await Shop.processStripePayment(18); break;
            case 'paypal': success = await Shop.processPayPalPayment(18); break;
            case 'paynow': success = await Shop.processPayNow(18); break;
            case 'dana': success = await Shop.processDANA(18); break;
            case 'tng': success = await Shop.processTNG(18); break;
        }
        
        if (!success) {
            btn.disabled = false;
            btn.textContent = '✨ Subscribe - $18/month';
            return;
        }
        
        btn.closest('.modal-overlay')?.remove();
        document.getElementById('verified-modal').style.display = 'none';
        
        App.showLoading();
        
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                isVerified: true,
                verifiedExpiry: expiryDate,
                animatedAvatar: true,
                animatedCover: true,
                animatedUsername: true,
                freeBoostsRemaining: 5
            });
            
            App.currentUser.isVerified = true;
            App.currentUser.animatedAvatar = true;
            App.currentUser.animatedCover = true;
            App.currentUser.animatedUsername = true;
            App.currentUser.freeBoostsRemaining = 5;
            
            // Transaction record
            await db.collection(Collections.TRANSACTIONS).add({
                type: 'verified_subscription',
                userId: App.currentUser.uid,
                amount: 18,
                paymentMethod,
                expiresAt: expiryDate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            App.hideLoading();
            
            const successModal = document.createElement('div');
            successModal.className = 'modal-overlay';
            successModal.innerHTML = `
                <div style="width:100%;max-width:320px;background:var(--gradient-primary);border-radius:var(--radius-xl);padding:32px;text-align:center;box-shadow:var(--shadow-xl);">
                    <div style="font-size:4rem;margin-bottom:12px;animation:bounceIn 0.5s ease;">✨</div>
                    <h2 style="font-family:var(--font-display);color:white;font-size:1.4rem;margin-bottom:8px;">You're Verified!</h2>
                    <p style="color:rgba(255,255,255,0.9);font-size:0.88rem;margin-bottom:20px;">
                        Enjoy all premium features for 30 days!
                    </p>
                    <button class="btn btn-full" style="background:white;color:var(--primary);font-weight:800;"
                            onclick="this.closest('.modal-overlay').remove(); Profile.loadMyProfile()">
                        View My Profile 🎉
                    </button>
                </div>
            `;
            document.body.appendChild(successModal);
            this.showConfetti();
            
        } catch (error) {
            console.error('Verified purchase error:', error);
            App.showToast('Error processing subscription', 'error');
            App.hideLoading();
        }
    },
    
    /* ==================
       WITHDRAW
       ================== */
    
    withdraw() {
        const goldCoins = App.currentUser?.goldCoins || 0;
        const minWithdraw = 1000; // 1000 gold coins = $10
        const usdValue = (goldCoins / 100).toFixed(2);
        
        if (goldCoins < minWithdraw) {
            App.showToast(`Minimum withdraw: ${minWithdraw} 🪙 (= $${(minWithdraw/100).toFixed(2)})`, 'warning');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:380px;background:var(--bg-secondary);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>💸 Withdraw Earnings</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:0 20px 20px;">
                    <div style="text-align:center;padding:20px;background:var(--bg-tertiary);border-radius:var(--radius-lg);margin-bottom:16px;">
                        <p style="font-size:0.85rem;color:var(--text-secondary);">Available Balance</p>
                        <p style="font-size:2rem;font-weight:800;color:var(--primary);">🪙 ${App.formatNumber(goldCoins)}</p>
                        <p style="font-size:1rem;font-weight:600;color:var(--success);">≈ $${usdValue} USD</p>
                    </div>
                    
                    <div class="form-group">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">
                            Amount (🪙 Gold Coins)
                        </label>
                        <input type="number" id="withdraw-amount" class="form-input"
                               placeholder="Min: ${minWithdraw}" min="${minWithdraw}" max="${goldCoins}"
                               value="${goldCoins}" oninput="Wallet.updateWithdrawUSD(this.value)">
                        <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">
                            ≈ $<span id="withdraw-usd">${usdValue}</span> USD (after 10% platform fee)
                        </p>
                    </div>
                    
                    <div class="form-group">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">
                            Withdraw Method
                        </label>
                        <select id="withdraw-method" class="form-input" style="color:var(--text-primary);">
                            <option value="paypal">💙 PayPal</option>
                            <option value="bank">🏦 Bank Transfer</option>
                            <option value="paynow">🇸🇬 PayNow (SG)</option>
                            <option value="dana">🇮🇩 DANA (ID)</option>
                            <option value="tng">🇲🇾 Touch 'n Go (MY)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <input type="text" id="withdraw-account" class="form-input"
                               placeholder="PayPal email / Account number">
                    </div>
                    
                    <div style="padding:10px;background:rgba(251,191,36,0.1);border-radius:var(--radius-md);margin-bottom:16px;border:1px solid rgba(251,191,36,0.3);">
                        <p style="font-size:0.78rem;color:var(--text-secondary);">
                            ⚠️ 10% platform fee applies. Processing: 3-5 business days.
                            Minimum withdrawal: ${minWithdraw} 🪙 (= $${(minWithdraw/100).toFixed(2)})
                        </p>
                    </div>
                    
                    <button class="btn btn-primary btn-full" onclick="Wallet.processWithdraw()">
                        Request Withdrawal
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    updateWithdrawUSD(coins) {
        const usd = ((coins / 100) * 0.9).toFixed(2);
        const el = document.getElementById('withdraw-usd');
        if (el) el.textContent = usd;
    },
    
    async processWithdraw() {
        const amount = parseInt(document.getElementById('withdraw-amount')?.value);
        const method = document.getElementById('withdraw-method')?.value;
        const account = document.getElementById('withdraw-account')?.value.trim();
        
        if (!amount || amount < 1000) {
            App.showToast('Minimum withdraw: 1000 🪙', 'warning');
            return;
        }
        
        if ((App.currentUser?.goldCoins || 0) < amount) {
            App.showToast('Insufficient balance', 'warning');
            return;
        }
        
        if (!account) {
            App.showToast('Enter account details', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            const usdAmount = (amount / 100) * 0.9;
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                goldCoins: firebase.firestore.FieldValue.increment(-amount)
            });
            
            await db.collection(Collections.TRANSACTIONS).add({
                type: 'withdrawal',
                userId: App.currentUser.uid,
                coinsAmount: amount,
                usdAmount: usdAmount,
                method: method,
                account: account,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            App.currentUser.goldCoins -= amount;
            this.updateBalance();
            App.updateCoinDisplay();
            
            document.querySelector('.modal-overlay:last-child')?.remove();
            App.hideLoading();
            
            App.showToast(`Withdrawal requested! $${usdAmount.toFixed(2)} processing in 3-5 days`, 'success');
            
        } catch (error) {
            App.hideLoading();
            App.showToast('Error processing withdrawal', 'error');
        }
    },
    
    /* ==================
       TRANSACTION HISTORY
       ================== */
    
    async history() {
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Transaction History</h2>
            </div>
            <div id="transaction-list" style="padding:12px;">
                <div class="spinner" style="margin:40px auto;display:block;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        try {
            const snapshot = await db.collection(Collections.TRANSACTIONS)
                .where('userId', '==', App.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            const list = modal.querySelector('#transaction-list');
            
            if (snapshot.empty) {
                list.innerHTML = '<p style="text-align:center;padding:60px;color:var(--text-tertiary);">No transactions yet</p>';
                return;
            }
            
            const typeConfig = {
                coin_purchase: { icon: '🪙', label: 'Coin Purchase', color: 'var(--success)' },
                verified_subscription: { icon: '✨', label: 'Verified Badge', color: 'var(--primary)' },
                withdrawal: { icon: '💸', label: 'Withdrawal', color: 'var(--danger)' },
                purchase: { icon: '🛍️', label: 'Shop Purchase', color: 'var(--warning)' },
                gift: { icon: '🎁', label: 'Gift Sent', color: 'var(--secondary)' },
                xp_boost: { icon: '⚡', label: 'XP Boost', color: 'var(--accent)' }
            };
            
            let html = '';
            snapshot.forEach(doc => {
                const tx = doc.data();
                const config = typeConfig[tx.type] || { icon: '💰', label: tx.type, color: 'var(--text-secondary)' };
                
                html += `
                    <div style="display:flex;align-items:center;gap:12px;padding:14px;
                                 background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:8px;
                                 border:1px solid var(--border-light);">
                        <div style="width:44px;height:44px;border-radius:var(--radius-full);
                                     background:rgba(var(--primary-rgb),0.1);display:flex;align-items:center;justify-content:center;
                                     font-size:1.3rem;flex-shrink:0;">
                            ${config.icon}
                        </div>
                        <div style="flex:1;">
                            <p style="font-weight:600;font-size:0.9rem;">${config.label}</p>
                            <p style="color:var(--text-tertiary);font-size:0.75rem;">${App.timeAgo(tx.createdAt)}</p>
                            ${tx.status === 'pending' ? `<span style="font-size:0.7rem;color:var(--warning);font-weight:600;">● Pending</span>` : ''}
                        </div>
                        <div style="text-align:right;">
                            ${tx.coins ? `<p style="font-weight:700;color:${config.color};">${tx.type === 'withdrawal' || tx.type === 'gift' ? '-' : '+'}🪙 ${App.formatNumber(tx.coins || tx.coinsAmount || 0)}</p>` : ''}
                            ${tx.price || tx.amount || tx.usdAmount ? `<p style="font-size:0.82rem;color:var(--text-secondary);">$${(tx.price || tx.amount || tx.usdAmount || 0).toFixed(2)}</p>` : ''}
                        </div>
                    </div>
                `;
            });
            
            list.innerHTML = html;
            
        } catch (error) {
            console.error('History error:', error);
        }
    },
    
    buyCoins() {
        this.showCoinPackages();
    }
};

/* ============================================
   REWARDS MODULE - Daily & Spin Wheel
   ============================================ */

const Rewards = {
    spinAdsWatched: 0,
    requiredAds: 3,
    isSpinning: false,
    
    /* ==================
       DAILY REWARD
       ================== */
    
    async claimDaily() {
        const rewardBox = document.getElementById('reward-box');
        const rewardResult = document.getElementById('reward-result');
        
        if (rewardBox) rewardBox.style.display = 'none';
        
        // Animate
        await new Promise(r => setTimeout(r, 500));
        
        // Calculate reward (hard to get high amounts)
        const reward = this.calculateDailyReward();
        
        try {
            // Update last reward date
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                lastDailyReward: firebase.firestore.FieldValue.serverTimestamp(),
                freeCoins: firebase.firestore.FieldValue.increment(reward.amount)
            });
            
            App.currentUser.freeCoins = (App.currentUser.freeCoins || 0) + reward.amount;
            App.currentUser.lastDailyReward = new Date();
            
            // Record
            await db.collection(Collections.DAILY_REWARDS).add({
                userId: App.currentUser.uid,
                amount: reward.amount,
                rarity: reward.rarity,
                claimedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // XP
            App.addXP(5, 'daily_login');
            App.grantAchievement('daily_login', 1);
            App.updateCoinDisplay();
            
            // Show result
            if (rewardResult) {
                rewardResult.style.display = 'block';
                document.getElementById('reward-text').innerHTML = `
                    <div style="font-size:3rem;margin-bottom:8px;">${reward.emoji}</div>
                    <span style="color:var(--primary);">⚡ +${reward.amount} Free Coins!</span>
                    <br>
                    <span style="font-size:0.8rem;color:var(--text-secondary);">${reward.rarity}</span>
                `;
            }
            
            App.updateCoinDisplay();
    Sound.play('coin');
    Sound.haptic('success');
               
 if (reward.rarity.includes('Legendary')) {
        Sound.play('achievement');
    }
        } catch (error) {
            console.error('Daily reward error:', error);
        }
    },
    
    calculateDailyReward() {
        // Weighted random - hard to get high amounts
        const roll = Math.random() * 100;
        
        if (roll < 50) {
            // 50% chance: 1-4 coins
            return { amount: Math.floor(Math.random() * 4) + 1, rarity: '🩶 Common', emoji: '🎁' };
        } else if (roll < 75) {
            // 25% chance: 5-14 coins
            return { amount: Math.floor(Math.random() * 10) + 5, rarity: '💚 Uncommon', emoji: '🎁' };
        } else if (roll < 90) {
            // 15% chance: 15-49 coins
            return { amount: Math.floor(Math.random() * 35) + 15, rarity: '💙 Rare', emoji: '✨' };
        } else if (roll < 98) {
            // 8% chance: 50-149 coins
            return { amount: Math.floor(Math.random() * 100) + 50, rarity: '💜 Epic', emoji: '🌟' };
        } else {
            // 2% chance: 150-200 coins
            return { amount: Math.floor(Math.random() * 51) + 150, rarity: '🧡 Legendary', emoji: '👑' };
        }
    },
    
    /* ==================
       SPIN WHEEL
       ================== */
    
    openSpinWheel() {
        document.getElementById('spin-wheel-modal').style.display = 'flex';
        this.spinAdsWatched = 0;
        this.updateSpinUI();
        this.drawWheel();
    },
    
    updateSpinUI() {
        const remaining = document.getElementById('ads-remaining');
        const spinBtn = document.getElementById('spin-btn');
        
        if (remaining) remaining.textContent = this.requiredAds - this.spinAdsWatched;
        
        if (this.spinAdsWatched >= this.requiredAds) {
            if (spinBtn) {
                spinBtn.innerHTML = '<i class="fas fa-sync-alt"></i> SPIN!';
                spinBtn.onclick = () => this.spin();
                spinBtn.style.background = 'var(--gradient-primary)';
            }
        } else {
            if (spinBtn) {
                spinBtn.innerHTML = `<i class="fas fa-ad"></i> Watch Ad (${this.spinAdsWatched}/${this.requiredAds})`;
                spinBtn.onclick = () => this.watchAdForSpin();
            }
        }
    },
    
    watchAdForSpin() {
        Ads.showRewardedAd(() => {
            this.spinAdsWatched++;
            this.updateSpinUI();
            
            if (this.spinAdsWatched < this.requiredAds) {
                App.showToast(`Ad ${this.spinAdsWatched}/${this.requiredAds} watched! Keep going! ✨`, 'success');
            } else {
                App.showToast('All ads watched! Now spin! 🎰', 'success');
    Sound.play('spin');
    Sound.haptic('medium');
            }
        });
    },
    
    drawWheel() {
        const canvas = document.getElementById('spin-wheel-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const segments = this.getWheelSegments();
        const totalSegments = segments.length;
        const segmentAngle = (2 * Math.PI) / totalSegments;
        const radius = canvas.width / 2 - 10;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        segments.forEach((segment, i) => {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            
            // Segment background
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = segment.color;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Segment text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = 'white';
            ctx.font = `bold ${segment.label.length > 8 ? '9' : '11'}px Inter`;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 3;
            ctx.fillText(segment.label, radius - 8, 4);
            ctx.restore();
        });
        
        // Center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'var(--primary)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Vidr logo in center
        ctx.fillStyle = 'var(--primary)';
        ctx.font = 'bold 11px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('V', centerX, centerY + 4);
    },
    
    getWheelSegments() {
        return [
            { label: '⚡ 1', value: { type: 'free', amount: 1 }, color: '#f8b4d9', probability: 20 },
            { label: '⚡ 5', value: { type: 'free', amount: 5 }, color: '#c084fc', probability: 15 },
            { label: '⚡ 10', value: { type: 'free', amount: 10 }, color: '#818cf8', probability: 12 },
            { label: '⚡ 20', value: { type: 'free', amount: 20 }, color: '#f8b4d9', probability: 10 },
            { label: '⚡ 50', value: { type: 'free', amount: 50 }, color: '#c084fc', probability: 8 },
            { label: '⚡ 100', value: { type: 'free', amount: 100 }, color: '#818cf8', probability: 6 },
            { label: '⚡ 200', value: { type: 'free', amount: 200 }, color: '#6366f1', probability: 3 },
            { label: '🪙 $0.01', value: { type: 'paid', amount: 1 }, color: '#fbbf24', probability: 8 },
            { label: '🪙 $0.05', value: { type: 'paid', amount: 5 }, color: '#f59e0b', probability: 5 },
            { label: '🪙 $0.10', value: { type: 'paid', amount: 10 }, color: '#fbbf24', probability: 4 },
            { label: '🪙 $0.25', value: { type: 'paid', amount: 25 }, color: '#f59e0b', probability: 3 },
            { label: '🪙 $0.50', value: { type: 'paid', amount: 50 }, color: '#ef4444', probability: 2 },
            { label: '🎁 Gift', value: { type: 'gift', amount: 0 }, color: '#34d399', probability: 3 },
            { label: 'Try Again', value: { type: 'nothing', amount: 0 }, color: '#9ca3af', probability: 1 }
        ];
    },
    
    currentRotation: 0,
    
    spin() {
        if (this.isSpinning) return;
        if (this.spinAdsWatched < this.requiredAds) {
            App.showToast(`Watch ${this.requiredAds} ads first!`, 'warning');
            return;
        }
        
        this.isSpinning = true;
        this.spinAdsWatched = 0;
        this.updateSpinUI();
        
        const canvas = document.getElementById('spin-wheel-canvas');
        if (!canvas) return;
        
        // Determine winning segment
        const result = this.pickWheelResult();
        const segments = this.getWheelSegments();
        const winIndex = segments.findIndex(s => s === result);
        const segmentAngle = 360 / segments.length;
        
        // Calculate target angle
        const targetAngle = 360 * 8 + (winIndex * segmentAngle);
        const startRotation = this.currentRotation;
        const totalRotation = targetAngle + (Math.random() * segmentAngle * 0.8);
        
        let start = null;
        const duration = 4000;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            if (progress < 1) {
                const eased = 1 - Math.pow(1 - progress, 4);
                const rotation = startRotation + (totalRotation * eased);
                this.currentRotation = rotation;
                
                canvas.style.transform = `rotate(${rotation}deg)`;
                requestAnimationFrame(animate);
            } else {
                canvas.style.transform = `rotate(${startRotation + totalRotation}deg)`;
                this.currentRotation = startRotation + totalRotation;
                this.isSpinning = false;
                this.onSpinComplete(result);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    pickWheelResult() {
        const segments = this.getWheelSegments();
        
        // 0.0000001% chance of paid reward bumped up slightly for spin
        const roll = Math.random() * 100;
        let accumulated = 0;
        
        // Paid reward check (0.0001% chance for max paid reward)
        if (App.rollPaidReward()) {
            return segments.find(s => s.value.type === 'paid' && s.value.amount === 50);
        }
        
        for (const segment of segments) {
            accumulated += segment.probability;
            if (roll <= accumulated) return segment;
        }
        
        return segments[0];
    },
    
    async onSpinComplete(result) {
        await new Promise(r => setTimeout(r, 500));
        
        const value = result.value;
        let message = '';
        let rewardText = '';
        
        if (value.type === 'free' && value.amount > 0) {
        Sound.play('coin');
        Sound.haptic('medium');
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                freeCoins: firebase.firestore.FieldValue.increment(value.amount)
            });
            App.currentUser.freeCoins = (App.currentUser.freeCoins || 0) + value.amount;
            message = `You won ⚡ ${value.amount} Free Coins!`;
            rewardText = `+⚡ ${value.amount}`;
            
        } else if (value.type === 'paid' && value.amount > 0) {
      Sound.play('win');
        Sound.haptic('success');
            const usdValue = value.amount / 100;
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                goldCoins: firebase.firestore.FieldValue.increment(value.amount)
            });
            App.currentUser.goldCoins = (App.currentUser.goldCoins || 0) + value.amount;
            message = `🎉 LUCKY! You won 🪙 $${usdValue.toFixed(2)} Gold Coins!`;
            rewardText = `+🪙 $${usdValue.toFixed(2)}`;
            Wallet.showConfetti();
            
        } else if (value.type === 'gift') {
            message = '🎁 You won a free gift!';
            rewardText = '🎁 Free Gift';
        } else {
Sound.play('pop');
            message = 'Better luck next time! 😅';
            rewardText = 'Try Again';
        }
        
        App.updateCoinDisplay();
        
        // Show result modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '600';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);border-radius:var(--radius-xl);
                         padding:32px;text-align:center;box-shadow:var(--shadow-xl);">
                <div style="font-size:4rem;margin-bottom:12px;animation:bounceIn 0.5s ease;">${result.label.includes('🪙') ? '💰' : result.label.includes('🎁') ? '🎁' : result.label.includes('Try') ? '😅' : '🎉'}</div>
                <h2 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:8px;color:var(--primary);">${rewardText}</h2>
                <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:20px;">${message}</p>
                <button class="btn btn-primary btn-full" onclick="this.closest('.modal-overlay').remove()">Collect!</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        App.grantAchievement('winner', 1);
    }
};

/* ============================================
   XP BOOST MODULE
   ============================================ */

const XP = {
    
    boostOptions: [
        { minutes: 15, cost: 100, label: '15 min', multiplier: '2x' },
        { minutes: 30, cost: 180, label: '30 min', multiplier: '2x' },
        { minutes: 60, cost: 300, label: '1 hour', multiplier: '2x' },
        { minutes: 1440, cost: 1000, label: '1 day', multiplier: '2x' }
    ],
    
    async buyBoost(minutes) {
        const option = this.boostOptions.find(o => o.minutes === minutes);
        if (!option) return;
        
        const freeCoins = App.currentUser?.freeCoins || 0;
        
        if (freeCoins < option.cost) {
            App.showToast(`Need ⚡ ${option.cost} free coins`, 'warning');
            return;
        }
        
        const confirm = await this.showBoostConfirm(option);
        if (!confirm) return;
        
        App.showLoading();
        
        try {
            const expiry = new Date();
            expiry.setMinutes(expiry.getMinutes() + minutes);
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                freeCoins: firebase.firestore.FieldValue.increment(-option.cost),
                xpBoostActive: true,
                xpBoostExpiry: expiry
            });
            
            App.currentUser.freeCoins -= option.cost;
            App.currentUser.xpBoostActive = true;
            App.currentUser.xpBoostExpiry = expiry;
            
            await db.collection(Collections.XP_BOOSTS).add({
                userId: App.currentUser.uid,
                minutes: minutes,
                cost: option.cost,
                activatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: expiry
            });
            
            await db.collection(Collections.TRANSACTIONS).add({
                type: 'xp_boost',
                userId: App.currentUser.uid,
                coins: option.cost,
                minutes: minutes,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            App.updateCoinDisplay();
            App.closeModal('xp-boost-modal');
            
            App.showToast(`⚡ 2x XP Boost active for ${option.label}!`, 'success');
            
            // Show boost timer
            this.showBoostTimer(expiry);
            
        } catch (error) {
            App.showToast('Error activating boost', 'error');
        }
        
        App.hideLoading();
    },
    
    showBoostConfirm(option) {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.zIndex = '400';
            modal.innerHTML = `
                <div style="width:100%;max-width:300px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:24px;text-align:center;box-shadow:var(--shadow-xl);">
                    <div style="font-size:3rem;margin-bottom:12px;">⚡</div>
                    <h2 style="font-family:var(--font-display);margin-bottom:8px;">Activate XP Boost?</h2>
                    <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px;">
                        ${option.multiplier} XP for ${option.label}<br>
                        <strong>Cost: ⚡ ${option.cost} free coins</strong>
                    </p>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove(); window._boostResolve(false)">Cancel</button>
                        <button class="btn btn-primary" style="flex:1;" onclick="this.closest('.modal-overlay').remove(); window._boostResolve(true)">Activate</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            window._boostResolve = resolve;
        });
    },
    
    showBoostTimer(expiry) {
        const existing = document.getElementById('boost-timer');
        if (existing) existing.remove();
        
        const timer = document.createElement('div');
        timer.id = 'boost-timer';
        timer.style.cssText = `
            position: fixed;
            top: calc(var(--header-height) + var(--safe-area-top) + 8px);
            right: 8px;
            z-index: 150;
            background: var(--gradient-gold);
            color: #78350f;
            padding: 4px 10px;
            border-radius: var(--radius-full);
            font-size: 0.72rem;
            font-weight: 700;
            box-shadow: var(--shadow-md);
            animation: boostGlow 1s ease-in-out infinite;
        `;
        
        document.body.appendChild(timer);
        
        const updateTimer = () => {
            const now = new Date();
            const diff = expiry - now;
            
            if (diff <= 0) {
                timer.remove();
                return;
            }
            
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            timer.textContent = `⚡ 2x XP ${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        const interval = setInterval(() => {
            const now = new Date();
            if (now >= expiry) {
                clearInterval(interval);
                timer.remove();
                App.currentUser.xpBoostActive = false;
                return;
            }
            updateTimer();
        }, 1000);
    }
};

/* ============================================
   MINI GAMES MODULE
   ============================================ */

const Games = {
    
    init() {
        // Nothing to init, games are loaded on demand
    },
    
    async play(gameId) {
        const costs = {
            coinflip: 10,
            dice: 15,
            scratch: 20,
            slots: 25,
            rps: 5,
            guess: 10
        };
        
        const cost = costs[gameId];
        if ((App.currentUser?.freeCoins || 0) < cost) {
            App.showToast(`Need ⚡ ${cost} free coins to play`, 'warning');
            return;
        }
        
        switch (gameId) {
            case 'coinflip': this.playCoinFlip(cost); break;
            case 'dice': this.playDice(cost); break;
            case 'scratch': this.playScratch(cost); break;
            case 'slots': this.playSlots(cost); break;
            case 'rps': this.playRPS(cost); break;
            case 'guess': this.playGuess(cost); break;
        }
    },
    
    async deductCoins(amount) {
        await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
            freeCoins: firebase.firestore.FieldValue.increment(-amount)
        });
        App.currentUser.freeCoins -= amount;
        App.updateCoinDisplay();
    },
    
    async addCoins(amount) {
        await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
            freeCoins: firebase.firestore.FieldValue.increment(amount)
        });
        App.currentUser.freeCoins += amount;
        App.updateCoinDisplay();
    },
    
    showGameResult(won, coinsChange, gameEmoji, message) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '600';
        modal.innerHTML = `
            <div style="width:100%;max-width:280px;background:var(--bg-secondary);border-radius:var(--radius-xl);
                         padding:28px;text-align:center;box-shadow:var(--shadow-xl);">
                <div style="font-size:3.5rem;margin-bottom:12px;animation:bounceIn 0.4s ease;">${gameEmoji}</div>
                <h2 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:6px;
                            color:${won ? 'var(--success)' : 'var(--danger)'};">
                    ${won ? 'You Win! 🎉' : 'Try Again 😅'}
                </h2>
                <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:8px;">${message}</p>
                <p style="font-size:1.2rem;font-weight:800;color:${won ? 'var(--success)' : 'var(--danger)'};">
                    ${won ? '+' : ''}⚡ ${coinsChange}
                </p>
                <div style="display:flex;gap:8px;margin-top:20px;">
                    <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove()">Done</button>
                    <button class="btn btn-primary" style="flex:1;" onclick="this.closest('.modal-overlay').remove(); Games.play('${this._lastGame}')">Play Again</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        if (won) {
            Wallet.showConfetti();
            App.grantAchievement('winner', 1);
        }
        
        App.grantAchievement('gamer', 1);
    },
    
    _lastGame: '',
    
    /* ==================
       COIN FLIP
       ================== */
    
    playCoinFlip(cost) {
        this._lastGame = 'coinflip';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:28px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">🪙 Coin Flip</h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px;">
                    Cost: ⚡ ${cost} | Win: ⚡ ${cost * 2 - Math.floor(cost * 0.1)} (win gets 90% of pot)
                </p>
                <div style="font-size:4rem;margin-bottom:20px;" id="coin-display">🪙</div>
                <div style="display:flex;gap:12px;justify-content:center;">
                    <button class="btn btn-primary" style="flex:1;" onclick="Games.flipCoin('heads', ${cost}, this)">Heads</button>
                    <button class="btn btn-secondary" style="flex:1;" onclick="Games.flipCoin('tails', ${cost}, this)">Tails</button>
                </div>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async flipCoin(choice, cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        
        await this.deductCoins(cost);
        
        const coinDisplay = modal.querySelector('#coin-display');
        let flips = 0;
        const flipInterval = setInterval(() => {
            coinDisplay.textContent = flips % 2 === 0 ? '🪙' : '🔘';
            flips++;
        }, 150);
        
        await new Promise(r => setTimeout(r, 1500));
        clearInterval(flipInterval);
        
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        coinDisplay.textContent = result === 'heads' ? '🪙' : '🔘';
        
        modal.remove();
        
        const won = choice === result;
        const winAmount = Math.floor(cost * 1.9);
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            result === 'heads' ? '🪙' : '🔘',
            `It was ${result}! ${won ? 'You guessed right!' : 'Better luck next time!'}`
        );
    },
    
    /* ==================
       LUCKY DICE
       ================== */
    
    playDice(cost) {
        this._lastGame = 'dice';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:28px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">🎲 Lucky Dice</h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:4px;">Roll 5 or 6 to win!</p>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:20px;">Cost: ⚡ ${cost}</p>
                <div style="font-size:5rem;margin-bottom:20px;" id="dice-display">🎲</div>
                <p style="color:var(--text-tertiary);font-size:0.78rem;margin-bottom:16px;">Prizes: 5=⚡${cost*2} | 6=⚡${cost*3}</p>
                <button class="btn btn-primary btn-full" onclick="Games.rollDice(${cost}, this)">🎲 Roll!</button>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async rollDice(cost, btn) {
        const modal = btn.closest('.modal-overlay');
        btn.disabled = true;
        
        await this.deductCoins(cost);
        
        const diceDisplay = modal.querySelector('#dice-display');
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        let rolls = 0;
        const rollInterval = setInterval(() => {
            diceDisplay.textContent = diceEmojis[Math.floor(Math.random() * 6)];
            rolls++;
        }, 100);
        
        await new Promise(r => setTimeout(r, 2000));
        clearInterval(rollInterval);
        
        const result = Math.floor(Math.random() * 6) + 1;
        diceDisplay.textContent = diceEmojis[result - 1];
        
        modal.remove();
        
        const won = result >= 5;
        const winAmount = result === 6 ? cost * 3 : result === 5 ? cost * 2 : 0;
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            diceEmojis[result - 1],
            `You rolled ${result}! ${won ? `You win ⚡ ${winAmount}!` : 'No win. Need 5 or 6.'}`
        );
    },
    
    /* ==================
       SCRATCH CARD
       ================== */
    
    async playScratch(cost) {
        this._lastGame = 'scratch';
        
        await this.deductCoins(cost);
        
        const symbols = ['⭐', '💎', '🍀', '🔥', '💜', '🌈'];
        const grid = Array(9).fill(null).map(() => symbols[Math.floor(Math.random() * symbols.length)]);
        
        // Determine win
        const winChance = Math.random();
        let won = false;
        if (winChance < 0.35) {
            const winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            const winPositions = positions.sort(() => Math.random() - 0.5).slice(0, 3);
            winPositions.forEach(pos => grid[pos] = winSymbol);
            won = true;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:24px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">🎫 Scratch Card</h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px;">Match 3 symbols to win!</p>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;" id="scratch-grid">
                    ${grid.map((symbol, i) => `
                        <div class="scratch-cell" data-index="${i}" data-symbol="${symbol}"
                             onclick="Games.scratchCell(this)"
                             style="height:70px;background:var(--bg-tertiary);border-radius:var(--radius-md);
                                    display:flex;align-items:center;justify-content:center;cursor:pointer;
                                    font-size:2rem;border:2px solid var(--border-light);position:relative;overflow:hidden;">
                            <div class="scratch-cover" style="position:absolute;inset:0;background:linear-gradient(135deg,var(--primary),var(--accent));
                                 display:flex;align-items:center;justify-content:center;">
                                <span style="color:white;font-size:1.5rem;">🎫</span>
                            </div>
                            <span class="scratch-symbol" style="display:none;">${symbol}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-secondary" onclick="Games.revealAll(this, ${won}, ${cost})" style="margin-bottom:8px;">Reveal All</button>
                <p style="font-size:0.72rem;color:var(--text-tertiary);">Tap each card to scratch</p>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.dataset.won = won.toString();
        modal.dataset.cost = cost;
        modal.dataset.scratched = '0';
    },
    
    scratchCell(cell) {
        const cover = cell.querySelector('.scratch-cover');
        const symbol = cell.querySelector('.scratch-symbol');
        
        if (!cover || cover.style.display === 'none') return;
        
        cover.style.display = 'none';
        symbol.style.display = 'block';
        
        const modal = cell.closest('.modal-overlay');
        const scratched = parseInt(modal.dataset.scratched) + 1;
        modal.dataset.scratched = scratched;
        
        if (scratched >= 9) {
            const won = modal.dataset.won === 'true';
            const cost = parseInt(modal.dataset.cost);
            
            setTimeout(() => {
                modal.remove();
                const winAmount = cost * 3;
                if (won) this.addCoins(winAmount);
                this.showGameResult(
                    won,
                    won ? winAmount : -cost,
                    won ? '🎊' : '😅',
                    won ? `3 symbols matched! You win ⚡ ${winAmount}!` : 'No match. Try again!'
                );
            }, 500);
        }
    },
    
    revealAll(btn, won, cost) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('.scratch-cover').forEach(cover => {
            cover.style.display = 'none';
        });
        modal.querySelectorAll('.scratch-symbol').forEach(sym => {
            sym.style.display = 'block';
        });
        
        setTimeout(() => {
            modal.remove();
            const winAmount = cost * 3;
            if (won) this.addCoins(winAmount);
            this.showGameResult(
                won,
                won ? winAmount : -cost,
                won ? '🎊' : '😅',
                won ? `3 symbols matched! You win ⚡ ${winAmount}!` : 'No match. Try again!'
            );
        }, 1000);
    },
    
    /* ==================
       SLOTS 777
       ================== */
    
    playSlots(cost) {
        this._lastGame = 'slots';
        
        const symbols = ['7️⃣', '🍒', '💎', '⭐', '🍋', '🔔', '🃏'];
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:28px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">🎰 Lucky Slots</h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px;">Cost: ⚡ ${cost}</p>
                
                <!-- Slot Machine -->
                <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;
                             background:var(--bg-tertiary);border-radius:var(--radius-lg);padding:16px;">
                    <div class="slot-reel" id="slot-1" style="width:60px;height:60px;background:white;border-radius:var(--radius-md);
                              display:flex;align-items:center;justify-content:center;font-size:2rem;
                              border:3px solid var(--border-color);overflow:hidden;">🎰</div>
                    <div class="slot-reel" id="slot-2" style="width:60px;height:60px;background:white;border-radius:var(--radius-md);
                              display:flex;align-items:center;justify-content:center;font-size:2rem;
                              border:3px solid var(--border-color);">🎰</div>
                    <div class="slot-reel" id="slot-3" style="width:60px;height:60px;background:white;border-radius:var(--radius-md);
                              display:flex;align-items:center;justify-content:center;font-size:2rem;
                              border:3px solid var(--border-color);">🎰</div>
                </div>
                
                <div style="font-size:0.72rem;color:var(--text-tertiary);margin-bottom:12px;text-align:left;">
                    777=⚡${cost*10} | 💎💎💎=⚡${cost*7} | ⭐⭐⭐=⚡${cost*5} | Any 3=⚡${cost*2}
                </div>
                
                <button class="btn btn-primary btn-full" style="background:var(--gradient-live);" onclick="Games.spinSlots(${cost}, this)">
                    🎰 SPIN!
                </button>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.dataset.symbols = JSON.stringify(symbols);
    },
    
    async spinSlots(cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        
        await this.deductCoins(cost);
        
        const symbols = JSON.parse(modal.dataset.symbols);
        const reels = ['slot-1', 'slot-2', 'slot-3'];
        const results = [];
        
        // Animate reels
        for (let i = 0; i < reels.length; i++) {
            const reel = document.getElementById(reels[i]);
            let spins = 0;
            const totalSpins = 15 + i * 5;
            
            await new Promise(resolve => {
                const spin = setInterval(() => {
                    reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                    spins++;
                    if (spins >= totalSpins) {
                        clearInterval(spin);
                        const finalSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                        reel.textContent = finalSymbol;
                        results.push(finalSymbol);
                        resolve();
                    }
                }, 80);
            });
        }
        
        modal.remove();
        
        // Determine win
        const [s1, s2, s3] = results;
        let won = false;
        let winAmount = 0;
        let message = '';
        
        if (s1 === s2 && s2 === s3) {
            won = true;
            if (s1 === '7️⃣') {
                winAmount = cost * 10;
                message = '🎉 JACKPOT! 777!';
            } else if (s1 === '💎') {
                winAmount = cost * 7;
                message = '💎 Triple Diamonds!';
            } else if (s1 === '⭐') {
                winAmount = cost * 5;
                message = '⭐ Triple Stars!';
            } else {
                winAmount = cost * 2;
                message = `Three ${s1}! You win!`;
            }
        } else {
            message = `${s1} ${s2} ${s3} - No match`;
        }
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            results.join(''),
            message
        );
    },
    
    /* ==================
       ROCK PAPER SCISSORS
       ================== */
    
    playRPS(cost) {
        this._lastGame = 'rps';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:28px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">✊ RPS</h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:20px;">Cost: ⚡ ${cost} | Win: ⚡ ${cost * 2}</p>
                
                <div style="font-size:4rem;margin-bottom:20px;" id="rps-display">🤔</div>
                
                <div style="display:flex;justify-content:center;gap:12px;">
                    <button onclick="Games.playRPSChoice('rock', ${cost}, this)" style="font-size:2.5rem;width:70px;height:70px;background:var(--bg-tertiary);border-radius:var(--radius-lg);border:2px solid var(--border-color);">✊</button>
                    <button onclick="Games.playRPSChoice('paper', ${cost}, this)" style="font-size:2.5rem;width:70px;height:70px;background:var(--bg-tertiary);border-radius:var(--radius-lg);border:2px solid var(--border-color);">✋</button>
                    <button onclick="Games.playRPSChoice('scissors', ${cost}, this)" style="font-size:2.5rem;width:70px;height:70px;background:var(--bg-tertiary);border-radius:var(--radius-lg);border:2px solid var(--border-color);">✌️</button>
                </div>
                <button class="btn btn-secondary btn-full" style="margin-top:12px;" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async playRPSChoice(choice, cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        
        await this.deductCoins(cost);
        
        const display = modal.querySelector('#rps-display');
        const choices = ['rock', 'paper', 'scissors'];
        const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
        
        let countdown = 3;
        const countInterval = setInterval(() => {
            display.textContent = countdown > 0 ? countdown : '🤜';
            countdown--;
        }, 500);
        
        await new Promise(r => setTimeout(r, 2000));
        clearInterval(countInterval);
        
        const botChoice = choices[Math.floor(Math.random() * 3)];
        display.textContent = emojis[botChoice];
        
        await new Promise(r => setTimeout(r, 800));
        modal.remove();
        
        const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
        const won = wins[choice] === botChoice;
        const draw = choice === botChoice;
        
        let winAmount = 0;
        let resultMsg = '';
        
        if (won) {
            winAmount = cost * 2;
            await this.addCoins(winAmount);
            resultMsg = `Bot played ${emojis[botChoice]}. You win!`;
        } else if (draw) {
            winAmount = cost;
            await this.addCoins(winAmount);
            resultMsg = 'Draw! Coins returned.';
        } else {
            resultMsg = `Bot played ${emojis[botChoice]}. You lose!`;
        }
        
        this.showGameResult(
            won || draw,
            won ? winAmount : draw ? 0 : -cost,
            `${emojis[choice]} vs ${emojis[botChoice]}`,
            resultMsg
        );
    },
    
    /* ==================
       NUMBER GUESS
       ================== */
    
    playGuess(cost) {
        this._lastGame = 'guess';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:280px;background:var(--bg-secondary);border-radius:var(--radius-xl);padding:28px;text-align:center;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">🔢 Number Guess</h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:4px;">Guess 1-10 | Win: ⚡ ${cost * 8}</p>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:20px;">Cost: ⚡ ${cost}</p>
                
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px;">
                    ${Array.from({length: 10}, (_, i) => i + 1).map(n => `
                        <button onclick="Games.guessNumber(${n}, ${cost}, this)"
                                style="height:44px;background:var(--bg-tertiary);border-radius:var(--radius-md);
                                       font-weight:700;font-size:1rem;border:2px solid var(--border-color);
                                       transition:all 0.2s;">
                            ${n}
                        </button>
                    `).join('')}
                </div>
                
                <button class="btn btn-secondary btn-full" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async guessNumber(guess, cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        
        await this.deductCoins(cost);
        await new Promise(r => setTimeout(r, 1000));
        
        const answer = Math.floor(Math.random() * 10) + 1;
        modal.remove();
        
        const won = guess === answer;
        const winAmount = cost * 8;
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            won ? '🎯' : '😅',
            won ? `The number was ${answer}! Perfect guess!` : `The number was ${answer}. You guessed ${guess}.`
        );
    }
};