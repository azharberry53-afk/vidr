/* ============================================
   PROFILE MODULE
   ============================================ */

const Profile = {
    currentProfileUid: null,
    myPostsListener: null,
    
    /* ==================
       LOAD MY PROFILE
       ================== */
    
    async loadMyProfile() {
        if (!App.currentUser) return;
        this.currentProfileUid = App.currentUser.uid;
        await this.renderProfile(App.currentUser, true);
    },
    
    /* ==================
       VIEW OTHER PROFILE
       ================== */
    
    async viewProfile(uid) {
        if (!uid) return;
        
        // If viewing own profile
        if (uid === App.currentUser?.uid) {
            App.navigate('profile');
            return;
        }
        
        App.showLoading();
        
        try {
            const userDoc = await db.collection(Collections.USERS).doc(uid).get();
            if (!userDoc.exists) {
                App.showToast('User not found', 'error');
                App.hideLoading();
                return;
            }
            
            const userData = { uid, ...userDoc.data() };
            
            // Check if blocked
            if (App.currentUser?.blockedUsers?.includes(uid)) {
                App.showToast('You have blocked this user', 'warning');
                App.hideLoading();
                return;
            }
            
            if (userData.blockedUsers?.includes(App.currentUser?.uid)) {
                App.showToast('Cannot view this profile', 'warning');
                App.hideLoading();
                return;
            }
            
            // Check banned status
            if (userData.isBanned) {
                App.showToast('This account is banned', 'warning');
                App.hideLoading();
                return;
            }
            
            this.currentProfileUid = uid;
            
            const overlay = document.getElementById('view-profile-overlay');
            overlay.style.display = 'block';
            
            await this.renderProfile(userData, false);
            
        } catch (error) {
            console.error('View profile error:', error);
            App.showToast('Error loading profile', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       RENDER PROFILE
       ================== */
    
    async renderProfile(userData, isMyProfile) {
        const container = isMyProfile 
            ? document.getElementById('profile-page')
            : document.getElementById('view-profile-overlay');
        
        const isAdmin = userData.role === 'admin';
        const isMod = userData.role === 'moderator';
        const isVerified = userData.isVerified;
        const isOwnAdmin = App.isAdmin;
        
        // Animated effects
        const hasGlowName = isVerified || isAdmin;
        const hasGlowBorder = isVerified || isAdmin;
        const hasAnimatedCover = isVerified || isAdmin;
        
        // Get follow status
        let isFollowing = false;
        let isMutual = false;
        if (!isMyProfile && App.currentUser) {
            isFollowing = await Feed.checkFollowing(userData.uid);
            const theyFollowYou = await this.checkIfFollows(userData.uid, App.currentUser.uid);
            isMutual = isFollowing && theyFollowYou;
        }
        
        // Get selected achievements
        const achievements = await this.getUserAchievements(userData.uid, userData.selectedAchievements || []);
        
        // Level info
        const levelInfo = this.getLevelTitle(userData.level || 1);
        const xpProgress = this.getXPProgress(userData.xp || 0, userData.level || 1);
        
        // Check if private
        const canViewContent = !userData.isPrivate || isMyProfile || isFollowing || isOwnAdmin;
        
        // Tags for admin/mod
        let roleTag = '';
        if (isAdmin) roleTag = '<span class="user-tag admin">ADMIN</span>';
        else if (isMod) roleTag = '<span class="user-tag moderator">MOD</span>';
        
        // Verified badge
        const verifiedBadge = isVerified || isAdmin 
            ? '<i class="fas fa-check-circle" style="color:var(--accent);filter:drop-shadow(0 0 4px rgba(129,140,248,0.6))"></i>' 
            : '';
        
        // Titles
        const titleHtml = userData.selectedTitle 
            ? `<span class="title-badge ${this.getTitleRarity(userData.selectedTitle)}">${userData.selectedTitle}</span>` 
            : '';
        
        // XP Boost indicator
        const boostHtml = userData.xpBoostActive 
            ? '<span class="xp-boost-active">⚡ 2x XP</span>' 
            : '';
        
        const html = `
            <!-- Profile Header -->
            <div class="profile-header-container" style="position:relative;">
                <!-- Back Button (for viewed profiles) -->
                ${!isMyProfile ? `
                <button class="profile-back-btn" onclick="App.closeOverlay('view-profile-overlay')">
                    <i class="fas fa-arrow-left"></i>
                </button>
                ` : ''}
                
                <!-- Cover Banner -->
                <div class="profile-cover ${hasAnimatedCover ? 'animated-cover' : ''}" 
                     id="profile-cover-${userData.uid}"
                     style="background: ${userData.coverURL ? 'none' : 'var(--gradient-primary)'}">
                    ${userData.coverURL 
                        ? `<img src="${userData.coverURL}" class="profile-cover-img" loading="lazy">`
                        : ''}
                    ${isMyProfile ? `
                    <button class="cover-edit-btn" onclick="Profile.editCover()">
                        <i class="fas fa-camera"></i>
                    </button>
                    ` : ''}
                </div>
                
                <!-- Profile Photo -->
                <div class="profile-avatar-wrapper">
                    <div class="profile-avatar-ring ${hasGlowBorder ? 'verified-glow-border' : ''}">
                        <img src="${userData.photoURL || 'assets/icons/default-avatar.png'}" 
                             class="profile-avatar ${userData.animatedAvatar ? 'animated-avatar' : ''}"
                             id="profile-avatar-${userData.uid}"
                             loading="lazy">
                        ${isMyProfile ? `
                        <button class="avatar-edit-btn" onclick="Profile.editAvatar()">
                            <i class="fas fa-camera"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Profile Info -->
            <div class="profile-info-section">
                <!-- Name & Badges -->
                <div class="profile-name-row">
                    <h2 class="profile-display-name ${hasGlowName ? 'glow-name' : ''}">
                        ${App.escapeHtml(userData.displayName || 'User')}
                    </h2>
                    ${verifiedBadge}
                    ${roleTag}
                </div>
                
                <p class="profile-username">@${App.escapeHtml(userData.username || 'user')}</p>
                
                <!-- Level & Title Row -->
                <div class="profile-level-row">
                    ${boostHtml}
                    <div class="level-badge">
                        <span class="level-icon">⭐</span>
                        Lv.${userData.level || 1} ${levelInfo.title}
                    </div>
                    ${titleHtml}
                </div>
                
                <!-- XP Bar -->
                <div class="xp-bar-wrapper">
                    <div class="xp-bar">
                        <div class="xp-bar-fill" style="width: ${xpProgress}%"></div>
                    </div>
                    <span class="xp-text">${userData.xp || 0} XP</span>
                </div>
                
                <!-- Achievements Row (up to 3) -->
                ${achievements.length > 0 ? `
                <div class="profile-achievements-row">
                    ${achievements.slice(0, 3).map(ach => `
                        <div class="profile-achievement-badge ${ach.level >= 100 ? 'gold-glow' : ach.level >= 5 ? 'glow-effect' : ''}" 
                             title="${ach.name} Lv.${ach.level}">
                            <span class="ach-icon">${ach.icon}</span>
                            <span class="ach-level">Lv.${ach.level}</span>
                        </div>
                    `).join('')}
                    ${isMyProfile ? `<button class="edit-ach-btn" onclick="Profile.editAchievements()">✏️</button>` : ''}
                </div>
                ` : isMyProfile ? `
                <div class="profile-achievements-row">
                    <button class="add-ach-btn" onclick="Profile.editAchievements()">+ Add Achievements</button>
                </div>
                ` : ''}
                
                <!-- Stats -->
                <div class="profile-stats">
                    <div class="stat-item" onclick="Profile.viewFollowing('${userData.uid}')">
                        <h3 class="stat-number">${App.formatNumber(userData.following || 0)}</h3>
                        <p class="stat-label">Following</p>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item" onclick="Profile.viewFollowers('${userData.uid}')">
                        <h3 class="stat-number">${App.formatNumber(userData.followers || 0)}</h3>
                        <p class="stat-label">Followers</p>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <h3 class="stat-number">${App.formatNumber(userData.likes || 0)}</h3>
                        <p class="stat-label">Likes</p>
                    </div>
                </div>
                
                <!-- Bio -->
                ${userData.bio ? `
                <p class="profile-bio">${App.escapeHtml(userData.bio)}</p>
                ` : isMyProfile ? `
                <button class="add-bio-btn" onclick="Profile.editBio()">+ Add bio</button>
                ` : ''}
                
                <!-- Mutual Friends -->
                ${isMutual ? `
                <div class="mutual-badge">
                    <i class="fas fa-handshake"></i> Mutual Friends
                </div>
                ` : ''}
                
                <!-- Action Buttons -->
                <div class="profile-actions">
                    ${isMyProfile ? `
                    <button class="btn btn-secondary profile-action-btn" onclick="Profile.openEditProfile()">
                        <i class="fas fa-edit"></i> Edit Profile
                    </button>
                    <button class="btn btn-secondary profile-action-btn" onclick="Wallet.open()">
                        💰 Wallet
                    </button>
                    ${!isVerified ? `
                    <button class="btn btn-primary profile-action-btn glow-btn" onclick="App.closeModal('verified-modal');document.getElementById('verified-modal').style.display='flex'">
                        ✨ Get Verified
                    </button>
                    ` : ''}
                    ${isAdmin ? `
                    <button class="btn btn-danger profile-action-btn" onclick="document.getElementById('admin-panel').style.display='block'">
                        ⚙️ Admin Panel
                    </button>
                    ` : ''}
                    ` : `
                    <!-- Other user actions -->
                 async renderActionButtons(userData, isFollowing) {
    const displayName = App.escapeHtml(userData.displayName || '').replace(/'/g, "\\'");
    const photoURL = (userData.photoURL || '').replace(/'/g, "\\'");
    const uid = userData.uid;
    
    return `
        ${friendBtnHtml}
        <button class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} 
                profile-action-btn" 
                id="follow-btn-${userData.uid}"
                onclick="Profile.toggleFollow('${userData.uid}', this)">
            ${isFollowing ? 'Following' : 'Follow'}
        </button>
           <button onclick="Chat.openWithUser('${uid}', '${displayName}', '${photoURL}')">
            <i class="fas fa-comment"></i>
        </button>
        <button class="btn btn-secondary profile-action-btn" 
                onclick="Profile.moreOptions('${userData.uid}')">
            <i class="fas fa-ellipsis-v"></i>
        </button>
    `;
},
                    <button class="btn btn-secondary profile-action-btn" 
                            onclick="Chat.openWithUser('${userData.uid}', '${App.escapeHtml(userData.displayName)}', '${userData.photoURL || ''}')">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="btn btn-secondary profile-action-btn" onclick="Profile.moreOptions('${userData.uid}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    `}
                </div>
                
                <!-- Mini Games & Leaderboard (My Profile) -->
                ${isMyProfile ? `
                <div class="profile-quick-btns">
                    <button class="quick-btn" onclick="document.getElementById('games-page').style.display='block'; Games.init()">
                        🎮 Mini Games
                    </button>
                    <button class="quick-btn" onclick="document.getElementById('leaderboard-page').style.display='block'; Leaderboard.load()">
                        🏆 Leaderboard
                    </button>
                    <button class="quick-btn" onclick="document.getElementById('xp-boost-modal').style.display='flex'">
                        ⚡ XP Boost
                    </button>
<button class="quick-btn" 
         onclick="Friends.openRequestsPage()">
    👥 Friends
</button>
                    ${isAdmin ? `
                    <button class="quick-btn" onclick="document.getElementById('admin-panel').style.display='block'">
                        ⚙️ Admin
                    </button>
                    ` : ''}
                </div>
                ` : ''}
                
                <!-- Content Tabs -->
                <div class="profile-content-tabs">
                    <button class="profile-tab active" data-tab="posts" onclick="Profile.switchContentTab('posts', '${userData.uid}', this)">
                        <i class="fas fa-grid-2"></i> Posts
                    </button>
                    ${isMyProfile ? `
                    <button class="profile-tab" data-tab="liked" onclick="Profile.switchContentTab('liked', '${userData.uid}', this)">
                        <i class="fas fa-heart"></i> Liked
                    </button>
                    ` : ''}
                    ${(isVerified || isAdmin) ? `
                    <button class="profile-tab" data-tab="shop" onclick="Profile.switchContentTab('shop', '${userData.uid}', this)">
                        <i class="fas fa-shopping-bag"></i> Shop
                    </button>
                    ` : ''}
                </div>
                
                <!-- Content Grid -->
                ${canViewContent ? `
                <div class="profile-content-grid" id="profile-grid-${userData.uid}">
                    <div style="text-align:center; padding:40px; color:var(--text-tertiary);">
                        <div class="spinner"></div>
                    </div>
                </div>
                ` : `
                <div class="private-account-notice">
                    <i class="fas fa-lock"></i>
                    <h3>This account is private</h3>
                    <p>Follow to see their posts</p>
                </div>
                `}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Apply profile-specific styles
        this.applyProfileStyles(container);
        
        // Load posts if can view
        if (canViewContent) {
            await this.loadUserPosts(userData.uid, 'posts');
        }
    },
    
    /* ==================
       PROFILE STYLES
       ================== */
    
    applyProfileStyles(container) {
        // Add profile-specific styles if not already added
        if (!document.getElementById('profile-styles')) {
            const style = document.createElement('style');
            style.id = 'profile-styles';
            style.textContent = `
                .profile-header-container {
                    position: relative;
                    margin-bottom: 0;
                }
                
                .profile-back-btn {
                    position: absolute;
                    top: calc(12px + var(--safe-area-top));
                    left: 12px;
                    z-index: 20;
                    width: 36px;
                    height: 36px;
                    background: rgba(0,0,0,0.4);
                    color: white;
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                    font-size: 1rem;
                }
                
                .profile-cover {
                    width: 100%;
                    height: 160px;
                    background: var(--gradient-primary);
                    position: relative;
                    overflow: hidden;
                }
                
                .profile-cover-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .cover-edit-btn {
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    width: 32px;
                    height: 32px;
                    background: rgba(0,0,0,0.5);
                    color: white;
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                    font-size: 0.85rem;
                }
                
                .profile-avatar-wrapper {
                    padding: 0 16px;
                    margin-top: -44px;
                    position: relative;
                    z-index: 10;
                }
                
                .profile-avatar-ring {
                    width: 88px;
                    height: 88px;
                    border-radius: var(--radius-full);
                    padding: 3px;
                    background: var(--bg-primary);
                    position: relative;
                    display: inline-block;
                }
                
                .profile-avatar-ring.verified-glow-border {
                    background: none;
                    padding: 4px;
                    background: linear-gradient(var(--bg-primary), var(--bg-primary)) padding-box,
                                var(--gradient-primary) border-box;
                    border: 3px solid transparent;
                    animation: borderGlow 2s ease-in-out infinite;
                }
                
                .profile-avatar {
                    width: 100%;
                    height: 100%;
                    border-radius: var(--radius-full);
                    object-fit: cover;
                    border: 3px solid var(--bg-primary);
                }
                
                .avatar-edit-btn {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 26px;
                    height: 26px;
                    background: var(--primary);
                    color: white;
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    border: 2px solid var(--bg-primary);
                }
                
                .profile-info-section {
                    padding: 12px 16px 80px;
                }
                
                .profile-name-row {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 2px;
                    flex-wrap: wrap;
                }
                
                .profile-display-name {
                    font-family: var(--font-display);
                    font-size: 1.35rem;
                    font-weight: 800;
                }
                
                .profile-display-name.glow-name {
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: textGlow 2s ease-in-out infinite;
                }
                
                .profile-username {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    margin-bottom: 8px;
                }
                
                .profile-level-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 8px;
                }
                
                .xp-bar-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                
                .xp-text {
                    font-size: 0.72rem;
                    color: var(--text-tertiary);
                    white-space: nowrap;
                }
                
                .profile-achievements-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }
                
                .profile-achievement-badge {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border-color);
                    cursor: pointer;
                }
                
                .profile-achievement-badge.glow-effect {
                    box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.3);
                    border-color: var(--primary-light);
                    animation: achievementGlow 2s ease-in-out infinite;
                }
                
                .profile-achievement-badge.gold-glow {
                    background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.1));
                    border-color: #f59e0b;
                    box-shadow: 0 0 10px rgba(245,158,11,0.3);
                    animation: goldGlow 2s ease-in-out infinite;
                }
                
                .ach-icon { font-size: 1rem; }
                .ach-level { font-size: 0.7rem; font-weight: 700; color: var(--primary); }
                
                .edit-ach-btn, .add-ach-btn {
                    padding: 4px 10px;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    color: var(--primary);
                    background: rgba(var(--primary-rgb), 0.08);
                    border: 1px dashed var(--primary-light);
                }
                
                .profile-stats {
                    display: flex;
                    align-items: center;
                    gap: 0;
                    padding: 16px 0;
                    border-top: 1px solid var(--border-light);
                    border-bottom: 1px solid var(--border-light);
                    margin-bottom: 12px;
                }
                
                .stat-item {
                    flex: 1;
                    text-align: center;
                    cursor: pointer;
                    padding: 4px 0;
                }
                
                .stat-number {
                    font-family: var(--font-display);
                    font-size: 1.2rem;
                    font-weight: 800;
                }
                
                .stat-label {
                    color: var(--text-secondary);
                    font-size: 0.78rem;
                    margin-top: 2px;
                }
                
                .stat-divider {
                    width: 1px;
                    height: 32px;
                    background: var(--border-light);
                }
                
                .profile-bio {
                    font-size: 0.9rem;
                    line-height: 1.5;
                    color: var(--text-primary);
                    margin-bottom: 12px;
                    word-break: break-word;
                }
                
                .add-bio-btn {
                    color: var(--primary);
                    font-size: 0.85rem;
                    padding: 4px 0;
                    margin-bottom: 12px;
                }
                
                .mutual-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    background: rgba(var(--primary-rgb), 0.1);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                    font-size: 0.78rem;
                    font-weight: 600;
                    margin-bottom: 12px;
                }
                
                .profile-actions {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }
                
                .profile-action-btn {
                    flex: 1;
                    min-width: 80px;
                    padding: 10px 12px;
                    font-size: 0.85rem;
                }
                
                .profile-quick-btns {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 4px;
                    margin-bottom: 16px;
                }
                
                .profile-quick-btns::-webkit-scrollbar { display: none; }
                
                .quick-btn {
                    padding: 8px 14px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-full);
                    font-size: 0.78rem;
                    font-weight: 600;
                    white-space: nowrap;
                    color: var(--text-primary);
                    transition: all var(--transition-fast);
                }
                
                .quick-btn:active {
                    background: rgba(var(--primary-rgb), 0.08);
                    border-color: var(--primary-light);
                }
                
                .profile-content-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--border-light);
                    margin-bottom: 12px;
                }
                
                .profile-tab {
                    flex: 1;
                    padding: 12px 8px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    border-bottom: 2px solid transparent;
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                }
                
                .profile-tab.active {
                    color: var(--primary);
                    border-bottom-color: var(--primary);
                }
                
                .profile-content-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 2px;
                }
                
                .profile-post-thumb {
                    aspect-ratio: 1;
                    position: relative;
                    overflow: hidden;
                    cursor: pointer;
                    background: var(--bg-tertiary);
                }
                
                .profile-post-thumb img,
                .profile-post-thumb video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform var(--transition-normal);
                }
                
                .profile-post-thumb:active img,
                .profile-post-thumb:active video {
                    transform: scale(0.95);
                }
                
                .post-thumb-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity var(--transition-fast);
                    color: white;
                    font-size: 0.8rem;
                    gap: 8px;
                }
                
                .profile-post-thumb:hover .post-thumb-overlay {
                    opacity: 1;
                }
                
                .video-indicator {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    color: white;
                    font-size: 0.7rem;
                    background: rgba(0,0,0,0.5);
                    padding: 2px 4px;
                    border-radius: 4px;
                }
                
                .private-account-notice {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary);
                }
                
                .private-account-notice i {
                    font-size: 3rem;
                    margin-bottom: 16px;
                    color: var(--primary-light);
                }
                
                .private-account-notice h3 {
                    font-size: 1.1rem;
                    margin-bottom: 6px;
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    /* ==================
       LOAD USER POSTS
       ================== */
    
    async loadUserPosts(uid, tab) {
        const gridEl = document.getElementById(`profile-grid-${uid}`);
        if (!gridEl) return;
        
        gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="spinner"></div></div>';
        
        try {
            let query = db.collection(Collections.POSTS)
                .where('userId', '==', uid)
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc');
            
            if (tab === 'liked') {
                const likedSnapshot = await db.collection(Collections.POSTS)
                    .where('likedBy', 'array-contains', uid)
                    .orderBy('createdAt', 'desc')
                    .limit(30)
                    .get();
                
                const posts = likedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                gridEl.innerHTML = this.renderPostGrid(posts);
                return;
            }
            
            if (tab === 'shop') {
                const productsSnapshot = await db.collection(Collections.PRODUCTS)
                    .where('sellerId', '==', uid)
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .get();
                
                const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                gridEl.innerHTML = this.renderShopGrid(products);
                return;
            }
            
            const snapshot = await query.limit(30).get();
            const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            gridEl.innerHTML = this.renderPostGrid(posts);
            
        } catch (error) {
            console.error('Load posts error:', error);
            gridEl.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-tertiary);">Error loading posts</p>';
        }
    },
    
    renderPostGrid(posts) {
        if (posts.length === 0) {
            return '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-tertiary);"><p style="font-size:3rem;margin-bottom:12px;">📷</p><p>No posts yet</p></div>';
        }
        
        return posts.map(post => {
            let thumbSrc = '';
            let typeIcon = '';
            
            switch (post.type) {
                case 'video':
                    thumbSrc = post.thumbnailURL || '';
                    typeIcon = '<span class="video-indicator"><i class="fas fa-play"></i></span>';
                    break;
                case 'images':
                    thumbSrc = post.imageURLs?.[0] || '';
                    if (post.imageURLs?.length > 1) {
                        typeIcon = '<span class="video-indicator"><i class="fas fa-images"></i></span>';
                    }
                    break;
                case 'text':
                    return `
                        <div class="profile-post-thumb" onclick="Profile.openPost('${post.id}')"
                             style="background: var(--gradient-primary); display:flex;align-items:center;justify-content:center;padding:8px;">
                            <p style="color:white;font-size:0.7rem;text-align:center;line-height:1.3;
                                       overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;">
                                ${App.escapeHtml(post.text || '')}
                            </p>
                            <div class="post-thumb-overlay">
                                <i class="fas fa-eye"></i> ${App.formatNumber(post.likes || 0)}
                            </div>
                        </div>
                    `;
            }
            
            return `
                <div class="profile-post-thumb" onclick="Profile.openPost('${post.id}')">
                    ${thumbSrc 
                        ? `<img src="${thumbSrc}" loading="lazy" alt="Post">`
                        : '<div style="width:100%;height:100%;background:var(--gradient-secondary);"></div>'}
                    ${typeIcon}
                    <div class="post-thumb-overlay">
                        <i class="fas fa-heart"></i> ${App.formatNumber(post.likes || 0)}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    renderShopGrid(products) {
        if (products.length === 0) {
            return '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-tertiary);"><p style="font-size:3rem;">🛍️</p><p>No products yet</p></div>';
        }
        
        return products.map(product => `
            <div class="profile-post-thumb" onclick="Shop.viewProduct('${product.id}')">
                <img src="${product.images?.[0] || ''}" loading="lazy" alt="${App.escapeHtml(product.name)}">
                <div class="post-thumb-overlay">
                    $${product.price?.toFixed(2) || '0.00'}
                </div>
            </div>
        `).join('');
    },
    
    /* ==================
       TAB SWITCHING
       ================== */
    
    switchContentTab(tab, uid, btn) {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.loadUserPosts(uid, tab);
    },
    
    /* ==================
       EDIT PROFILE
       ================== */
    
    openEditProfile() {
        const modal = this.createEditModal();
        document.body.appendChild(modal);
    },
    
    createEditModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'edit-profile-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg-overlay);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;';
        
        modal.innerHTML = `
            <div style="width:100%;max-width:420px;max-height:90vh;background:var(--bg-secondary);border-radius:var(--radius-xl);overflow-y:auto;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>Edit Profile</h2>
                    <button class="close-btn" onclick="document.getElementById('edit-profile-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:16px;">
                    <div class="form-group">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Display Name</label>
                        <input type="text" id="edit-displayname" value="${App.escapeHtml(App.currentUser?.displayName || '')}" 
                               class="form-input" maxlength="30" placeholder="Display name">
                    </div>
                    <div class="form-group">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Username</label>
                        <input type="text" id="edit-username" value="${App.escapeHtml(App.currentUser?.username || '')}" 
                               class="form-input" maxlength="20" placeholder="Username">
                    </div>
                    <div class="form-group">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;display:block;">Bio</label>
                        <textarea id="edit-bio" class="form-input" maxlength="150" rows="3" 
                                  placeholder="Write about yourself..." 
                                  style="resize:none;">${App.escapeHtml(App.currentUser?.bio || '')}</textarea>
                        <p style="font-size:0.72rem;color:var(--text-tertiary);margin-top:4px;text-align:right;">
                            <span id="bio-char-count">${App.currentUser?.bio?.length || 0}</span>/150
                        </p>
                    </div>
                    
                    <!-- Title Selection -->
                    <div class="form-group">
                        <label style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;display:block;">Title</label>
                        <div id="titles-list" style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${this.renderTitleOptions()}
                        </div>
                    </div>
                    
                    <!-- Privacy -->
                    <div class="form-group" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border-light);">
                        <div>
                            <p style="font-weight:600;font-size:0.9rem;">Private Account</p>
                            <p style="color:var(--text-secondary);font-size:0.78rem;">Only followers can see your posts</p>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="private-toggle" ${App.currentUser?.isPrivate ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <button class="btn btn-primary btn-full" onclick="Profile.saveProfile()" style="margin-top:8px;">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        
        // Bio character counter
        modal.querySelector('#edit-bio').addEventListener('input', function() {
            document.getElementById('bio-char-count').textContent = this.value.length;
        });
        
        return modal;
    },
    
    renderTitleOptions() {
        const titles = this.getAvailableTitles();
        return titles.map(title => `
            <button class="title-option ${App.currentUser?.selectedTitle === title.name ? 'selected' : ''} ${title.rarity}"
                    onclick="Profile.selectTitle('${title.name}')"
                    style="padding:4px 10px;border-radius:var(--radius-full);font-size:0.75rem;font-weight:700;
                           background:${title.rarity === 'rare' ? 'var(--gradient-primary)' : 
                                       title.rarity === 'legendary' ? 'var(--gradient-gold)' : 'var(--bg-tertiary)'};
                           color:${title.rarity === 'rare' ? 'white' : 
                                  title.rarity === 'legendary' ? '#78350f' : 'var(--text-primary)'};
                           border:2px solid ${App.currentUser?.selectedTitle === title.name ? 'var(--primary)' : 'transparent'};
                           cursor:pointer;">
                ${title.name}
            </button>
        `).join('');
    },
    
    getAvailableTitles() {
        return [
            { name: 'Creator', rarity: 'common' },
            { name: 'Explorer', rarity: 'common' },
            { name: 'Gamer', rarity: 'common' },
            { name: 'Artist', rarity: 'common' },
            { name: 'Trendsetter', rarity: 'rare' },
            { name: 'Influencer', rarity: 'rare' },
            { name: 'Visionary', rarity: 'rare' },
            { name: 'Legend', rarity: 'legendary' },
            { name: 'Champion', rarity: 'legendary' },
            { name: 'Pioneer', rarity: 'legendary' },
            ...(App.currentUser?.titles || []).map(t => ({ name: t, rarity: 'rare' }))
        ];
    },
    
    getTitleRarity(titleName) {
        const legendary = ['Legend', 'Champion', 'Pioneer'];
        const rare = ['Trendsetter', 'Influencer', 'Visionary'];
        if (legendary.includes(titleName)) return 'legendary';
        if (rare.includes(titleName)) return 'rare';
        return 'common';
    },
    
    selectedTitle: null,
    
    selectTitle(titleName) {
        this.selectedTitle = titleName;
        document.querySelectorAll('.title-option').forEach(btn => {
            btn.style.borderColor = 'transparent';
        });
        event.target.style.borderColor = 'var(--primary)';
    },
    
    async saveProfile() {
        const displayName = document.getElementById('edit-displayname')?.value.trim();
        const username = document.getElementById('edit-username')?.value.trim().toLowerCase();
        const bio = document.getElementById('edit-bio')?.value.trim();
        const isPrivate = document.getElementById('private-toggle')?.checked;
        
        if (!displayName || !username) {
            App.showToast('Name and username required', 'warning');
            return;
        }
        
        if (!/^[a-z0-9_]+$/.test(username)) {
            App.showToast('Username: letters, numbers, underscores only', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            // Check username uniqueness if changed
            if (username !== App.currentUser.username) {
                const check = await db.collection(Collections.USERS)
                    .where('username', '==', username)
                    .limit(1)
                    .get();
                
                if (!check.empty) {
                    App.showToast('Username already taken', 'warning');
                    App.hideLoading();
                    return;
                }
            }
            
            const updates = {
                displayName,
                username,
                bio: bio || '',
                isPrivate: isPrivate || false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (this.selectedTitle) {
                updates.selectedTitle = this.selectedTitle;
            }
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update(updates);
            
            Object.assign(App.currentUser, updates);
            
            App.showToast('Profile updated! ✨', 'success');
            document.getElementById('edit-profile-modal')?.remove();
            
            // Reload profile
            this.loadMyProfile();
            
        } catch (error) {
            console.error('Save profile error:', error);
            App.showToast('Error saving profile', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       AVATAR UPLOAD
       ================== */
    
    editAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.uploadAvatar(e.target.files[0]);
        input.click();
    },
    
    async uploadAvatar(file) {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            App.showToast('Image too large. Max 5MB', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            const compressedFile = await this.compressImage(file, 400, 400);
            const ref = storage.ref(`avatars/${App.currentUser.uid}_${Date.now()}`);
            await ref.put(compressedFile);
            const url = await ref.getDownloadURL();
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                photoURL: url
            });
            
            App.currentUser.photoURL = url;
            
            // Update avatar everywhere
            document.getElementById('nav-avatar-img').src = url;
            
            App.showToast('Avatar updated! ✨', 'success');
            this.loadMyProfile();
            
        } catch (error) {
            console.error('Avatar upload error:', error);
            App.showToast('Error uploading image', 'error');
        }
        
        App.hideLoading();
    },
    
    editCover() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.uploadCover(e.target.files[0]);
        input.click();
    },
    
    async uploadCover(file) {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            App.showToast('Image too large. Max 10MB', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            const compressedFile = await this.compressImage(file, 1200, 400);
            const ref = storage.ref(`covers/${App.currentUser.uid}_${Date.now()}`);
            await ref.put(compressedFile);
            const url = await ref.getDownloadURL();
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                coverURL: url
            });
            
            App.currentUser.coverURL = url;
            App.showToast('Cover updated! ✨', 'success');
            this.loadMyProfile();
            
        } catch (error) {
            App.showToast('Error uploading cover', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       IMAGE COMPRESSION
       ================== */
    
    compressImage(file, maxWidth, maxHeight) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    
                    if (width > maxWidth) {
                        height = height * (maxWidth / width);
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = width * (maxHeight / height);
                        height = maxHeight;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },
    
    /* ==================
       FOLLOW SYSTEM
       ================== */
    
    async toggleFollow(uid, btn) {
        if (!App.currentUser) return;
        
        const isFollowing = btn.textContent.trim() === 'Following';
        
        if (isFollowing) {
            btn.textContent = 'Follow';
            btn.className = 'btn btn-primary profile-action-btn';
            
            await Promise.all([
                db.collection(Collections.USERS).doc(App.currentUser.uid)
                    .collection('following').doc(uid).delete(),
                db.collection(Collections.USERS).doc(uid)
                    .collection('followers').doc(App.currentUser.uid).delete(),
                db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                    following: firebase.firestore.FieldValue.increment(-1)
                }),
                db.collection(Collections.USERS).doc(uid).update({
                    followers: firebase.firestore.FieldValue.increment(-1)
                })
            ]);
        } else {
            btn.textContent = 'Following';
            btn.className = 'btn btn-secondary profile-action-btn';
            
            await Promise.all([
                db.collection(Collections.USERS).doc(App.currentUser.uid)
                    .collection('following').doc(uid).set({
                        followedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }),
                db.collection(Collections.USERS).doc(uid)
                    .collection('followers').doc(App.currentUser.uid).set({
                        followedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }),
                db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                    following: firebase.firestore.FieldValue.increment(1)
                }),
                db.collection(Collections.USERS).doc(uid).update({
                    followers: firebase.firestore.FieldValue.increment(1)
                })
            ]);
            
            App.addXP(5, 'follow');
            App.grantAchievement('popular', 1);
            
            Notifications.send(uid, 'follow', {
                fromUser: App.currentUser.displayName,
                fromAvatar: App.currentUser.photoURL
            });
        }
    },
    
    async checkIfFollows(uid, targetUid) {
        const doc = await db.collection(Collections.USERS)
            .doc(uid).collection('following').doc(targetUid).get();
        return doc.exists;
    },
    
    /* ==================
       MORE OPTIONS
       ================== */
    
    moreOptions(uid) {
        const options = document.createElement('div');
        options.className = 'modal-bottom';
        options.style.display = 'block';
        options.innerHTML = `
            <div class="modal-bottom-content">
                <div class="modal-drag-handle"></div>
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;" 
                        onclick="Profile.blockUser('${uid}'); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-ban"></i> Block User
                </button>
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;"
                        onclick="Profile.reportUser('${uid}'); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-flag"></i> Report User
                </button>
                <button class="btn btn-full btn-secondary"
                        onclick="this.closest('.modal-bottom').remove()">
                    Cancel
                </button>
<button class="btn btn-full btn-secondary" 
         style="margin-bottom:8px;"
         onclick="Friends.sendRequest('${uid}'); 
                  this.closest('.modal-bottom').remove()">
    <i class="fas fa-user-plus"></i> Add Friend
</button>
            </div>
        `;
        document.body.appendChild(options);
    },
    
    async blockUser(uid) {
        await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
            blockedUsers: firebase.firestore.FieldValue.arrayUnion(uid)
        });
        App.currentUser.blockedUsers = [...(App.currentUser.blockedUsers || []), uid];
        App.showToast('User blocked', 'info');
        App.closeOverlay('view-profile-overlay');
    },
    
    async reportUser(uid) {
        await db.collection(Collections.REPORTS).add({
            reportedUid: uid,
            reportedBy: App.currentUser.uid,
            type: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        App.showToast('User reported. Thank you.', 'success');
    },
    
    /* ==================
       HELPERS
       ================== */
    
    async getUserAchievements(uid, selectedIds) {
        if (!selectedIds || selectedIds.length === 0) {
            // Get top achievements
            const snapshot = await db.collection(Collections.USERS)
                .doc(uid)
                .collection('achievements')
                .orderBy('level', 'desc')
                .limit(3)
                .get();
            return snapshot.docs.map(doc => doc.data());
        }
        
        const achievements = [];
        for (const id of selectedIds.slice(0, 3)) {
            const doc = await db.collection(Collections.USERS)
                .doc(uid).collection('achievements').doc(id).get();
            if (doc.exists) achievements.push(doc.data());
        }
        return achievements;
    },
    
    getLevelTitle(level) {
        if (level < 10) return { title: 'Newbie', color: 'var(--text-secondary)' };
        if (level < 50) return { title: 'Explorer', color: 'var(--success)' };
        if (level < 100) return { title: 'Regular', color: 'var(--info)' };
        if (level < 500) return { title: 'Rising Star', color: 'var(--primary)' };
        if (level < 1000) return { title: 'Veteran', color: 'var(--accent)' };
        if (level < 5000) return { title: 'Elite', color: 'var(--warning)' };
        if (level < 9000) return { title: 'Legend', color: 'var(--danger)' };
        return { title: 'GODLIKE', color: 'var(--gradient-gold)' };
    },
    
    getXPProgress(xp, level) {
        const xpRequired = 100 + (level * 10);
        return Math.min(100, Math.floor((xp / xpRequired) * 100));
    },
    
    async editBio() {
        const newBio = prompt('Enter your bio (max 150 characters):', App.currentUser?.bio || '');
        if (newBio === null) return;
        if (newBio.length > 150) {
            App.showToast('Bio too long (max 150 chars)', 'warning');
            return;
        }
        
        await db.collection(Collections.USERS).doc(App.currentUser.uid).update({ bio: newBio });
        App.currentUser.bio = newBio;
        App.showToast('Bio updated!', 'success');
        this.loadMyProfile();
    },
    
    async editAchievements() {
        // Load all achievements and let user pick 3
        const allAchievements = await db.collection(Collections.USERS)
            .doc(App.currentUser.uid)
            .collection('achievements')
            .get();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:420px;max-height:80vh;background:var(--bg-secondary);
                        border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>Choose Achievements</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <p style="padding:0 20px 12px;color:var(--text-secondary);font-size:0.85rem;">Select up to 3 achievements to display</p>
                <div style="padding:0 16px 16px;overflow-y:auto;max-height:400px;">
                    ${allAchievements.docs.map(doc => {
                        const ach = doc.data();
                        const isSelected = App.currentUser?.selectedAchievements?.includes(doc.id);
                        return `
                            <div class="achievement-item" onclick="Profile.toggleSelectAchievement('${doc.id}', this)"
                                 style="border:2px solid ${isSelected ? 'var(--primary)' : 'transparent'};">
                                <div class="achievement-icon ${ach.level >= 100 ? 'gold-glow' : ach.level >= 5 ? 'glow' : ''}">
                                    ${ach.icon}
                                </div>
                                <div class="achievement-info">
                                    <div class="achievement-name">${ach.name}</div>
                                    <div class="achievement-desc">Level ${ach.level}</div>
                                    <div class="achievement-progress">
                                        <div class="achievement-progress-bar" style="width:${ach.level}%"></div>
                                    </div>
                                </div>
                                <span class="achievement-level">Lv.${ach.level}</span>
                            </div>
                        `;
                    }).join('')}
                    ${allAchievements.empty ? '<p style="text-align:center;padding:40px;color:var(--text-tertiary);">No achievements yet. Start exploring!</p>' : ''}
                </div>
                <div style="padding:16px;border-top:1px solid var(--border-light);">
                    <button class="btn btn-primary btn-full" onclick="Profile.saveSelectedAchievements(); this.closest('.modal-overlay').remove()">
                        Save Selection
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.tempSelectedAchievements = [...(App.currentUser?.selectedAchievements || [])];
    },
    
    tempSelectedAchievements: [],
    
    toggleSelectAchievement(id, el) {
        const idx = this.tempSelectedAchievements.indexOf(id);
        if (idx === -1) {
            if (this.tempSelectedAchievements.length >= 3) {
                App.showToast('Max 3 achievements', 'warning');
                return;
            }
            this.tempSelectedAchievements.push(id);
            el.style.borderColor = 'var(--primary)';
        } else {
            this.tempSelectedAchievements.splice(idx, 1);
            el.style.borderColor = 'transparent';
        }
    },
    
    async saveSelectedAchievements() {
        await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
            selectedAchievements: this.tempSelectedAchievements
        });
        App.currentUser.selectedAchievements = this.tempSelectedAchievements;
        App.showToast('Achievements updated!', 'success');
        this.loadMyProfile();
    },
    
    async openPost(postId) {
        const postDoc = await db.collection(Collections.POSTS).doc(postId).get();
        if (!postDoc.exists) return;
        
        const post = { id: postId, ...postDoc.data() };
        const html = await Feed.renderFeedItem(post);
        
        const overlay = document.getElementById('post-detail-overlay');
        overlay.style.display = 'block';
        overlay.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="App.closeOverlay('post-detail-overlay')">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Post</h2>
            </div>
            <div style="height:calc(100vh - 60px);overflow:hidden;">
                ${html}
            </div>
        `;
        
        Feed.setupVideoObserver();
    },
    
    async viewFollowers(uid) {
        this.viewFollowList(uid, 'followers');
    },
    
    async viewFollowing(uid) {
        this.viewFollowList(uid, 'following');
    },
    
    async viewFollowList(uid, type) {
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>${type === 'followers' ? 'Followers' : 'Following'}</h2>
            </div>
            <div id="follow-list-content" style="padding:8px;">
                <div class="spinner"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const snapshot = await db.collection(Collections.USERS)
            .doc(uid)
            .collection(type)
            .limit(50)
            .get();
        
        const listEl = modal.querySelector('#follow-list-content');
        let html = '';
        
        for (const doc of snapshot.docs) {
            const userDoc = await db.collection(Collections.USERS).doc(doc.id).get();
            if (userDoc.exists) {
                const user = userDoc.data();
                html += `
                    <div class="search-result-item" onclick="Profile.viewProfile('${doc.id}')">
                        <img src="${user.photoURL || 'assets/icons/default-avatar.png'}" class="search-result-avatar" loading="lazy">
                        <div class="search-result-info">
                            <div class="search-result-name">${App.escapeHtml(user.displayName)}</div>
                            <div class="search-result-username">@${App.escapeHtml(user.username)}</div>
                        </div>
                        ${uid === App.currentUser?.uid && type === 'following' ? `
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Feed.toggleFollow('${doc.id}', this)">Following</button>
                        ` : ''}
                    </div>
                `;
            }
        }
        
        listEl.innerHTML = html || '<p style="text-align:center;padding:40px;color:var(--text-tertiary);">Nobody here yet</p>';
    }
};
