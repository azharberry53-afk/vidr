/* ============================================
   VIDR APP - Main Controller
   ============================================ */

const App = {
    currentUser: null,
    currentPage: 'home',
    isAdmin: false,
    isModerator: false,
    clearDisplayMode: false,
    scrollPositions: {},
    
    /* ==================
       INITIALIZATION
       ================== */
    
    async init() {
        console.log('🚀 Vidr App initializing...');
        
        // Auth state listener
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.loadUserData(user.uid);
                this.showMainApp();
                this.initializeFeatures();
            } else {
                this.showLoginScreen();
            }
            this.hideSplash();
        });
        
        // Register service worker
        this.registerSW();
        
        // Initialize touch handlers
        this.initTouchHandlers();
        
        // Check for daily reward
        setTimeout(() => this.checkDailyReward(), 2000);
    },
    
    /* ==================
       USER DATA
       ================== */
    
    async loadUserData(uid) {
        try {
            const userDoc = await db.collection(Collections.USERS).doc(uid).get();
            
            if (userDoc.exists) {
                this.currentUser = { uid, ...userDoc.data() };
            } else {
                // New user - create profile
                const user = auth.currentUser;
                const newUser = {
                    uid: uid,
                    username: user.displayName?.toLowerCase().replace(/\s/g, '') || `user${Date.now().toString(36)}`,
                    displayName: user.displayName || 'New User',
                    email: user.email,
                    photoURL: user.photoURL || null,
                    coverURL: null,
                    bio: '',
                    level: 1,
                    xp: 0,
                    freeCoins: 50, // Welcome bonus
                    goldCoins: 0,
                    followers: 0,
                    following: 0,
                    likes: 0,
                    totalPosts: 0,
                    role: 'user', // user, moderator, admin
                    isVerified: false,
                    isBanned: false,
                    isSuspended: false,
                    isPrivate: false,
                    isBot: false,
                    titles: [],
                    selectedTitle: null,
                    achievements: [],
                    selectedAchievements: [],
                    profileBanner: null,
                    animatedAvatar: false,
                    animatedCover: false,
                    animatedUsername: false,
                    xpBoostActive: false,
                    xpBoostExpiry: null,
                    freeBoostsRemaining: 0,
                    verifiedExpiry: null,
                    lastDailyReward: null,
                    lastSpinAds: 0,
                    mutualFriends: [],
                    blockedUsers: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    settings: {
                        darkMode: false,
                        notifications: true,
                        privateAccount: false
                    }
                };
                
                await db.collection(Collections.USERS).doc(uid).set(newUser);
                this.currentUser = { uid, ...newUser };
                
                // Add welcome achievement
                await this.grantAchievement('welcome', 1);
                
                App.showToast('Welcome to Vidr! 🎉', 'success');
            }
            
            // Set roles
            this.isAdmin = this.currentUser.role === 'admin';
            this.isModerator = this.currentUser.role === 'moderator';
            
            // Update last active
            db.collection(Collections.USERS).doc(uid).update({
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update nav avatar
            if (this.currentUser.photoURL) {
                document.getElementById('nav-avatar-img').src = this.currentUser.photoURL;
            }
            
            // Check XP boost expiry
            this.checkXPBoost();
            
            // Check verified expiry
            this.checkVerifiedStatus();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            App.showToast('Error loading profile', 'error');
        }
    },
    
    /* ==================
       SCREEN MANAGEMENT
       ================== */
    
    hideSplash() {
        const splash = document.getElementById('splash-screen');
        setTimeout(() => {
            splash.classList.add('hide');
            setTimeout(() => splash.style.display = 'none', 500);
        }, 2000);
    },
    
    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('register-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'none';
    },
    
    showMainApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('register-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Load initial feed
        Feed.loadForYou();
        
        // Initialize ads
        Ads.init();
        
        // Listen for notifications
        Notifications.listen();
    },
    
    /* ==================
       NAVIGATION
       ================== */
    
    navigate(page) {
        // Save scroll position
        this.scrollPositions[this.currentPage] = window.scrollY;
        
        // Update nav buttons
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
        
        // Hide all pages
        document.getElementById('feed-container').style.display = 'none';
        document.getElementById('discover-page').style.display = 'none';
        document.getElementById('chat-page').style.display = 'none';
        document.getElementById('profile-page').style.display = 'none';
        
        // Show header or not
        const header = document.getElementById('top-header');
        
        switch(page) {
            case 'home':
                document.getElementById('feed-container').style.display = 'block';
                header.style.display = 'flex';
                break;
            case 'discover':
                document.getElementById('discover-page').style.display = 'block';
                header.style.display = 'none';
                Discover.load();
                break;
            case 'chat':
                document.getElementById('chat-page').style.display = 'block';
                header.style.display = 'none';
                Chat.loadChats();
                break;
            case 'profile':
                document.getElementById('profile-page').style.display = 'block';
                header.style.display = 'none';
                Profile.loadMyProfile();
                break;
        }
        
        this.currentPage = page;
    },
    
    /* ==================
       OVERLAYS & MODALS
       ================== */
    
    openSearch() {
        document.getElementById('search-overlay').style.display = 'block';
        setTimeout(() => {
            document.getElementById('search-input').focus();
        }, 300);
    },
    
    openNotifications() {
        document.getElementById('notifications-overlay').style.display = 'block';
        Notifications.load();
    },
    
    openCreateModal() {
        document.getElementById('create-modal').style.display = 'flex';
    },
    
    closeCreateModal() {
        document.getElementById('create-modal').style.display = 'none';
    },
    
    closeOverlay(id) {
        const overlay = document.getElementById(id);
        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('closing');
        }, 300);
    },
    
    closeModal(id) {
        document.getElementById(id).style.display = 'none';
    },
    
    /* ==================
       SEARCH
       ================== */
    
    searchTimeout: null,
    
    async searchUsers(query) {
        clearTimeout(this.searchTimeout);
        
        if (!query.trim()) {
            document.getElementById('search-results').innerHTML = `
                <div class="search-placeholder">
                    <i class="fas fa-search"></i>
                    <p>Search for users</p>
                </div>
            `;
            return;
        }
        
        this.searchTimeout = setTimeout(async () => {
            try {
                const queryLower = query.toLowerCase();
                const snapshot = await db.collection(Collections.USERS)
                    .where('username', '>=', queryLower)
                    .where('username', '<=', queryLower + '\uf8ff')
                    .limit(20)
                    .get();
                
                let html = '';
                snapshot.forEach(doc => {
                    const user = doc.data();
                    // Hide admin from search results
                    if (user.role === 'admin' && !this.isAdmin) return;
                    if (user.isBot && !this.isAdmin) return;
                    
                    html += this.renderSearchResult(user);
                });
                
                if (!html) {
                    html = '<div class="search-placeholder"><p>No users found</p></div>';
                }
                
                document.getElementById('search-results').innerHTML = html;
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    },
    
    renderSearchResult(user) {
        const verifiedBadge = user.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
        const glowClass = (user.isVerified || user.role === 'admin') ? 'glow' : '';
        
        return `
            <div class="search-result-item" onclick="Profile.viewProfile('${user.uid}')">
                <img src="${user.photoURL || 'assets/icons/default-avatar.png'}" class="search-result-avatar" loading="lazy">
                <div class="search-result-info">
                    <div class="search-result-name">
                        <span class="${glowClass}">${this.escapeHtml(user.displayName)}</span>
                        ${verifiedBadge}
                    </div>
                    <div class="search-result-username">@${this.escapeHtml(user.username)}</div>
                </div>
            </div>
        `;
    },
    
    /* ==================
       CLEAR DISPLAY
       ================== */
    
    toggleClearDisplay() {
        this.clearDisplayMode = !this.clearDisplayMode;
        document.getElementById('feed-container').classList.toggle('clear-display', this.clearDisplayMode);
        document.getElementById('top-header').classList.toggle('hidden', this.clearDisplayMode);
        document.getElementById('bottom-nav').classList.toggle('hidden', this.clearDisplayMode);
    },
    
    /* ==================
       TOUCH HANDLERS
       ================== */
    
    initTouchHandlers() {
        let touchStartY = 0;
        let touchStartX = 0;
        
        // Long press for clear display
        let longPressTimer;
        const feedContainer = document.getElementById('feed-container');
        
        if (feedContainer) {
            feedContainer.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
                
                longPressTimer = setTimeout(() => {
                    this.toggleClearDisplay();
                }, 800);
            }, { passive: true });
            
            feedContainer.addEventListener('touchmove', () => {
                clearTimeout(longPressTimer);
            }, { passive: true });
            
            feedContainer.addEventListener('touchend', () => {
                clearTimeout(longPressTimer);
            }, { passive: true });
        }
        
        // Pull to refresh
        let pullStartY = 0;
        let isPulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                pullStartY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (isPulling) {
                const pullDistance = e.changedTouches[0].clientY - pullStartY;
                if (pullDistance > 80) {
                    this.refreshCurrentPage();
                }
                isPulling = false;
            }
        }, { passive: true });
    },
    
    refreshCurrentPage() {
        switch(this.currentPage) {
            case 'home':
                Feed.refresh();
                break;
            case 'discover':
                Discover.load();
                break;
            case 'chat':
                Chat.loadChats();
                break;
            case 'profile':
                Profile.loadMyProfile();
                break;
        }
        this.showToast('Refreshed! ✨', 'success');
    },
    
    /* ==================
       DAILY REWARD
       ================== */
    
    async checkDailyReward() {
        if (!this.currentUser) return;
        
        const lastReward = this.currentUser.lastDailyReward;
        const now = new Date();
        
        if (!lastReward || this.isNewDay(lastReward.toDate ? lastReward.toDate() : new Date(lastReward), now)) {
            document.getElementById('daily-reward-modal').style.display = 'flex';
        }
    },
    
    isNewDay(date1, date2) {
        return date1.getDate() !== date2.getDate() || 
               date1.getMonth() !== date2.getMonth() || 
               date1.getFullYear() !== date2.getFullYear();
    },
    
    /* ==================
       XP SYSTEM
       ================== */
    
    async addXP(amount, source) {
        if (!this.currentUser) return;
        
        let xpAmount = amount;
        
        // Check XP boost
        if (this.currentUser.xpBoostActive) {
            xpAmount *= 2;
        }
        
        // Slow XP gain by default
        xpAmount = Math.ceil(xpAmount * 0.3);
        
        const currentXP = this.currentUser.xp + xpAmount;
        const maxLevel = 10000;
        const xpPerLevel = 100 + (this.currentUser.level * 10); // Increasing XP requirement
        
        let newLevel = this.currentUser.level;
        let remainingXP = currentXP;
        
        while (remainingXP >= xpPerLevel && newLevel < maxLevel) {
            remainingXP -= xpPerLevel;
            newLevel++;
        }
        
        if (newLevel > this.currentUser.level) {
            this.showToast(`🎉 Level Up! Level ${newLevel}`, 'success');
        }
        
        await db.collection(Collections.USERS).doc(this.currentUser.uid).update({
            xp: remainingXP,
            level: newLevel
        });
        
        this.currentUser.xp = remainingXP;
        this.currentUser.level = newLevel;
    },
    
    checkXPBoost() {
        if (this.currentUser.xpBoostActive && this.currentUser.xpBoostExpiry) {
            const expiry = this.currentUser.xpBoostExpiry.toDate ? this.currentUser.xpBoostExpiry.toDate() : new Date(this.currentUser.xpBoostExpiry);
            if (new Date() > expiry) {
                db.collection(Collections.USERS).doc(this.currentUser.uid).update({
                    xpBoostActive: false,
                    xpBoostExpiry: null
                });
                this.currentUser.xpBoostActive = false;
            }
        }
    },
    
    checkVerifiedStatus() {
        if (this.currentUser.isVerified && this.currentUser.verifiedExpiry) {
            const expiry = this.currentUser.verifiedExpiry.toDate ? this.currentUser.verifiedExpiry.toDate() : new Date(this.currentUser.verifiedExpiry);
            if (new Date() > expiry) {
                db.collection(Collections.USERS).doc(this.currentUser.uid).update({
                    isVerified: false,
                    verifiedExpiry: null,
                    animatedAvatar: false,
                    animatedCover: false,
                    animatedUsername: false,
                    freeBoostsRemaining: 0
                });
                this.currentUser.isVerified = false;
            }
        }
    },
    
    /* ==================
       ACHIEVEMENTS
       ================== */
    
    async grantAchievement(achievementId, progress) {
        if (!this.currentUser) return;
        
        const achievementRef = db.collection(Collections.USERS).doc(this.currentUser.uid)
            .collection('achievements').doc(achievementId);
        
        const doc = await achievementRef.get();
        let currentLevel = 0;
        let currentProgress = 0;
        
        if (doc.exists) {
            currentLevel = doc.data().level || 0;
            currentProgress = doc.data().progress || 0;
        }
        
        const maxLevel = 100;
        if (currentLevel >= maxLevel) return;
        
        currentProgress += progress;
        
        const achievementData = this.getAchievementData(achievementId);
        const requiredProgress = achievementData.progressPerLevel * (currentLevel + 1);
        
        let newLevel = currentLevel;
        while (currentProgress >= requiredProgress && newLevel < maxLevel) {
            currentProgress -= requiredProgress;
            newLevel++;
        }
        
        if (newLevel > currentLevel) {
            const glowEffect = newLevel >= 5;
            const goldGlowEffect = newLevel >= 100;
            
            this.showToast(`🏆 Achievement Unlocked: ${achievementData.name} Lv.${newLevel}`, 'success');
        }
        
        await achievementRef.set({
            id: achievementId,
            name: achievementData.name,
            icon: achievementData.icon,
            level: newLevel,
            progress: currentProgress,
            maxLevel: maxLevel,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },
    
    getAchievementData(id) {
        const achievements = {
            welcome: { name: 'Welcome', icon: '👋', progressPerLevel: 1, desc: 'Join Vidr' },
            first_post: { name: 'Creator', icon: '🎬', progressPerLevel: 5, desc: 'Create posts' },
            first_like: { name: 'Appreciator', icon: '❤️', progressPerLevel: 10, desc: 'Like posts' },
            first_comment: { name: 'Commenter', icon: '💬', progressPerLevel: 10, desc: 'Comment on posts' },
            first_follow: { name: 'Social', icon: '👥', progressPerLevel: 5, desc: 'Follow users' },
            first_share: { name: 'Sharer', icon: '📤', progressPerLevel: 5, desc: 'Share posts' },
            streamer: { name: 'Streamer', icon: '📺', progressPerLevel: 3, desc: 'Go live' },
            gifter: { name: 'Generous', icon: '🎁', progressPerLevel: 10, desc: 'Send gifts' },
            earner: { name: 'Earner', icon: '💰', progressPerLevel: 100, desc: 'Earn coins' },
            gamer: { name: 'Gamer', icon: '🎮', progressPerLevel: 10, desc: 'Play games' },
            daily_login: { name: 'Dedicated', icon: '📅', progressPerLevel: 1, desc: 'Daily login' },
            level_master: { name: 'Level Master', icon: '⭐', progressPerLevel: 100, desc: 'Gain levels' },
            popular: { name: 'Popular', icon: '🔥', progressPerLevel: 50, desc: 'Get followers' },
            viral: { name: 'Viral', icon: '🚀', progressPerLevel: 100, desc: 'Get likes on posts' },
            chatter: { name: 'Chatter', icon: '💭', progressPerLevel: 20, desc: 'Send messages' },
            shopper: { name: 'Shopper', icon: '🛍️', progressPerLevel: 5, desc: 'Buy items' },
            seller: { name: 'Seller', icon: '💼', progressPerLevel: 5, desc: 'Sell items' },
            adventurer: { name: 'Adventurer', icon: '🗺️', progressPerLevel: 20, desc: 'Explore features' },
            collector: { name: 'Collector', icon: '🏅', progressPerLevel: 5, desc: 'Collect achievements' },
            winner: { name: 'Winner', icon: '🏆', progressPerLevel: 10, desc: 'Win games' }
        };
        return achievements[id] || { name: 'Unknown', icon: '❓', progressPerLevel: 1, desc: '' };
    },
    
    /* ==================
       PAID REWARD CHANCE
       ================== */
    
    rollPaidReward() {
        // 0.0000001% chance = 1 in 1,000,000,000
        const roll = Math.random();
        return roll < 0.000000001; // 0.0000001%
    },
    
    /* ==================
       TOAST NOTIFICATIONS
       ================== */
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const icons = {
            success: '<i class="fas fa-check-circle" style="color: var(--success)"></i>',
            error: '<i class="fas fa-times-circle" style="color: var(--danger)"></i>',
            warning: '<i class="fas fa-exclamation-triangle" style="color: var(--warning)"></i>',
            info: '<i class="fas fa-info-circle" style="color: var(--primary)"></i>'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    },
    
    /* ==================
       LOADING
       ================== */
    
    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    },
    
    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    },
    
    /* ==================
       UTILITIES
       ================== */
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
    },
    
    timeAgo(date) {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);
        
        if (seconds < 60) return 'now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';
        if (seconds < 2592000) return Math.floor(seconds / 604800) + 'w';
        return Math.floor(seconds / 2592000) + 'mo';
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },
    
    /* ==================
       SERVICE WORKER
       ================== */
    
    async registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered');
            } catch (err) {
                console.warn('SW registration failed:', err);
            }
        }
    },
    
    /* ==================
       FEATURE INIT
       ================== */
    
    initializeFeatures() {
   this.updateCoinDisplay();
    this.listenToUserUpdates();
        // Update coin balances
        this.updateCoinDisplay();
        
        // Initialize real-time listeners
        this.listenToUserUpdates();
Friends.listenToRequests(); // ← Add this
    },
    
    updateCoinDisplay() {
        const freeEl = document.getElementById('free-coins-balance');
        const goldEl = document.getElementById('gold-coins-balance');
        if (freeEl) freeEl.textContent = this.formatNumber(this.currentUser?.freeCoins || 0);
        if (goldEl) goldEl.textContent = this.formatNumber(this.currentUser?.goldCoins || 0);
    },
    
    listenToUserUpdates() {
        if (!this.currentUser) return;
        
        db.collection(Collections.USERS).doc(this.currentUser.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const oldCoins = this.currentUser.freeCoins;
                    this.currentUser = { uid: doc.id, ...doc.data() };
                    this.updateCoinDisplay();
                    
                    if (this.currentUser.freeCoins > oldCoins) {
                        // Coins received animation could go here
                    }
                }
            });
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => App.init());