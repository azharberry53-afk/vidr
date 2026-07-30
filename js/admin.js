/* ============================================
   ADMIN MODULE - Full Control System
   ============================================ */

const Admin = {
    selectedUser: null,
    selectedUserId: null,
    statsListener: null,
    
    /* ==================
       INITIALIZE
       ================== */
    
    async init() {
        if (!App.isAdmin) {
            App.showToast('Access denied', 'error');
            return;
        }
        
        await this.loadStats();
        this.listenToStats();
    },
    
    /* ==================
       DASHBOARD STATS
       ================== */
    
    async loadStats() {
        try {
            const [usersSnap, postsSnap, ordersSnap, transSnap] = await Promise.all([
                db.collection(Collections.USERS).get(),
                db.collection(Collections.POSTS).get(),
                db.collection(Collections.ORDERS).get(),
                db.collection(Collections.TRANSACTIONS)
                    .where('type', 'in', ['coin_purchase', 'verified_subscription', 'purchase'])
                    .get()
            ]);
            
            const totalRevenue = transSnap.docs.reduce((acc, doc) => {
                return acc + (doc.data().price || doc.data().amount || 0);
            }, 0);
            
            const activeUsers = usersSnap.docs.filter(doc => {
                const lastActive = doc.data().lastActive?.toDate?.() || new Date(0);
                return (new Date() - lastActive) < 7 * 24 * 60 * 60 * 1000;
            }).length;
            
            document.getElementById('admin-total-users').textContent = 
                App.formatNumber(usersSnap.size);
            document.getElementById('admin-active-users').textContent = 
                App.formatNumber(activeUsers);
            document.getElementById('admin-total-posts').textContent = 
                App.formatNumber(postsSnap.size);
            document.getElementById('admin-revenue').textContent = 
                `$${totalRevenue.toFixed(2)}`;
                
            // Extended stats
            this.renderExtendedStats({
                totalUsers: usersSnap.size,
                activeUsers,
                totalPosts: postsSnap.size,
                totalOrders: ordersSnap.size,
                totalRevenue,
                bannedUsers: usersSnap.docs.filter(d => d.data().isBanned).length,
                verifiedUsers: usersSnap.docs.filter(d => d.data().isVerified).length,
                botAccounts: usersSnap.docs.filter(d => d.data().isBot).length
            });
            
        } catch (error) {
            console.error('Load stats error:', error);
        }
    },
    
    renderExtendedStats(stats) {
        const adminContent = document.querySelector('.admin-content');
        if (!adminContent) return;
        
        const extStats = document.createElement('div');
        extStats.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 20px;
        `;
        
        const statItems = [
            { label: 'Banned', value: stats.bannedUsers, color: 'var(--danger)' },
            { label: 'Verified', value: stats.verifiedUsers, color: 'var(--accent)' },
            { label: 'Orders', value: stats.totalOrders, color: 'var(--success)' },
            { label: 'Bots', value: stats.botAccounts, color: 'var(--warning)' }
        ];
        
        extStats.innerHTML = statItems.map(item => `
            <div style="background:var(--bg-card);border-radius:var(--radius-md);padding:12px;
                         text-align:center;border:1px solid var(--border-light);">
                <h3 style="font-size:1.2rem;font-weight:800;color:${item.color};">
                    ${App.formatNumber(item.value)}
                </h3>
                <p style="color:var(--text-secondary);font-size:0.75rem;margin-top:2px;">
                    ${item.label}
                </p>
            </div>
        `).join('');
        
        // Insert after admin-stats
        const adminStats = adminContent.querySelector('.admin-stats');
        if (adminStats) {
            adminStats.after(extStats);
        }
    },
    
    listenToStats() {
        this.statsListener = db.collection(Collections.USERS)
            .onSnapshot(() => this.loadStats());
    },
    
    /* ==================
       USER SEARCH
       ================== */
    
    async searchUser() {
        const query = document.getElementById('admin-user-search')?.value.trim().toLowerCase();
        if (!query) return;
        
        const resultsEl = document.getElementById('admin-user-results');
        resultsEl.innerHTML = '<div class="spinner" style="margin:20px auto;display:block;"></div>';
        
        try {
            // Search by username
            const byUsername = await db.collection(Collections.USERS)
                .where('username', '>=', query)
                .where('username', '<=', query + '\uf8ff')
                .limit(5)
                .get();
            
            // Search by display name
            const byName = await db.collection(Collections.USERS)
                .where('displayName', '>=', query)
                .where('displayName', '<=', query + '\uf8ff')
                .limit(5)
                .get();
            
            const users = new Map();
            [...byUsername.docs, ...byName.docs].forEach(doc => {
                users.set(doc.id, { id: doc.id, ...doc.data() });
            });
            
            if (users.size === 0) {
                resultsEl.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-tertiary);">No users found</p>';
                return;
            }
            
            let html = '';
            users.forEach(user => {
                html += this.renderAdminUserCard(user);
            });
            
            resultsEl.innerHTML = html;
            
        } catch (error) {
            console.error('Admin search error:', error);
            resultsEl.innerHTML = '<p style="color:var(--danger);padding:12px;">Search error</p>';
        }
    },
    
    renderAdminUserCard(user) {
        const statusBadges = [];
        if (user.isBanned) statusBadges.push('<span style="background:var(--danger);color:white;padding:2px 6px;border-radius:4px;font-size:0.65rem;">BANNED</span>');
        if (user.isSuspended) statusBadges.push('<span style="background:var(--warning);color:white;padding:2px 6px;border-radius:4px;font-size:0.65rem;">SUSPENDED</span>');
        if (user.isVerified) statusBadges.push('<span style="background:var(--accent);color:white;padding:2px 6px;border-radius:4px;font-size:0.65rem;">VERIFIED</span>');
        if (user.isBot) statusBadges.push('<span style="background:var(--text-tertiary);color:white;padding:2px 6px;border-radius:4px;font-size:0.65rem;">BOT</span>');
        if (user.role === 'admin') statusBadges.push('<span style="background:var(--gradient-live);color:white;padding:2px 6px;border-radius:4px;font-size:0.65rem;">ADMIN</span>');
        if (user.role === 'moderator') statusBadges.push('<span style="background:var(--gradient-accent);color:white;padding:2px 6px;border-radius:4px;font-size:0.65rem;">MOD</span>');
        
        return `
            <div style="display:flex;align-items:center;gap:10px;padding:12px;
                         background:var(--bg-card);border-radius:var(--radius-md);
                         margin-bottom:8px;border:1px solid var(--border-light);cursor:pointer;"
                 onclick="Admin.selectUser('${user.id}')">
                <img src="${user.photoURL || 'assets/icons/default-avatar.png'}" 
                     style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.9rem;">${App.escapeHtml(user.displayName || 'User')}</div>
                    <div style="color:var(--text-secondary);font-size:0.75rem;">@${App.escapeHtml(user.username || '')}</div>
                    <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
                        ${statusBadges.join('')}
                    </div>
                </div>
                <div style="text-align:right;font-size:0.72rem;color:var(--text-tertiary);">
                    <div>Lv.${user.level || 1}</div>
                    <div>🪙${App.formatNumber(user.goldCoins || 0)}</div>
                </div>
            </div>
        `;
    },
    
    /* ==================
       SELECT USER
       ================== */
    
    async selectUser(userId) {
        App.showLoading();
        
        try {
            const userDoc = await db.collection(Collections.USERS).doc(userId).get();
            if (!userDoc.exists) {
                App.showToast('User not found', 'error');
                App.hideLoading();
                return;
            }
            
            this.selectedUser = { id: userId, ...userDoc.data() };
            this.selectedUserId = userId;
            
            const modal = document.getElementById('admin-user-modal');
            const infoEl = document.getElementById('admin-user-info');
            
            infoEl.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border-light);">
                    <img src="${this.selectedUser.photoURL || 'assets/icons/default-avatar.png'}"
                         style="width:56px;height:56px;border-radius:50%;object-fit:cover;">
                    <div>
                        <div style="font-weight:700;font-size:1rem;">${App.escapeHtml(this.selectedUser.displayName || '')}</div>
                        <div style="color:var(--text-secondary);font-size:0.82rem;">@${App.escapeHtml(this.selectedUser.username || '')}</div>
                        <div style="color:var(--text-tertiary);font-size:0.75rem;">${this.selectedUser.email || ''}</div>
                        <div style="display:flex;gap:8px;margin-top:4px;font-size:0.75rem;color:var(--text-secondary);">
                            <span>Lv.${this.selectedUser.level || 1}</span>
                            <span>⚡${App.formatNumber(this.selectedUser.freeCoins || 0)}</span>
                            <span>🪙${App.formatNumber(this.selectedUser.goldCoins || 0)}</span>
                            <span>👥${App.formatNumber(this.selectedUser.followers || 0)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- User Stats Grid -->
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid var(--border-light);">
                    <div style="padding:10px;text-align:center;border-right:1px solid var(--border-light);">
                        <div style="font-weight:700;">${App.formatNumber(this.selectedUser.totalPosts || 0)}</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary);">Posts</div>
                    </div>
                    <div style="padding:10px;text-align:center;border-right:1px solid var(--border-light);">
                        <div style="font-weight:700;">${App.formatNumber(this.selectedUser.following || 0)}</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary);">Following</div>
                    </div>
                    <div style="padding:10px;text-align:center;">
                        <div style="font-weight:700;">${App.formatNumber(this.selectedUser.likes || 0)}</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary);">Likes</div>
                    </div>
                </div>
                
                <!-- Status Info -->
                <div style="padding:10px 20px;background:${this.selectedUser.isBanned ? 'rgba(248,113,113,0.1)' : this.selectedUser.isSuspended ? 'rgba(251,191,36,0.1)' : 'transparent'};font-size:0.78rem;">
                    ${this.selectedUser.isBanned ? '<span style="color:var(--danger);font-weight:600;">⛔ User is BANNED</span>' :
                      this.selectedUser.isSuspended ? '<span style="color:var(--warning);font-weight:600;">⏸ User is SUSPENDED</span>' :
                      '<span style="color:var(--success);">✅ Account Active</span>'}
                </div>
            `;
            
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('Select user error:', error);
        }
        
        App.hideLoading();
    },
    
    /* ==================
       BAN / UNBAN
       ================== */
    
    async toggleBan() {
        if (!this.selectedUserId) return;
        
        const isBanned = this.selectedUser?.isBanned;
        const action = isBanned ? 'unban' : 'ban';
        
        if (!isBanned) {
            // Show ban reason modal
            const reason = await this.promptInput('Ban Reason', 'Enter reason for ban...');
            if (reason === null) return;
            
            App.showLoading();
            
            await db.collection(Collections.USERS).doc(this.selectedUserId).update({
                isBanned: true,
                banReason: reason,
                bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
                bannedBy: App.currentUser.uid
            });
            
            // Log admin action
            await this.logAction('ban', this.selectedUserId, { reason });
            
            App.showToast(`User banned`, 'success');
        } else {
            App.showLoading();
            
            await db.collection(Collections.USERS).doc(this.selectedUserId).update({
                isBanned: false,
                banReason: null,
                bannedAt: null,
                bannedBy: null
            });
            
            await this.logAction('unban', this.selectedUserId, {});
            App.showToast('User unbanned', 'success');
        }
        
        App.hideLoading();
        App.closeModal('admin-user-modal');
        await this.searchUser();
    },
    
    /* ==================
       SUSPEND / UNSUSPEND
       ================== */
    
    async toggleSuspend() {
        if (!this.selectedUserId) return;
        
        const isSuspended = this.selectedUser?.isSuspended;
        
        if (!isSuspended) {
            const duration = await this.promptSelect('Suspension Duration', [
                { value: '1', label: '1 Day' },
                { value: '3', label: '3 Days' },
                { value: '7', label: '7 Days' },
                { value: '14', label: '14 Days' },
                { value: '30', label: '30 Days' }
            ]);
            if (!duration) return;
            
            const reason = await this.promptInput('Suspend Reason', 'Enter reason...');
            if (reason === null) return;
            
            App.showLoading();
            
            const suspendUntil = new Date();
            suspendUntil.setDate(suspendUntil.getDate() + parseInt(duration));
            
            await db.collection(Collections.USERS).doc(this.selectedUserId).update({
                isSuspended: true,
                suspendedUntil: suspendUntil,
                suspendReason: reason,
                suspendedBy: App.currentUser.uid
            });
            
            await this.logAction('suspend', this.selectedUserId, { duration, reason });
            App.showToast(`User suspended for ${duration} day(s)`, 'success');
            
        } else {
            App.showLoading();
            
            await db.collection(Collections.USERS).doc(this.selectedUserId).update({
                isSuspended: false,
                suspendedUntil: null,
                suspendReason: null
            });
            
            await this.logAction('unsuspend', this.selectedUserId, {});
            App.showToast('User unsuspended', 'success');
        }
        
        App.hideLoading();
        App.closeModal('admin-user-modal');
    },
    
    /* ==================
       VERIFIED BADGE
       ================== */
    
    async toggleVerified() {
        if (!this.selectedUserId) return;
        
        const isVerified = this.selectedUser?.isVerified;
        
        App.showLoading();
        
        if (!isVerified) {
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 10); // Admin grants permanent verification
            
            await db.collection(Collections.USERS).doc(this.selectedUserId).update({
                isVerified: true,
                verifiedExpiry: expiryDate,
                animatedAvatar: true,
                animatedCover: true,
                animatedUsername: true,
                freeBoostsRemaining: 5
            });
            
            App.showToast('✅ Verified badge granted', 'success');
        } else {
            await db.collection(Collections.USERS).doc(this.selectedUserId).update({
                isVerified: false,
                verifiedExpiry: null,
                animatedAvatar: false,
                animatedCover: false,
                animatedUsername: false,
                freeBoostsRemaining: 0
            });
            
            App.showToast('Verified badge removed', 'info');
        }
        
        await this.logAction(isVerified ? 'remove_verified' : 'grant_verified', this.selectedUserId, {});
        App.hideLoading();
        App.closeModal('admin-user-modal');
    },
    
    /* ==================
       ADD COINS
       ================== */
    
    async addCoins() {
        if (!this.selectedUserId) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:24px;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:16px;">💰 Add Coins</h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;">
                    To: <strong>${App.escapeHtml(this.selectedUser?.displayName || '')}</strong>
                </p>
                
                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
                    <div>
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);
                                       margin-bottom:6px;display:block;">⚡ Free Coins</label>
                        <input type="number" id="admin-free-coins" class="form-input" 
                               placeholder="Amount" min="0">
                    </div>
                    <div>
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);
                                       margin-bottom:6px;display:block;">🪙 Gold Coins</label>
                        <input type="number" id="admin-gold-coins" class="form-input" 
                               placeholder="Amount" min="0">
                    </div>
                    <div>
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);
                                       margin-bottom:6px;display:block;">Reason</label>
                        <input type="text" id="admin-coins-reason" class="form-input" 
                               placeholder="Reason for adding coins">
                    </div>
                </div>
                
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" style="flex:1;" 
                            onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" style="flex:1;" 
                            onclick="Admin.confirmAddCoins(this)">Add Coins</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async confirmAddCoins(btn) {
        const freeCoins = parseInt(document.getElementById('admin-free-coins')?.value) || 0;
        const goldCoins = parseInt(document.getElementById('admin-gold-coins')?.value) || 0;
        const reason = document.getElementById('admin-coins-reason')?.value.trim() || 'Admin grant';
        
        if (freeCoins === 0 && goldCoins === 0) {
            App.showToast('Enter coin amounts', 'warning');
            return;
        }
        
        btn.disabled = true;
        App.showLoading();
        
        try {
            const updates = {};
            if (freeCoins > 0) updates.freeCoins = firebase.firestore.FieldValue.increment(freeCoins);
            if (goldCoins > 0) updates.goldCoins = firebase.firestore.FieldValue.increment(goldCoins);
            
            await db.collection(Collections.USERS).doc(this.selectedUserId).update(updates);
            
            // Transaction record
            await db.collection(Collections.TRANSACTIONS).add({
                type: 'admin_grant',
                userId: this.selectedUserId,
                adminId: App.currentUser.uid,
                freeCoins,
                goldCoins,
                reason,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await this.logAction('add_coins', this.selectedUserId, { freeCoins, goldCoins, reason });
            
            // Notify user
            Notifications.send(this.selectedUserId, 'gift', {
                fromUser: 'Vidr Admin',
                fromAvatar: 'assets/logo/favicon.png',
                message: `You received ⚡${freeCoins} + 🪙${goldCoins} coins! Reason: ${reason}`
            });
            
            btn.closest('.modal-overlay')?.remove();
            App.hideLoading();
            App.closeModal('admin-user-modal');
            App.showToast(`Coins added successfully`, 'success');
            
        } catch (error) {
            App.showToast('Error adding coins', 'error');
            App.hideLoading();
        }
    },
    
    /* ==================
       TITLES MANAGEMENT
       ================== */
    
    async manageTitles() {
        if (!this.selectedUserId) return;
        
        const currentTitles = this.selectedUser?.titles || [];
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:380px;max-height:80vh;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>🏷️ Manage Titles</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:16px;overflow-y:auto;max-height:400px;">
                    <!-- Add Custom Title -->
                    <div style="display:flex;gap:8px;margin-bottom:16px;">
                        <input type="text" id="new-title-input" class="form-input" 
                               placeholder="Custom title..." maxlength="20" style="flex:1;">
                        <button class="btn btn-sm btn-primary" onclick="Admin.addCustomTitle()">Add</button>
                    </div>
                    
                    <!-- Existing Titles -->
                    <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:8px;">Current Titles</h4>
                    <div id="user-titles-list">
                        ${currentTitles.length > 0 ? currentTitles.map(title => `
                            <div style="display:flex;align-items:center;justify-content:space-between;
                                         padding:8px;background:var(--bg-tertiary);border-radius:var(--radius-md);margin-bottom:6px;">
                                <span class="title-badge ${Profile.getTitleRarity(title)}">${title}</span>
                                <button onclick="Admin.removeTitle('${title}', this)" 
                                        style="color:var(--danger);font-size:0.85rem;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('') : '<p style="color:var(--text-tertiary);font-size:0.85rem;">No titles yet</p>'}
                    </div>
                    
                    <!-- Preset Titles -->
                    <h4 style="font-size:0.85rem;font-weight:700;margin-top:12px;margin-bottom:8px;">Preset Titles</h4>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${['Vidr Star', 'Top Creator', 'Elite Member', 'VIP', 'Pioneer', 
                           'Legend', 'Champion', 'MVP', 'Trendsetter', 'Influencer',
                           'Verified Creator', 'Diamond Member', 'Platinum', 'Gold Member'].map(t => `
                            <button onclick="Admin.givePresetTitle('${t}')"
                                    style="padding:4px 10px;border-radius:var(--radius-full);font-size:0.75rem;
                                           font-weight:600;background:var(--bg-tertiary);border:1px solid var(--border-light);">
                                ${t}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async addCustomTitle() {
        const input = document.getElementById('new-title-input');
        const title = input?.value.trim();
        if (!title) return;
        
        App.showLoading();
        
        await db.collection(Collections.USERS).doc(this.selectedUserId).update({
            titles: firebase.firestore.FieldValue.arrayUnion(title)
        });
        
        await this.logAction('add_title', this.selectedUserId, { title });
        input.value = '';
        App.hideLoading();
        App.showToast('Title added!', 'success');
        
        // Refresh list
        this.selectUser(this.selectedUserId);
    },
    
    async givePresetTitle(title) {
        App.showLoading();
        
        await db.collection(Collections.USERS).doc(this.selectedUserId).update({
            titles: firebase.firestore.FieldValue.arrayUnion(title)
        });
        
        await this.logAction('add_title', this.selectedUserId, { title });
        App.hideLoading();
        App.showToast(`Title "${title}" granted!`, 'success');
    },
    
    async removeTitle(title, btn) {
        App.showLoading();
        
        await db.collection(Collections.USERS).doc(this.selectedUserId).update({
            titles: firebase.firestore.FieldValue.arrayRemove(title),
            selectedTitle: this.selectedUser?.selectedTitle === title ? null : this.selectedUser?.selectedTitle
        });
        
        await this.logAction('remove_title', this.selectedUserId, { title });
        btn.closest('[style*="background"]')?.remove();
        App.hideLoading();
        App.showToast('Title removed', 'info');
    },
    
    /* ==================
       ACHIEVEMENTS MANAGEMENT
       ================== */
    
    async manageAchievements() {
        if (!this.selectedUserId) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:380px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>🏆 Achievements</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:16px;">
                    <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:12px;">
                        Grant or max out achievements for this user
                    </p>
                    <div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto;">
                        ${Object.keys(App.getAchievementData('welcome') ? 
                            ['welcome','first_post','first_like','first_comment','first_follow',
                             'first_share','streamer','gifter','earner','gamer','daily_login',
                             'level_master','popular','viral','chatter','shopper','seller',
                             'adventurer','collector','winner'] : []).map(() => '').join('') || 
                            ['welcome','first_post','first_like','first_comment','first_follow',
                             'first_share','streamer','gifter','earner','gamer','daily_login',
                             'level_master','popular','viral','chatter','shopper','seller',
                             'adventurer','collector','winner'].map(id => {
                                const data = App.getAchievementData(id);
                                return `
                                    <div style="display:flex;align-items:center;justify-content:space-between;
                                                 padding:10px;background:var(--bg-tertiary);border-radius:var(--radius-md);">
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <span style="font-size:1.3rem;">${data.icon}</span>
                                            <div>
                                                <div style="font-weight:600;font-size:0.85rem;">${data.name}</div>
                                                <div style="font-size:0.72rem;color:var(--text-secondary);">${data.desc}</div>
                                            </div>
                                        </div>
                                        <div style="display:flex;gap:4px;">
                                            <button onclick="Admin.grantAchievementLevel('${id}', 50)"
                                                    style="padding:4px 8px;background:var(--primary);color:white;
                                                           border-radius:var(--radius-sm);font-size:0.7rem;font-weight:600;">
                                                Lv50
                                            </button>
                                            <button onclick="Admin.grantAchievementLevel('${id}', 100)"
                                                    style="padding:4px 8px;background:var(--gradient-gold);color:#78350f;
                                                           border-radius:var(--radius-sm);font-size:0.7rem;font-weight:600;">
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async grantAchievementLevel(achievementId, level) {
        if (!this.selectedUserId) return;
        
        App.showLoading();
        
        try {
            const data = App.getAchievementData(achievementId);
            
            await db.collection(Collections.USERS).doc(this.selectedUserId)
                .collection('achievements').doc(achievementId).set({
                    id: achievementId,
                    name: data.name,
                    icon: data.icon,
                    level: level,
                    progress: 0,
                    maxLevel: 100,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            await this.logAction('grant_achievement', this.selectedUserId, { achievementId, level });
            App.showToast(`Achievement granted at level ${level}!`, 'success');
            
        } catch (error) {
            App.showToast('Error granting achievement', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       SET LEVEL
       ================== */
    
    async setLevel() {
        if (!this.selectedUserId) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:24px;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:16px;">⭐ Set Level</h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:12px;">
                    Current: Lv.${this.selectedUser?.level || 1} | Max: 10,000
                </p>
                <input type="number" id="admin-set-level" class="form-input" 
                       placeholder="Enter level (1-10000)" min="1" max="10000"
                       value="${this.selectedUser?.level || 1}" style="margin-bottom:12px;">
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" style="flex:1;" 
                            onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" style="flex:1;" 
                            onclick="Admin.confirmSetLevel(this)">Set Level</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async confirmSetLevel(btn) {
        const level = parseInt(document.getElementById('admin-set-level')?.value);
        
        if (!level || level < 1 || level > 10000) {
            App.showToast('Level must be 1-10000', 'warning');
            return;
        }
        
        App.showLoading();
        
        await db.collection(Collections.USERS).doc(this.selectedUserId).update({
            level: level,
            xp: 0
        });
        
        await this.logAction('set_level', this.selectedUserId, { level });
        
        btn.closest('.modal-overlay')?.remove();
        App.hideLoading();
        App.showToast(`Level set to ${level}!`, 'success');
    },
    
    /* ==================
       SET ROLE
       ================== */
    
    async setRole() {
        if (!this.selectedUserId) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:24px;box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:16px;">👤 Set Role</h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:12px;">
                    Current role: <strong>${this.selectedUser?.role || 'user'}</strong>
                </p>
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
                    ${[
                        { value: 'user', icon: '👤', label: 'User', desc: 'Regular user' },
                        { value: 'moderator', icon: '🛡️', label: 'Moderator', desc: 'Can moderate content' },
                        { value: 'admin', icon: '⚙️', label: 'Admin', desc: 'Full access' }
                    ].map(role => `
                        <label style="display:flex;align-items:center;gap:10px;padding:12px;
                                       background:var(--bg-tertiary);border-radius:var(--radius-md);cursor:pointer;
                                       border:2px solid ${this.selectedUser?.role === role.value ? 'var(--primary)' : 'transparent'};">
                            <input type="radio" name="user-role" value="${role.value}" 
                                   ${this.selectedUser?.role === role.value ? 'checked' : ''}
                                   style="accent-color:var(--primary);">
                            <span style="font-size:1.2rem;">${role.icon}</span>
                            <div>
                                <div style="font-weight:600;font-size:0.9rem;">${role.label}</div>
                                <div style="font-size:0.75rem;color:var(--text-secondary);">${role.desc}</div>
                            </div>
                        </label>
                    `).join('')}
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" style="flex:1;" 
                            onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" style="flex:1;" 
                            onclick="Admin.confirmSetRole(this)">Set Role</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async confirmSetRole(btn) {
        const role = document.querySelector('input[name="user-role"]:checked')?.value;
        if (!role) return;
        
        App.showLoading();
        
        await db.collection(Collections.USERS).doc(this.selectedUserId).update({ role });
        await this.logAction('set_role', this.selectedUserId, { role });
        
        btn.closest('.modal-overlay')?.remove();
        App.closeModal('admin-user-modal');
        App.hideLoading();
        App.showToast(`Role set to ${role}!`, 'success');
    },
    
    /* ==================
       ACCESS PRIVATE ACCOUNT
       ================== */
    
    async viewPrivateAccount(userId) {
        if (!App.isAdmin) return;
        
        // Admin bypass - temporarily set bypass flag
        sessionStorage.setItem('admin_bypass_private', userId);
        Profile.viewProfile(userId);
    },
    
    /* ==================
       BOT MANAGEMENT
       ================== */
    
    async addBots() {
        const count = parseInt(document.getElementById('bot-count')?.value);
        if (!count || count < 1 || count > 1000) {
            App.showToast('Enter 1-1000 bots', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            const botNames = [
                'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Jamie',
                'Avery', 'Skylar', 'Quinn', 'Reese', 'Blake', 'Cameron', 'Dakota',
                'Drew', 'Emery', 'Finley', 'Harley', 'Hunter', 'Jaden', 'Kerry',
                'Lane', 'Logan', 'Micah', 'Noel', 'Paxton', 'Peyton', 'Reagan',
                'River', 'Robin', 'Rory', 'Sage', 'Sawyer', 'Scout', 'Spencer',
                'Sterling', 'Storm', 'Tatum', 'Terry', 'Tyler', 'Winter', 'Wren'
            ];
            
            const botBios = [
                'Living life to the fullest ✨',
                'Content creator | Explorer 🌍',
                'Just here for the vibes 💜',
                'Photography | Travel | Food 📸',
                'Making memories every day 🎉',
                'Dream big, work hard 💪',
                'Coffee addict & content creator ☕',
                'Spreading positivity 🌈'
            ];
            
            const batch = db.batch();
            const botsRef = db.collection(Collections.USERS);
            
            for (let i = 0; i < Math.min(count, 500); i++) {
                const botId = `bot_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`;
                const botName = botNames[Math.floor(Math.random() * botNames.length)];
                const botNum = Math.floor(Math.random() * 9999);
                
                batch.set(botsRef.doc(botId), {
                    uid: botId,
                    username: `${botName.toLowerCase()}${botNum}`,
                    displayName: `${botName} ${botNum}`,
                    email: `bot_${botId}@vidr.bot`,
                    photoURL: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`,
                    coverURL: null,
                    bio: botBios[Math.floor(Math.random() * botBios.length)],
                    level: Math.floor(Math.random() * 50) + 1,
                    xp: Math.floor(Math.random() * 1000),
                    freeCoins: Math.floor(Math.random() * 500),
                    goldCoins: 0,
                    followers: Math.floor(Math.random() * 5000),
                    following: Math.floor(Math.random() * 200),
                    likes: Math.floor(Math.random() * 10000),
                    totalPosts: Math.floor(Math.random() * 50),
                    role: 'user',
                    isVerified: Math.random() < 0.1,
                    isBanned: false,
                    isSuspended: false,
                    isPrivate: false,
                    isBot: true,
                    titles: [],
                    selectedTitle: null,
                    achievements: [],
                    selectedAchievements: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    settings: {
                        darkMode: false,
                        notifications: false,
                        privateAccount: false
                    }
                });
            }
            
            await batch.commit();
            
            await db.collection(Collections.BOTS).add({
                count: count,
                createdBy: App.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            App.hideLoading();
            App.showToast(`${count} bot accounts created!`, 'success');
            document.getElementById('bot-count').value = '';
            await this.loadStats();
            
        } catch (error) {
            console.error('Add bots error:', error);
            App.showToast('Error creating bots', 'error');
            App.hideLoading();
        }
    },
    
    /* ==================
       ADD BOT VIDEO
       ================== */
    
    async addBotVideo() {
        const videoUrl = document.getElementById('bot-video-url')?.value.trim();
        if (!videoUrl) {
            App.showToast('Enter video URL', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            // Get random bot
            const botsSnap = await db.collection(Collections.USERS)
                .where('isBot', '==', true)
                .limit(50)
                .get();
            
            if (botsSnap.empty) {
                App.showToast('No bots found. Add bots first.', 'warning');
                App.hideLoading();
                return;
            }
            
            const bots = botsSnap.docs;
            const randomBot = bots[Math.floor(Math.random() * bots.length)];
            const botData = randomBot.data();
            
            const captions = [
                'Check this out! 🔥',
                'Living my best life ✨',
                'Sharing some vibes 💜',
                'What do you think? 👀',
                'Had to share this! 🎉',
                'Love this so much 💕',
                'Just wow 😍',
                'This is everything 🌟'
            ];
            
            await db.collection(Collections.POSTS).add({
                userId: randomBot.id,
                type: 'video',
                caption: captions[Math.floor(Math.random() * captions.length)],
                videoURL: videoUrl,
                thumbnailURL: '',
                visibility: 'public',
                isActive: true,
                isBoosted: false,
                products: [],
                likes: Math.floor(Math.random() * 1000),
                comments: Math.floor(Math.random() * 100),
                shares: Math.floor(Math.random() * 50),
                views: Math.floor(Math.random() * 5000),
                likedBy: [],
                isBot: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userData: {
                    displayName: botData.displayName,
                    username: botData.username,
                    photoURL: botData.photoURL,
                    isVerified: botData.isVerified,
                    role: 'user'
                }
            });
            
            App.hideLoading();
            App.showToast('Bot video added to feed!', 'success');
            document.getElementById('bot-video-url').value = '';
            
        } catch (error) {
            console.error('Add bot video error:', error);
            App.showToast('Error adding bot video', 'error');
            App.hideLoading();
        }
    },
    
    /* ==================
       MANAGE ADS
       ================== */
    
    manageAds() {
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>📢 Ad Management</h2>
            </div>
            <div style="padding:16px;overflow-y:auto;height:calc(100vh - 60px);">
                <!-- Revenue Stats -->
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;">
                    <div style="padding:16px;background:var(--bg-card);border-radius:var(--radius-lg);text-align:center;border:1px solid var(--border-light);">
                        <h3 style="font-size:1.3rem;font-weight:800;color:var(--success);" id="ad-impressions">-</h3>
                        <p style="font-size:0.75rem;color:var(--text-secondary);">Total Impressions</p>
                    </div>
                    <div style="padding:16px;background:var(--bg-card);border-radius:var(--radius-lg);text-align:center;border:1px solid var(--border-light);">
                        <h3 style="font-size:1.3rem;font-weight:800;color:var(--primary);" id="est-revenue">-</h3>
                        <p style="font-size:0.75rem;color:var(--text-secondary);">Est. Revenue</p>
                    </div>
                </div>
                
                <!-- Network Toggle -->
                <h3 style="font-weight:700;margin-bottom:12px;">Ad Networks</h3>
                ${Object.entries(Ads.networks).map(([network, config]) => `
                    <div style="display:flex;align-items:center;justify-content:space-between;
                                 padding:14px;background:var(--bg-card);border-radius:var(--radius-md);
                                 margin-bottom:8px;border:1px solid var(--border-light);">
                        <div>
                            <p style="font-weight:600;font-size:0.9rem;">${network.charAt(0).toUpperCase() + network.slice(1)}</p>
                            <p style="font-size:0.75rem;color:var(--text-secondary);">
                                ${config.active ? '✅ Active' : '❌ Inactive'}
                            </p>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" ${config.active ? 'checked' : ''} 
                                   onchange="Admin.toggleNetwork('${network}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                `).join('')}
                
                <!-- Ad Settings -->
                <h3 style="font-weight:700;margin:16px 0 12px;">Settings</h3>
                <div style="display:flex;align-items:center;justify-content:space-between;
                             padding:14px;background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:8px;
                             border:1px solid var(--border-light);">
                    <div>
                        <p style="font-weight:600;">Interstitial Ads</p>
                        <p style="font-size:0.78rem;color:var(--text-secondary);">Show between sessions</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;
                             padding:14px;background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:8px;
                             border:1px solid var(--border-light);">
                    <div>
                        <p style="font-weight:600;">Feed Ads</p>
                        <p style="font-size:0.78rem;color:var(--text-secondary);">Show in content feed</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;
                             padding:14px;background:var(--bg-card);border-radius:var(--radius-md);
                             border:1px solid var(--border-light);">
                    <div>
                        <p style="font-weight:600;">Push Notification Ads</p>
                        <p style="font-size:0.78rem;color:var(--text-secondary);">Background push ads</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.loadAdStats(modal);
    },
    
    async loadAdStats(modal) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const statsDoc = await db.collection('ad_analytics').doc(today).get();
            
            if (statsDoc.exists) {
                const data = statsDoc.data();
                const impressions = data.totalImpressions || 0;
                const estRevenue = (impressions / 1000 * 1.5).toFixed(2);
                
                modal.querySelector('#ad-impressions').textContent = App.formatNumber(impressions);
                modal.querySelector('#est-revenue').textContent = `$${estRevenue}`;
            }
        } catch (e) {}
    },
    
    toggleNetwork(network, active) {
        if (Ads.networks[network]) {
            Ads.networks[network].active = active;
            App.showToast(`${network} ${active ? 'enabled' : 'disabled'}`, 'info');
        }
    },
    
    /* ==================
       VIEW REPORTS
       ================== */
    
    async viewReports() {
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>🚩 Reports</h2>
            </div>
            <div id="reports-list" style="padding:16px;overflow-y:auto;height:calc(100vh-60px);">
                <div class="spinner" style="margin:40px auto;display:block;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const snapshot = await db.collection(Collections.REPORTS)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const list = modal.querySelector('#reports-list');
        
        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center;padding:60px;color:var(--text-tertiary);">No reports</p>';
            return;
        }
        
        let html = '';
        for (const doc of snapshot.docs) {
            const report = doc.data();
            const reportedUserDoc = await db.collection(Collections.USERS).doc(report.reportedUid).get();
            const reportedUser = reportedUserDoc.data();
            
            html += `
                <div style="padding:14px;background:var(--bg-card);border-radius:var(--radius-md);
                             margin-bottom:10px;border:1px solid var(--border-light);">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                        <img src="${reportedUser?.photoURL || 'assets/icons/default-avatar.png'}"
                             style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.88rem;">${App.escapeHtml(reportedUser?.displayName || 'Unknown')}</div>
                            <div style="font-size:0.72rem;color:var(--text-secondary);">
                                @${reportedUser?.username || '?'} • ${App.timeAgo(report.createdAt)}
                            </div>
                        </div>
                        <span style="background:rgba(248,113,113,0.1);color:var(--danger);
                                      padding:2px 8px;border-radius:var(--radius-full);font-size:0.72rem;font-weight:600;">
                            ${report.type}
                        </span>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="Admin.selectUser('${report.reportedUid}')"
                                style="flex:1;padding:8px;background:var(--bg-tertiary);border-radius:var(--radius-sm);
                                       font-size:0.78rem;font-weight:600;">
                            View User
                        </button>
                        <button onclick="Admin.dismissReport('${doc.id}', this)"
                                style="flex:1;padding:8px;background:var(--bg-tertiary);border-radius:var(--radius-sm);
                                       font-size:0.78rem;font-weight:600;">
                            Dismiss
                        </button>
                    </div>
                </div>
            `;
        }
        
        list.innerHTML = html;
    },
    
    async dismissReport(reportId, btn) {
        await db.collection(Collections.REPORTS).doc(reportId).delete();
        btn.closest('[style*="padding:14px"]')?.remove();
        App.showToast('Report dismissed', 'info');
    },
    
    /* ==================
       MANAGE SHOP
       ================== */
    
    async manageShop() {
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>🛍️ Shop Management</h2>
            </div>
            <div style="padding:16px;overflow-y:auto;height:calc(100vh-60px);" id="shop-mgmt-content">
                <div class="spinner" style="margin:40px auto;display:block;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const [productsSnap, ordersSnap] = await Promise.all([
            db.collection(Collections.PRODUCTS).orderBy('createdAt', 'desc').limit(20).get(),
            db.collection(Collections.ORDERS).orderBy('createdAt', 'desc').limit(20).get()
        ]);
        
        const content = modal.querySelector('#shop-mgmt-content');
        
        // Revenue summary
        const totalRevenue = ordersSnap.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
        const platformEarnings = totalRevenue * 0.08;
        
        content.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
                <div style="padding:12px;background:var(--bg-card);border-radius:var(--radius-md);text-align:center;border:1px solid var(--border-light);">
                    <h3 style="font-weight:800;color:var(--primary);">${productsSnap.size}</h3>
                    <p style="font-size:0.72rem;color:var(--text-secondary);">Products</p>
                </div>
                <div style="padding:12px;background:var(--bg-card);border-radius:var(--radius-md);text-align:center;border:1px solid var(--border-light);">
                    <h3 style="font-weight:800;color:var(--success);">$${totalRevenue.toFixed(2)}</h3>
                    <p style="font-size:0.72rem;color:var(--text-secondary);">GMV</p>
                </div>
                <div style="padding:12px;background:var(--bg-card);border-radius:var(--radius-md);text-align:center;border:1px solid var(--border-light);">
                    <h3 style="font-weight:800;color:var(--warning);">$${platformEarnings.toFixed(2)}</h3>
                    <p style="font-size:0.72rem;color:var(--text-secondary);">8% Fee</p>
                </div>
            </div>
            
            <h3 style="font-weight:700;margin-bottom:10px;">Recent Products</h3>
            ${productsSnap.docs.map(doc => {
                const p = doc.data();
                return `
                    <div style="display:flex;gap:10px;padding:12px;background:var(--bg-card);
                                 border-radius:var(--radius-md);margin-bottom:8px;border:1px solid var(--border-light);">
                        <img src="${p.images?.[0] || ''}" style="width:48px;height:48px;border-radius:var(--radius-sm);object-fit:cover;">
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:0.85rem;">${App.escapeHtml(p.name || '')}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);">$${p.price?.toFixed(2)} • ${p.sold || 0} sold</div>
                        </div>
                        <button onclick="Admin.removeProduct('${doc.id}', this)"
                                style="color:var(--danger);font-size:0.85rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }).join('')}
        `;
    },
    
    async removeProduct(productId, btn) {
        if (!confirm('Remove this product?')) return;
        
        await db.collection(Collections.PRODUCTS).doc(productId).update({ isActive: false });
        btn.closest('[style*="display:flex"]')?.remove();
        App.showToast('Product removed', 'info');
    },
    
    /* ==================
       CLEAR CACHE
       ================== */
    
    async clearCache() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            localStorage.clear();
            sessionStorage.clear();
            
            App.showToast('Cache cleared! Refreshing...', 'success');
            
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            App.showToast('Cache cleared (partial)', 'info');
        }
    },
    
    /* ==================
       ACTION LOGGER
       ================== */
    
    async logAction(action, targetUserId, details = {}) {
        try {
            await db.collection('admin_logs').add({
                adminId: App.currentUser.uid,
                adminName: App.currentUser.displayName,
                action,
                targetUserId,
                details,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn('Log error:', e);
        }
    },
    
    /* ==================
       UTILITY PROMPTS
       ================== */
    
    promptInput(title, placeholder) {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.zIndex = '600';
            modal.innerHTML = `
                <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                             border-radius:var(--radius-xl);padding:24px;box-shadow:var(--shadow-xl);">
                    <h3 style="margin-bottom:12px;">${title}</h3>
                    <input type="text" id="prompt-input" class="form-input" placeholder="${placeholder}" style="margin-bottom:12px;">
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove();window._promptResolve(null)">Cancel</button>
                        <button class="btn btn-primary" style="flex:1;" onclick="window._promptResolve(document.getElementById('prompt-input').value);this.closest('.modal-overlay').remove()">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            window._promptResolve = resolve;
            setTimeout(() => modal.querySelector('#prompt-input')?.focus(), 100);
        });
    },
    
    promptSelect(title, options) {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.zIndex = '600';
            modal.innerHTML = `
                <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                             border-radius:var(--radius-xl);padding:24px;box-shadow:var(--shadow-xl);">
                    <h3 style="margin-bottom:12px;">${title}</h3>
                    <select id="prompt-select" class="form-input" style="margin-bottom:12px;color:var(--text-primary);">
                        ${options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                    </select>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove();window._selectResolve(null)">Cancel</button>
                        <button class="btn btn-primary" style="flex:1;" onclick="window._selectResolve(document.getElementById('prompt-select').value);this.closest('.modal-overlay').remove()">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            window._selectResolve = resolve;
        });
    }
};