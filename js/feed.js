/* ============================================
   FEED MODULE - TikTok-style Scrolling
   ============================================ */

const Feed = {
    forYouPosts: [],
    followingPosts: [],
    currentTab: 'foryou',
    lastForYouDoc: null,
    lastFollowingDoc: null,
    isLoading: false,
    currentPostId: null,
    videoObserver: null,
    adCounter: 0,
    AD_INTERVAL: 5, // Show ad every 5 posts
    
    /* ==================
       TAB SWITCHING
       ================== */
    
    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.feed-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        if (tab === 'foryou') {
            document.getElementById('foryou-feed').style.display = 'block';
            document.getElementById('following-feed').style.display = 'none';
            if (this.forYouPosts.length === 0) this.loadForYou();
        } else {
            document.getElementById('foryou-feed').style.display = 'none';
            document.getElementById('following-feed').style.display = 'block';
            if (this.followingPosts.length === 0) this.loadFollowing();
        }
    },
    
    /* ==================
       LOAD FOR YOU FEED
       ================== */
    
    async loadForYou() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        try {
            let query = db.collection(Collections.POSTS)
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(10);
            
            if (this.lastForYouDoc) {
                query = query.startAfter(this.lastForYouDoc);
            }
            
            const snapshot = await query.get();
            const container = document.getElementById('foryou-feed');
            
            if (this.forYouPosts.length === 0) {
                container.innerHTML = '';
            }
            
            // Remove loading spinner
            const loadingEl = container.querySelector('.feed-loading');
            if (loadingEl) loadingEl.remove();
            
            if (snapshot.empty && this.forYouPosts.length === 0) {
                container.innerHTML = `
                    <div class="feed-item" style="background: var(--bg-primary); display: flex; align-items: center; justify-content: center;">
                        <div style="text-align: center; padding: 40px;">
                            <p style="font-size: 3rem; margin-bottom: 16px;">🎬</p>
                            <h3>No posts yet</h3>
                            <p style="color: var(--text-secondary);">Be the first to post!</p>
                        </div>
                    </div>
                `;
                this.isLoading = false;
                return;
            }
            
            const posts = [];
            snapshot.forEach(doc => {
                posts.push({ id: doc.id, ...doc.data() });
                this.lastForYouDoc = doc;
            });
            
            // Shuffle for randomness
            this.shuffleArray(posts);
            
            // Mix in live streams and selling posts
            const liveStreams = await this.getActiveLiveStreams();
            const mixedFeed = this.mixFeed(posts, liveStreams);
            
            for (const item of mixedFeed) {
                this.adCounter++;
                
                // Insert ad every N posts
                if (this.adCounter % this.AD_INTERVAL === 0) {
                    container.innerHTML += Ads.renderFeedAd();
                }
                
                if (item.type === 'live') {
                    container.innerHTML += this.renderLiveFeedItem(item);
                } else {
                    container.innerHTML += await this.renderFeedItem(item);
                }
                
                this.forYouPosts.push(item);
            }
            
            // Setup intersection observer for videos
            this.setupVideoObserver();
            
            // Infinite scroll
            this.setupInfiniteScroll(container, 'foryou');
            
        } catch (error) {
            console.error('Error loading for you feed:', error);
            App.showToast('Error loading feed', 'error');
        }
        
        this.isLoading = false;
    },
    
    /* ==================
       LOAD FOLLOWING FEED
       ================== */
    
    async loadFollowing() {
        if (this.isLoading || !App.currentUser) return;
        this.isLoading = true;
        
        try {
            // Get following list
            const followingSnapshot = await db.collection(Collections.USERS)
                .doc(App.currentUser.uid)
                .collection('following')
                .get();
            
            const followingIds = followingSnapshot.docs.map(doc => doc.id);
            
            if (followingIds.length === 0) {
                const container = document.getElementById('following-feed');
                container.innerHTML = `
                    <div class="feed-item" style="background: var(--bg-primary); display: flex; align-items: center; justify-content: center;">
                        <div style="text-align: center; padding: 40px;">
                            <p style="font-size: 3rem; margin-bottom: 16px;">👥</p>
                            <h3>Follow people</h3>
                            <p style="color: var(--text-secondary);">Follow users to see their posts</p>
                            <button class="btn btn-primary" style="margin-top: 16px;" onclick="App.navigate('discover')">Discover</button>
                        </div>
                    </div>
                `;
                this.isLoading = false;
                return;
            }
            
            // Firestore 'in' query limit is 10
            const batches = [];
            for (let i = 0; i < followingIds.length; i += 10) {
                const batch = followingIds.slice(i, i + 10);
                batches.push(batch);
            }
            
            const allPosts = [];
            for (const batch of batches) {
                let query = db.collection(Collections.POSTS)
                    .where('userId', 'in', batch)
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .limit(10);
                
                const snapshot = await query.get();
                snapshot.forEach(doc => {
                    allPosts.push({ id: doc.id, ...doc.data() });
                });
            }
            
            // Sort by date
            allPosts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            
            const container = document.getElementById('following-feed');
            const loadingEl = container.querySelector('.feed-loading');
            if (loadingEl) loadingEl.remove();
            
            if (allPosts.length === 0) {
                container.innerHTML = `
                    <div class="feed-item" style="background: var(--bg-primary); display: flex; align-items: center; justify-content: center;">
                        <div style="text-align: center; padding: 40px;">
                            <p style="font-size: 3rem; margin-bottom: 16px;">📭</p>
                            <h3>No posts yet</h3>
                            <p style="color: var(--text-secondary);">Your following haven't posted yet</p>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = '';
                for (const post of allPosts) {
                    container.innerHTML += await this.renderFeedItem(post);
                    this.followingPosts.push(post);
                }
            }
            
            this.setupVideoObserver();
            
        } catch (error) {
            console.error('Error loading following feed:', error);
        }
        
        this.isLoading = false;
    },
    
    /* ==================
       RENDER FEED ITEM
       ================== */
    
    async renderFeedItem(post) {
        // Get user data
        let userData = post.userData;
        if (!userData) {
            const userDoc = await db.collection(Collections.USERS).doc(post.userId).get();
            userData = userDoc.exists ? userDoc.data() : {};
        }
        
        // Hide admin posts from non-admin users
        if (userData.role === 'admin' && !App.isAdmin) return '';
        
        const verifiedBadge = userData.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
        const glowClass = (userData.isVerified || userData.role === 'admin') ? 'glow' : '';
        
        // User tag
        let userTag = '';
        if (userData.role === 'admin') {
            userTag = '<span class="user-tag admin">ADMIN</span>';
        } else if (userData.role === 'moderator') {
            userTag = '<span class="user-tag moderator">MOD</span>';
        }
        
        // Check if user is followed
        let followBtn = '';
        if (post.userId !== App.currentUser?.uid) {
            const isFollowing = await this.checkFollowing(post.userId);
            followBtn = isFollowing 
                ? `<button class="follow-btn-feed following" onclick="event.stopPropagation(); Feed.toggleFollow('${post.userId}', this)">Following</button>`
                : `<button class="follow-btn-feed" onclick="event.stopPropagation(); Feed.toggleFollow('${post.userId}', this)">Follow</button>`;
        }
        
        // Shop indicator
        let shopIndicator = '';
        if (post.products && post.products.length > 0) {
            shopIndicator = `
                <div class="shop-indicator" onclick="event.stopPropagation(); Shop.showProductListing('${post.id}')">
                    🛍️ <span>${post.products.length} product${post.products.length > 1 ? 's' : ''}</span>
                </div>
            `;
        }
        
        // Content
        let contentHtml = '';
        
        switch (post.type) {
            case 'video':
                contentHtml = `
                    <video class="feed-video" data-post-id="${post.id}" 
                           src="${post.videoURL}" 
                           loop playsinline muted
                           poster="${post.thumbnailURL || ''}"
                           onclick="Feed.togglePlay(this)"
                           loading="lazy"></video>
                `;
                break;
                
            case 'images':
                const slides = post.imageURLs.map((url, i) => `
                    <div class="feed-image-slide">
                        <img src="${url}" alt="Image ${i+1}" loading="lazy">
                    </div>
                `).join('');
                
                const indicators = post.imageURLs.map((_, i) => `
                    <div class="image-indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></div>
                `).join('');
                
                contentHtml = `
                    <div class="feed-images" onscroll="Feed.updateImageIndicator(this, '${post.id}')">
                        ${slides}
                    </div>
                    <div class="feed-image-indicators" id="indicators-${post.id}">
                        ${indicators}
                    </div>
                `;
                break;
                
            case 'text':
                const bgColors = ['var(--gradient-primary)', 'var(--gradient-accent)', 'linear-gradient(135deg, #34d399, #059669)', 'linear-gradient(135deg, #f97316, #ef4444)'];
                const bgColor = post.bgColor || bgColors[Math.floor(Math.random() * bgColors.length)];
                contentHtml = `
                    <div class="feed-text-post" style="background: ${bgColor};">
                        <div class="feed-text-content">${App.escapeHtml(post.text)}</div>
                    </div>
                `;
                break;
        }
        
        // Mention processing
        let caption = App.escapeHtml(post.caption || '');
        caption = caption.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
        
        // Check if liked
        const isLiked = post.likedBy?.includes(App.currentUser?.uid) || false;
        
        return `
            <div class="feed-item" data-post-id="${post.id}" id="post-${post.id}">
                <div class="feed-item-content">
                    ${contentHtml}
                    
                    ${shopIndicator}
                    
                    <!-- Bottom Info -->
                    <div class="feed-info">
                        <div class="feed-user-info">
                            <img src="${userData.photoURL || 'assets/icons/default-avatar.png'}" 
                                 class="feed-avatar" 
                                 onclick="event.stopPropagation(); Profile.viewProfile('${post.userId}')"
                                 loading="lazy">
                            <span class="feed-username ${glowClass}" onclick="event.stopPropagation(); Profile.viewProfile('${post.userId}')">
                                ${App.escapeHtml(userData.displayName || 'User')}
                            </span>
                            ${verifiedBadge}
                            ${userTag}
                            ${followBtn}
                        </div>
                        <div class="feed-caption">${caption}</div>
                    </div>
                    
                    <!-- Right Actions -->
                    <div class="feed-actions">
                        <div class="feed-action-item">
                            <img src="${userData.photoURL || 'assets/icons/default-avatar.png'}" 
                                 class="feed-action-avatar ${userData.isVerified ? 'verified-border' : ''}"
                                 onclick="Profile.viewProfile('${post.userId}')"
                                 loading="lazy">
                        </div>
                        <div class="feed-action-item">
                            <button class="feed-action-btn ${isLiked ? 'liked' : ''}" 
                                    onclick="Feed.toggleLike('${post.id}', this)"
                                    data-liked="${isLiked}">
                                <i class="fas fa-heart"></i>
                            </button>
                            <span class="feed-action-count">${App.formatNumber(post.likes || 0)}</span>
                        </div>
                        <div class="feed-action-item">
                            <button class="feed-action-btn" onclick="Feed.openComments('${post.id}')">
                                <i class="fas fa-comment-dots"></i>
                            </button>
                            <span class="feed-action-count">${App.formatNumber(post.comments || 0)}</span>
                        </div>
                        <div class="feed-action-item">
                            <button class="feed-action-btn" onclick="Feed.openShare('${post.id}')">
                                <i class="fas fa-share"></i>
                            </button>
                            <span class="feed-action-count">${App.formatNumber(post.shares || 0)}</span>
                        </div>
                        ${post.products?.length > 0 ? `
                        <div class="feed-action-item">
                            <button class="feed-action-btn" onclick="Shop.showProductListing('${post.id}')" style="color: #fbbf24;">
                                <i class="fas fa-shopping-bag"></i>
                            </button>
                            <span class="feed-action-count">Buy</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },
    
    /* ==================
       RENDER LIVE FEED ITEM
       ================== */
    
    renderLiveFeedItem(liveData) {
        return `
            <div class="feed-item live-feed" onclick="Live.joinStream('${liveData.id}')">
                <div class="feed-item-content">
                    <img src="${liveData.thumbnailURL || liveData.hostAvatar}" 
                         style="width:100%;height:100%;object-fit:cover;filter:blur(10px) brightness(0.6);">
                    <div class="live-indicator">LIVE</div>
                    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:5;">
                        <img src="${liveData.hostAvatar || 'assets/icons/default-avatar.png'}" 
                             style="width:80px;height:80px;border-radius:50%;border:3px solid var(--live);margin-bottom:12px;">
                        <h3 style="color:white;font-size:1.2rem;">${App.escapeHtml(liveData.hostName)}</h3>
                        <p style="color:rgba(255,255,255,0.7);font-size:0.85rem;">
                            <i class="fas fa-eye"></i> ${App.formatNumber(liveData.viewers || 0)} watching
                        </p>
                        <button class="btn btn-primary" style="margin-top:16px;">
                            <i class="fas fa-play"></i> Watch Live
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    /* ==================
       VIDEO MANAGEMENT
       ================== */
    
    setupVideoObserver() {
        if (this.videoObserver) {
            this.videoObserver.disconnect();
        }
        
        this.videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    video.play().catch(() => {});
                    video.muted = false;
                } else {
                    video.pause();
                    video.muted = true;
                }
            });
        }, { threshold: 0.6 });
        
        document.querySelectorAll('.feed-video').forEach(video => {
            this.videoObserver.observe(video);
        });
    },
    
    togglePlay(video) {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    },
    
    updateImageIndicator(container, postId) {
        const scrollLeft = container.scrollLeft;
        const slideWidth = container.offsetWidth;
        const currentIndex = Math.round(scrollLeft / slideWidth);
        
        const indicators = document.querySelectorAll(`#indicators-${postId} .image-indicator`);
        indicators.forEach((ind, i) => {
            ind.classList.toggle('active', i === currentIndex);
        });
    },
    
    /* ==================
       INTERACTIONS
       ================== */
    
    async toggleLike(postId, btn) {
        if (!App.currentUser) return;
        
        const isLiked = btn.dataset.liked === 'true';
        const countEl = btn.parentElement.querySelector('.feed-action-count');
        
        if (isLiked) {
            // Unlike
            btn.classList.remove('liked');
            btn.dataset.liked = 'false';
            const currentCount = parseInt(countEl.textContent) || 0;
            countEl.textContent = App.formatNumber(Math.max(0, currentCount - 1));
            
            await db.collection(Collections.POSTS).doc(postId).update({
                likes: firebase.firestore.FieldValue.increment(-1),
                likedBy: firebase.firestore.FieldValue.arrayRemove(App.currentUser.uid)
            });
        } else {
            // Like
            btn.classList.add('liked');
            btn.dataset.liked = 'true';
            const currentCount = parseInt(countEl.textContent) || 0;
            countEl.textContent = App.formatNumber(currentCount + 1);
            
            await db.collection(Collections.POSTS).doc(postId).update({
                likes: firebase.firestore.FieldValue.increment(1),
                likedBy: firebase.firestore.FieldValue.arrayUnion(App.currentUser.uid)
            });
            
            // XP for liking
            App.addXP(1, 'like');
            App.grantAchievement('first_like', 1);
            
            // Notify post owner
            const post = (await db.collection(Collections.POSTS).doc(postId).get()).data();
            if (post && post.userId !== App.currentUser.uid) {
                Notifications.send(post.userId, 'like', {
                    fromUser: App.currentUser.displayName,
                    fromAvatar: App.currentUser.photoURL,
                    postId: postId
                });
            }
        }
        
        // 0.0000001% chance of paid reward
        if (!isLiked && App.rollPaidReward()) {
            const reward = (Math.random() * 0.5).toFixed(2);
            App.showToast(`🎉 Lucky! You won $${reward} in gold coins!`, 'success');
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                goldCoins: firebase.firestore.FieldValue.increment(parseFloat(reward) * 100)
            });
        }
    },
    
    async toggleFollow(userId, btn) {
        if (!App.currentUser || userId === App.currentUser.uid) return;
        
        const isFollowing = btn.classList.contains('following');
        
        if (isFollowing) {
            // Unfollow
            btn.classList.remove('following');
            btn.textContent = 'Follow';
            
            await Promise.all([
                db.collection(Collections.USERS).doc(App.currentUser.uid)
                    .collection('following').doc(userId).delete(),
                db.collection(Collections.USERS).doc(userId)
                    .collection('followers').doc(App.currentUser.uid).delete(),
                db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                    following: firebase.firestore.FieldValue.increment(-1)
                }),
                db.collection(Collections.USERS).doc(userId).update({
                    followers: firebase.firestore.FieldValue.increment(-1)
                })
            ]);
        } else {
            // Follow
            btn.classList.add('following');
            btn.textContent = 'Following';
            
            await Promise.all([
                db.collection(Collections.USERS).doc(App.currentUser.uid)
                    .collection('following').doc(userId).set({
                        followedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }),
                db.collection(Collections.USERS).doc(userId)
                    .collection('followers').doc(App.currentUser.uid).set({
                        followedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }),
                db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                    following: firebase.firestore.FieldValue.increment(1)
                }),
                db.collection(Collections.USERS).doc(userId).update({
                    followers: firebase.firestore.FieldValue.increment(1)
                })
            ]);
            
            // XP for following
            App.addXP(2, 'follow');
            App.grantAchievement('first_follow', 1);
            
            // Notify
            Notifications.send(userId, 'follow', {
                fromUser: App.currentUser.displayName,
                fromAvatar: App.currentUser.photoURL
            });
        }
    },
    
    async checkFollowing(userId) {
        if (!App.currentUser) return false;
        const doc = await db.collection(Collections.USERS)
            .doc(App.currentUser.uid)
            .collection('following')
            .doc(userId)
            .get();
        return doc.exists;
    },
    
    /* ==================
       COMMENTS
       ================== */
    
    currentCommentPostId: null,
    
    async openComments(postId) {
        this.currentCommentPostId = postId;
        document.getElementById('comment-modal').style.display = 'block';
        document.getElementById('comment-my-avatar').src = App.currentUser?.photoURL || 'assets/icons/default-avatar.png';
        
        // Load comments
        const snapshot = await db.collection(Collections.POSTS)
            .doc(postId)
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const commentList = document.getElementById('comment-list');
        let html = '';
        
        snapshot.forEach(doc => {
            const comment = doc.data();
            const verifiedBadge = comment.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
            let userTag = '';
            if (comment.role === 'admin') userTag = '<span class="user-tag admin">ADMIN</span>';
            else if (comment.role === 'moderator') userTag = '<span class="user-tag moderator">MOD</span>';
            
            html += `
                <div class="comment-item">
                    <img src="${comment.userAvatar || 'assets/icons/default-avatar.png'}" class="comment-item-avatar" 
                         onclick="Profile.viewProfile('${comment.userId}')" loading="lazy">
                    <div class="comment-item-content">
                        <span class="comment-item-name" onclick="Profile.viewProfile('${comment.userId}')">
                            ${App.escapeHtml(comment.userName)}
                            ${verifiedBadge}
                            ${userTag}
                        </span>
                        <p class="comment-item-text">${App.escapeHtml(comment.text)}</p>
                        <div class="comment-item-meta">
                            <span class="comment-item-time">${App.timeAgo(comment.createdAt)}</span>
                            <button class="comment-like-btn">
                                <i class="far fa-heart"></i> ${comment.likes || 0}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        commentList.innerHTML = html || '<p style="text-align:center; padding:40px; color:var(--text-tertiary);">No comments yet</p>';
        document.getElementById('comment-count').textContent = snapshot.size;
    },
    
    async sendComment() {
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        
        if (!text || !this.currentCommentPostId || !App.currentUser) return;
        
        input.value = '';
        
        const comment = {
            userId: App.currentUser.uid,
            userName: App.currentUser.displayName,
            userAvatar: App.currentUser.photoURL,
            isVerified: App.currentUser.isVerified,
            role: App.currentUser.role,
            text: text,
            likes: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection(Collections.POSTS)
            .doc(this.currentCommentPostId)
            .collection('comments')
            .add(comment);
        
        await db.collection(Collections.POSTS).doc(this.currentCommentPostId).update({
            comments: firebase.firestore.FieldValue.increment(1)
        });
        
        // XP
        App.addXP(2, 'comment');
        App.grantAchievement('first_comment', 1);
        
        // Refresh comments
        this.openComments(this.currentCommentPostId);
    },
    
    /* ==================
       SHARE
       ================== */
    
    currentSharePostId: null,
    
    async openShare(postId) {
        this.currentSharePostId = postId;
        document.getElementById('share-modal').style.display = 'block';
        
        // Load friends list for sharing
        const friendsSnapshot = await db.collection(Collections.USERS)
            .doc(App.currentUser.uid)
            .collection('following')
            .limit(20)
            .get();
        
        const friendsList = document.getElementById('share-friends-list');
        let html = '';
        
        for (const doc of friendsSnapshot.docs) {
            const friendDoc = await db.collection(Collections.USERS).doc(doc.id).get();
            if (friendDoc.exists) {
                const friend = friendDoc.data();
                html += `
                    <div class="share-friend-item" onclick="Feed.shareToFriend('${doc.id}')">
                        <img src="${friend.photoURL || 'assets/icons/default-avatar.png'}" class="share-friend-avatar" loading="lazy">
                        <span class="share-friend-name">${App.escapeHtml(friend.displayName)}</span>
                    </div>
                `;
            }
        }
        
        friendsList.innerHTML = html || '<p style="padding: 20px; color: var(--text-tertiary); text-align: center;">No friends to share with</p>';
    },
    
    async shareToFriend(friendId) {
        if (!this.currentSharePostId) return;
        
        // Send as chat message
        await Chat.sendPostToFriend(friendId, this.currentSharePostId);
        
        // Update share count
        await db.collection(Collections.POSTS).doc(this.currentSharePostId).update({
            shares: firebase.firestore.FieldValue.increment(1)
        });
        
        App.addXP(3, 'share');
        App.grantAchievement('first_share', 1);
        
        App.showToast('Shared! ✨', 'success');
        App.closeModal('share-modal');
    },
    
    async repost() {
        if (!this.currentSharePostId) return;
        
        const postDoc = await db.collection(Collections.POSTS).doc(this.currentSharePostId).get();
        if (!postDoc.exists) return;
        
        const originalPost = postDoc.data();
        
        const repost = {
            ...originalPost,
            userId: App.currentUser.uid,
            repostedFrom: this.currentSharePostId,
            originalUserId: originalPost.userId,
            isRepost: true,
            likes: 0,
            comments: 0,
            shares: 0,
            likedBy: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection(Collections.POSTS).add(repost);
        
        await db.collection(Collections.POSTS).doc(this.currentSharePostId).update({
            shares: firebase.firestore.FieldValue.increment(1)
        });
        
        App.addXP(5, 'repost');
        App.showToast('Reposted! 🔄', 'success');
        App.closeModal('share-modal');
    },
    
    async copyLink() {
        const link = `https://vidr.click/post/${this.currentSharePostId}`;
        
        try {
            await navigator.clipboard.writeText(link);
            App.showToast('Link copied! 📋', 'success');
        } catch {
            App.showToast('Failed to copy link', 'error');
        }
        
        App.closeModal('share-modal');
    },
    
    /* ==================
       HELPERS
       ================== */
    
    async getActiveLiveStreams() {
        try {
            const snapshot = await db.collection(Collections.LIVE_STREAMS)
                .where('isActive', '==', true)
                .limit(5)
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                type: 'live',
                ...doc.data()
            }));
        } catch {
            return [];
        }
    },
    
    mixFeed(posts, liveStreams) {
        const mixed = [...posts];
        
        // Insert live streams at random positions
        liveStreams.forEach(live => {
            const pos = Math.floor(Math.random() * mixed.length);
            mixed.splice(pos, 0, live);
        });
        
        return mixed;
    },
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },
    
    setupInfiniteScroll(container, type) {
        container.addEventListener('scroll', () => {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 200) {
                if (type === 'foryou') {
                    this.loadForYou();
                } else {
                    this.loadFollowing();
                }
            }
        }, { passive: true });
    },
    
    async refresh() {
        this.forYouPosts = [];
        this.followingPosts = [];
        this.lastForYouDoc = null;
        this.lastFollowingDoc = null;
        this.adCounter = 0;
        
        const forYouContainer = document.getElementById('foryou-feed');
        const followingContainer = document.getElementById('following-feed');
        
        forYouContainer.innerHTML = '<div class="feed-loading"><div class="spinner"></div></div>';
        followingContainer.innerHTML = '<div class="feed-loading"><div class="spinner"></div></div>';
        
        if (this.currentTab === 'foryou') {
            await this.loadForYou();
        } else {
            await this.loadFollowing();
        }
    }
};