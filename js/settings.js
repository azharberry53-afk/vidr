/* ============================================
   SETTINGS MODULE
   ============================================ */

const Settings = {
    
    /* ==================
       OPEN SETTINGS
       ================== */
    
    open() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay-page';
        overlay.id = 'settings-page';
        overlay.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Settings</h2>
            </div>
            <div style="overflow-y:auto;height:calc(100vh - 60px);">
                
                <!-- Profile Section -->
                <div class="settings-section">
                    <div class="settings-section-title">Account</div>
                    <div class="settings-group">
                        <div class="settings-item" onclick="Profile.openEditProfile()">
                            <div class="settings-icon" style="background:var(--pastel-purple);">
                                <i class="fas fa-user-edit" style="color:var(--primary);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Edit Profile</div>
                                <div class="settings-sub">Name, username, bio</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                        <div class="settings-item" onclick="Wallet.open()">
                            <div class="settings-icon" style="background:var(--pastel-yellow);">
                                <i class="fas fa-wallet" style="color:var(--warning);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Wallet & Coins</div>
                                <div class="settings-sub">⚡${App.formatNumber(App.currentUser?.freeCoins||0)} 🪙${App.formatNumber(App.currentUser?.goldCoins||0)}</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                        <div class="settings-item" onclick="Settings.openReferral()">
                            <div class="settings-icon" style="background:var(--pastel-green);">
                                <i class="fas fa-user-plus" style="color:var(--success);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Refer Friends</div>
                                <div class="settings-sub">Earn ⚡50 per referral</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Appearance -->
                <div class="settings-section">
                    <div class="settings-section-title">Appearance</div>
                    <div class="settings-group">
                        <div class="settings-item">
                            <div class="settings-icon" style="background:var(--pastel-blue);">
                                <i class="fas fa-moon" style="color:var(--accent);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Dark Mode</div>
                                <div class="settings-sub">Switch to dark theme</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="dark-mode-toggle"
                                       ${document.documentElement.dataset.theme === 'dark' ? 'checked' : ''}
                                       onchange="Settings.toggleDarkMode(this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Privacy -->
                <div class="settings-section">
                    <div class="settings-section-title">Privacy</div>
                    <div class="settings-group">
                        <div class="settings-item">
                            <div class="settings-icon" style="background:var(--pastel-red);">
                                <i class="fas fa-lock" style="color:var(--danger);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Private Account</div>
                                <div class="settings-sub">Only followers see posts</div>
                            </div>
                            <label class="toggle-switch">
                                <input type="checkbox" id="private-account-toggle"
                                       ${App.currentUser?.isPrivate ? 'checked' : ''}
                                       onchange="Settings.togglePrivate(this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="settings-item" onclick="Settings.openBlockedList()">
                            <div class="settings-icon" style="background:var(--pastel-red);">
                                <i class="fas fa-ban" style="color:var(--danger);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Blocked Users</div>
                                <div class="settings-sub">Manage blocked accounts</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Notifications -->
                <div class="settings-section">
                    <div class="settings-section-title">Notifications</div>
                    <div class="settings-group">
                        ${[
                            { id: 'notif-likes', label: 'Likes', sub: 'When someone likes your post' },
                            { id: 'notif-comments', label: 'Comments', sub: 'When someone comments' },
                            { id: 'notif-follows', label: 'New Followers', sub: 'When someone follows you' },
                            { id: 'notif-messages', label: 'Messages', sub: 'New direct messages' },
                            { id: 'notif-live', label: 'Live', sub: 'When following go live' }
                        ].map(n => `
                            <div class="settings-item">
                                <div class="settings-info" style="margin-left:0;">
                                    <div class="settings-label">${n.label}</div>
                                    <div class="settings-sub">${n.sub}</div>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="${n.id}" checked
                                           onchange="Settings.saveNotifPref('${n.id}', this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Content -->
                <div class="settings-section">
                    <div class="settings-section-title">Content</div>
                    <div class="settings-group">
                        <div class="settings-item" onclick="Settings.clearWatchHistory()">
                            <div class="settings-icon" style="background:var(--pastel-orange);">
                                <i class="fas fa-history" style="color:var(--warning);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Clear Watch History</div>
                                <div class="settings-sub">Reset your feed recommendations</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                        <div class="settings-item" onclick="Settings.clearCache()">
                            <div class="settings-icon" style="background:var(--pastel-blue);">
                                <i class="fas fa-broom" style="color:var(--accent);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Clear Cache</div>
                                <div class="settings-sub">Free up storage space</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                    </div>
                </div>
                // Add to Settings.open() HTML, in the Appearance section:

<div class="settings-item">
    <div class="settings-icon" style="background:var(--pastel-purple);">
        <i class="fas fa-volume-up" style="color:var(--primary);"></i>
    </div>
    <div class="settings-info">
        <div class="settings-label">Sound Effects</div>
        <div class="settings-sub">In-app sounds & feedback</div>
    </div>
    <label class="toggle-switch">
        <input type="checkbox" id="sound-toggle"
               ${Sound.enabled ? 'checked' : ''}
               onchange="Sound.toggle()">
        <span class="toggle-slider"></span>
    </label>
</div>

<div class="settings-item" style="flex-direction:column;align-items:flex-start;padding:16px;">
    <div style="display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;">
        <div class="settings-icon" style="background:var(--pastel-blue);">
            <i class="fas fa-sliders-h" style="color:var(--accent);"></i>
        </div>
        <div class="settings-info">
            <div class="settings-label">Volume</div>
            <div class="settings-sub">Adjust sound level</div>
        </div>
        <span id="volume-display" style="font-weight:700;color:var(--primary);">
            ${Math.round(Sound.volume * 100)}%
        </span>
    </div>
    <input type="range" min="0" max="100" 
           value="${Sound.volume * 100}"
           style="width:100%;margin-top:8px;accent-color:var(--primary);"
           oninput="Sound.setVolume(this.value/100); 
                    document.getElementById('volume-display').textContent = this.value + '%';
                    Sound.play('click')">
</div>

<div class="settings-item">
    <div class="settings-icon" style="background:var(--pastel-pink);">
        <i class="fas fa-mobile-alt" style="color:var(--secondary-dark);"></i>
    </div>
    <div class="settings-info">
        <div class="settings-label">Haptic Feedback</div>
        <div class="settings-sub">Vibration on actions (mobile)</div>
    </div>
    <label class="toggle-switch">
        <input type="checkbox" id="haptic-toggle" checked
               onchange="Sound.hapticEnabled = this.checked; localStorage.setItem('vidr_haptic_enabled', this.checked)">
        <span class="toggle-slider"></span>
    </label>
</div>
                <!-- Support -->
                <div class="settings-section">
                    <div class="settings-section-title">Support</div>
                    <div class="settings-group">
                        <div class="settings-item" onclick="Settings.openHelp()">
                            <div class="settings-icon" style="background:var(--pastel-green);">
                                <i class="fas fa-question-circle" style="color:var(--success);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Help & FAQ</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                        <div class="settings-item" onclick="Settings.reportBug()">
                            <div class="settings-icon" style="background:var(--pastel-orange);">
                                <i class="fas fa-bug" style="color:var(--warning);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Report a Bug</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                        <div class="settings-item" onclick="Settings.openTerms()">
                            <div class="settings-icon" style="background:var(--pastel-purple);">
                                <i class="fas fa-file-alt" style="color:var(--primary);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Terms & Privacy</div>
                            </div>
                            <i class="fas fa-chevron-right settings-arrow"></i>
                        </div>
                    </div>
                </div>
                
                <!-- App Info -->
                <div class="settings-section">
                    <div class="settings-group">
                        <div style="padding:16px;text-align:center;">
                            <div style="font-size:2rem;margin-bottom:8px;">💜</div>
                            <p style="font-family:var(--font-display);font-weight:800;font-size:1.1rem;">Vidr</p>
                            <p style="color:var(--text-tertiary);font-size:0.78rem;">Version 1.0.0</p>
                        </div>
                    </div>
                </div>
                
                <!-- Danger Zone -->
                <div class="settings-section">
                    <div class="settings-section-title" style="color:var(--danger);">Danger Zone</div>
                    <div class="settings-group">
                        <div class="settings-item" onclick="Auth.logout()">
                            <div class="settings-icon" style="background:var(--pastel-orange);">
                                <i class="fas fa-sign-out-alt" style="color:var(--warning);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label">Log Out</div>
                            </div>
                        </div>
                        <div class="settings-item" onclick="Settings.deleteAccount()">
                            <div class="settings-icon" style="background:var(--pastel-red);">
                                <i class="fas fa-trash-alt" style="color:var(--danger);"></i>
                            </div>
                            <div class="settings-info">
                                <div class="settings-label" style="color:var(--danger);">Delete Account</div>
                                <div class="settings-sub">Permanently delete all data</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="height:32px;"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.addSettingsStyles();
        this.loadNotifPrefs();
    },
    
    addSettingsStyles() {
        if (document.getElementById('settings-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'settings-styles';
        style.textContent = `
            .settings-section {
                margin-bottom: 8px;
            }
            .settings-section-title {
                font-size: 0.75rem;
                font-weight: 700;
                color: var(--text-tertiary);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                padding: 12px 16px 6px;
            }
            .settings-group {
                background: var(--bg-secondary);
                margin: 0;
            }
            .settings-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-light);
                transition: background var(--transition-fast);
            }
            .settings-item:last-child {
                border-bottom: none;
            }
            .settings-item:active {
                background: rgba(var(--primary-rgb), 0.04);
            }
            .settings-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-size: 0.9rem;
            }
            .settings-info {
                flex: 1;
            }
            .settings-label {
                font-weight: 600;
                font-size: 0.9rem;
            }
            .settings-sub {
                font-size: 0.75rem;
                color: var(--text-secondary);
                margin-top: 1px;
            }
            .settings-arrow {
                color: var(--text-tertiary);
                font-size: 0.75rem;
            }
        `;
        document.head.appendChild(style);
    },
    
    /* ==================
       DARK MODE
       ================== */
    
    toggleDarkMode(enabled) {
        document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
        localStorage.setItem('vidr_dark_mode', enabled ? 'true' : 'false');
        
        if (App.currentUser) {
            db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                'settings.darkMode': enabled
            });
        }
        
        App.showToast(enabled ? '🌙 Dark mode on' : '☀️ Light mode on', 'info');
    },
    
    initDarkMode() {
        const saved = localStorage.getItem('vidr_dark_mode');
        const userPref = App.currentUser?.settings?.darkMode;
        
        if (saved === 'true' || userPref === true) {
            document.documentElement.dataset.theme = 'dark';
        }
    },
    
    /* ==================
       PRIVATE ACCOUNT
       ================== */
    
    async togglePrivate(enabled) {
        try {
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                isPrivate: enabled
            });
            App.currentUser.isPrivate = enabled;
            App.showToast(enabled ? '🔒 Account is now private' : '🌍 Account is now public', 'info');
        } catch (e) {
            App.showToast('Error updating privacy', 'error');
        }
    },
    
    /* ==================
       NOTIFICATIONS PREFS
       ================== */
    
    loadNotifPrefs() {
        const prefs = JSON.parse(localStorage.getItem('vidr_notif_prefs') || '{}');
        ['notif-likes', 'notif-comments', 'notif-follows', 'notif-messages', 'notif-live'].forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle && prefs[id] !== undefined) {
                toggle.checked = prefs[id];
            }
        });
    },
    
    saveNotifPref(id, enabled) {
        const prefs = JSON.parse(localStorage.getItem('vidr_notif_prefs') || '{}');
        prefs[id] = enabled;
        localStorage.setItem('vidr_notif_prefs', JSON.stringify(prefs));
    },
    
    /* ==================
       REFERRAL SYSTEM
       ================== */
    
    openReferral() {
        const referralLink = `https://vidr.click/?ref=${App.currentUser?.uid}`;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:380px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div style="background:var(--gradient-primary);padding:32px;text-align:center;">
                    <div style="font-size:3rem;margin-bottom:8px;">🎁</div>
                    <h2 style="color:white;font-family:var(--font-display);font-size:1.3rem;">Refer & Earn!</h2>
                    <p style="color:rgba(255,255,255,0.9);font-size:0.88rem;margin-top:4px;">
                        Earn ⚡50 coins for each friend who joins
                    </p>
                </div>
                <div style="padding:20px;">
                    <!-- Stats -->
                    <div id="referral-stats" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                        <div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);">
                            <h3 id="total-referrals" style="font-size:1.5rem;font-weight:800;color:var(--primary);">-</h3>
                            <p style="font-size:0.75rem;color:var(--text-secondary);">Friends Referred</p>
                        </div>
                        <div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);">
                            <h3 id="referral-earned" style="font-size:1.5rem;font-weight:800;color:var(--success);">-</h3>
                            <p style="font-size:0.75rem;color:var(--text-secondary);">Coins Earned</p>
                        </div>
                    </div>
                    
                    <!-- Referral Link -->
                    <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;">
                        <p style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:4px;">Your referral link:</p>
                        <p style="font-size:0.82rem;font-weight:600;word-break:break-all;color:var(--primary);">${referralLink}</p>
                    </div>
                    
                    <!-- Share Buttons -->
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <button class="btn btn-primary btn-full" onclick="Settings.copyReferralLink('${referralLink}')">
                            📋 Copy Link
                        </button>
                        <button class="btn btn-secondary btn-full" onclick="Settings.shareReferral('${referralLink}')">
                            📤 Share
                        </button>
                    </div>
                    
                    <!-- How it works -->
                    <div style="margin-top:16px;padding:12px;background:rgba(var(--primary-rgb),0.05);border-radius:var(--radius-md);">
                        <p style="font-size:0.82rem;font-weight:700;margin-bottom:8px;">How it works:</p>
                        <p style="font-size:0.78rem;color:var(--text-secondary);line-height:1.6;">
                            1. Share your link with friends<br>
                            2. They sign up using your link<br>
                            3. You BOTH get ⚡50 free coins!<br>
                            4. No limit on referrals 🎉
                        </p>
                    </div>
                </div>
                <div style="padding:0 20px 20px;">
                    <button class="close-btn" style="width:100%;" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.loadReferralStats(modal);
    },
    
    async loadReferralStats(modal) {
        try {
            const snapshot = await db.collection(Collections.USERS)
                .where('referredBy', '==', App.currentUser.uid)
                .get();
            
            const count = snapshot.size;
            const earned = count * 50;
            
            const totalEl = modal.querySelector('#total-referrals');
            const earnedEl = modal.querySelector('#referral-earned');
            
            if (totalEl) totalEl.textContent = count;
            if (earnedEl) earnedEl.textContent = `⚡${earned}`;
        } catch (e) {}
    },
    
    async copyReferralLink(link) {
        try {
            await navigator.clipboard.writeText(link);
            App.showToast('Referral link copied! 🎉', 'success');
        } catch {
            App.showToast('Copy failed', 'error');
        }
    },
    
    shareReferral(link) {
        if (navigator.share) {
            navigator.share({
                title: 'Join me on Vidr!',
                text: '🎉 Join Vidr - Share, Create & Earn! Use my link to get ⚡50 bonus coins!',
                url: link
            });
        } else {
            this.copyReferralLink(link);
        }
    },
    
    /* ==================
       REFERRAL DETECTION
       ================== */
    
    async checkReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const refId = urlParams.get('ref');
        
        if (!refId || !App.currentUser) return;
        if (refId === App.currentUser.uid) return;
        
        // Check if already processed
        const userDoc = await db.collection(Collections.USERS).doc(App.currentUser.uid).get();
        if (userDoc.data()?.referredBy) return;
        
        try {
            const referrerDoc = await db.collection(Collections.USERS).doc(refId).get();
            if (!referrerDoc.exists) return;
            
            // Give both users coins
            const batch = db.batch();
            
            // New user gets 50 coins
            batch.update(db.collection(Collections.USERS).doc(App.currentUser.uid), {
                freeCoins: firebase.firestore.FieldValue.increment(50),
                referredBy: refId
            });
            
            // Referrer gets 50 coins
            batch.update(db.collection(Collections.USERS).doc(refId), {
                freeCoins: firebase.firestore.FieldValue.increment(50),
                totalReferrals: firebase.firestore.FieldValue.increment(1)
            });
            
            await batch.commit();
            
            // Notify referrer
            Notifications.send(refId, 'referral', {
                fromUser: App.currentUser.displayName,
                message: `${App.currentUser.displayName} joined using your referral link! +⚡50 coins!`
            });
            
            App.showToast('🎉 Referral bonus! +⚡50 coins!', 'success');
            
            // Clean URL
            window.history.replaceState({}, '', '/');
            
        } catch (e) {
            console.error('Referral error:', e);
        }
    },
    
    /* ==================
       OTHER SETTINGS
       ================== */
    
    async clearCache() {
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            App.showToast('Cache cleared! ✨', 'success');
        } catch {
            App.showToast('Cache cleared', 'info');
        }
    },
    
    clearWatchHistory() {
        localStorage.removeItem('vidr_watch_history');
        sessionStorage.removeItem('vidr_watched');
        App.showToast('Watch history cleared', 'info');
    },
    
    async openBlockedList() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay-page';
        overlay.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Blocked Users</h2>
            </div>
            <div id="blocked-list" style="padding:16px;">
                <div class="spinner" style="margin:40px auto;display:block;"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const blocked = App.currentUser?.blockedUsers || [];
        const list = overlay.querySelector('#blocked-list');
        
        if (blocked.length === 0) {
            list.innerHTML = '<p style="text-align:center;padding:60px;color:var(--text-tertiary);">No blocked users</p>';
            return;
        }
        
        let html = '';
        for (const uid of blocked) {
            const userDoc = await db.collection(Collections.USERS).doc(uid).get();
            if (!userDoc.exists) continue;
            const user = userDoc.data();
            
            html += `
                <div style="display:flex;align-items:center;gap:12px;padding:12px;
                             background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:8px;">
                    <img src="${user.photoURL||'assets/icons/default-avatar.png'}" 
                         style="width:44px;height:44px;border-radius:50%;object-fit:cover;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${App.escapeHtml(user.displayName||'')}</div>
                        <div style="font-size:0.78rem;color:var(--text-secondary);">@${App.escapeHtml(user.username||'')}</div>
                    </div>
                    <button onclick="Settings.unblockUser('${uid}', this)" 
                            class="btn btn-sm btn-secondary">Unblock</button>
                </div>
            `;
        }
        list.innerHTML = html;
    },
    
    async unblockUser(uid, btn) {
        await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
            blockedUsers: firebase.firestore.FieldValue.arrayRemove(uid)
        });
        App.currentUser.blockedUsers = App.currentUser.blockedUsers.filter(id => id !== uid);
        btn.closest('[style*="display:flex"]')?.remove();
        App.showToast('User unblocked', 'info');
    },
    
    openHelp() {
        window.open('https://vidr.click/help', '_blank');
    },
    
    async reportBug() {
        const desc = await Admin.promptInput('Report Bug', 'Describe the issue...');
        if (!desc) return;
        
        await db.collection('bug_reports').add({
            userId: App.currentUser.uid,
            description: desc,
            userAgent: navigator.userAgent,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        App.showToast('Bug reported! Thank you 🙏', 'success');
    },
    
    openTerms() {
        window.open('https://vidr.click/terms', '_blank');
    },
    
    async deleteAccount() {
        const confirm1 = await Admin.promptInput(
            '⚠️ Delete Account',
            'Type "DELETE" to confirm account deletion'
        );
        
        if (confirm1 !== 'DELETE') {
            App.showToast('Account deletion cancelled', 'info');
            return;
        }
        
        App.showLoading();
        
        try {
            // Mark as deleted (soft delete)
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                isDeleted: true,
                deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                displayName: 'Deleted User',
                username: `deleted_${Date.now()}`,
                photoURL: null,
                bio: '',
                email: ''
            });
            
            await auth.currentUser.delete();
            App.showToast('Account deleted', 'info');
            
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                App.showToast('Please log out and log back in first', 'warning');
            } else {
                App.showToast('Error deleting account', 'error');
            }
        }
        
        App.hideLoading();
    }
};