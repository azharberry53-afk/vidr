/* ============================================
   DISCOVER MODULE
   ============================================ */

const Discover = {
    lastDoc: null,
    isLoading: false,
    
    async load() {
        if (this.isLoading || !App.currentUser) return;
        this.isLoading = true;
        
        const container = document.getElementById('discover-content');
        
        if (!this.lastDoc) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;"><div class="spinner"></div></div>';
        }
        
        try {
            // Get users not yet followed
            const followingSnap = await db.collection(Collections.USERS)
                .doc(App.currentUser.uid)
                .collection('following')
                .get();
            
            const followingIds = followingSnap.docs.map(d => d.id);
            followingIds.push(App.currentUser.uid); // Exclude self
            
            let query = db.collection(Collections.USERS)
                .where('isBot', '==', false)
                .where('isBanned', '==', false)
                .orderBy('followers', 'desc')
                .limit(20);
            
            if (this.lastDoc) query = query.startAfter(this.lastDoc);
            
            const snapshot = await query.get();
            
            if (!this.lastDoc) container.innerHTML = '';
            
            let html = '';
            
            for (const doc of snapshot.docs) {
                const user = doc.data();
                
                // Skip already following & self & admin
                if (followingIds.includes(doc.id)) continue;
                if (user.role === 'admin' && !App.isAdmin) continue;
                
                this.lastDoc = doc;
                
                // Check mutual friends
                const mutualCount = await this.getMutualCount(doc.id);
                
                html += `
                    <div class="discover-card" onclick="Profile.viewProfile('${doc.id}')">
                        <div class="discover-cover" style="background:var(--gradient-secondary);">
                            ${user.coverURL ? `<img src="${user.coverURL}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">` : ''}
                        </div>
                        <div class="discover-info">
                            <div style="position:relative;margin-top:-24px;margin-bottom:8px;">
                                <img src="${user.photoURL || 'assets/icons/default-avatar.png'}" 
                                     class="discover-avatar" loading="lazy">
                            </div>
                            <div class="discover-name">
                                ${App.escapeHtml(user.displayName)}
                                ${user.isVerified ? '<i class="fas fa-check-circle verified-icon" style="font-size:0.8rem;"></i>' : ''}
                            </div>
                            <div class="discover-followers">
                                ${App.formatNumber(user.followers || 0)} followers
                            </div>
                            <button class="discover-follow-btn" 
                                    onclick="event.stopPropagation(); Discover.followFromCard('${doc.id}', this)">
                                Follow
                            </button>
                            ${mutualCount > 0 ? `
                            <div class="discover-mutual">
                                ${mutualCount} mutual friend${mutualCount > 1 ? 's' : ''}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
            
            if (html) {
                container.innerHTML += html;
            } else if (!this.lastDoc) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-tertiary);">No new users to discover!</div>';
            }
            
            // Infinite scroll
            this.setupInfiniteScroll(container);
            
        } catch (error) {
            console.error('Discover error:', error);
        }
        
        this.isLoading = false;
    },
    
    async followFromCard(uid, btn) {
        btn.disabled = true;
        btn.textContent = '...';
        
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
        
        btn.textContent = 'Following ✓';
        btn.style.background = 'var(--bg-tertiary)';
        btn.style.color = 'var(--text-secondary)';
        
        Notifications.send(uid, 'follow', {
            fromUser: App.currentUser.displayName,
            fromAvatar: App.currentUser.photoURL
        });
        
        App.addXP(2, 'follow');
        App.grantAchievement('first_follow', 1);
    },
    
    async getMutualCount(uid) {
        try {
            const myFollowing = await db.collection(Collections.USERS)
                .doc(App.currentUser.uid).collection('following').get();
            const myFollowingIds = myFollowing.docs.map(d => d.id);
            
            const theirFollowers = await db.collection(Collections.USERS)
                .doc(uid).collection('followers').get();
            const theirFollowerIds = theirFollowers.docs.map(d => d.id);
            
            return myFollowingIds.filter(id => theirFollowerIds.includes(id)).length;
        } catch {
            return 0;
        }
    },
    
    setupInfiniteScroll(container) {
        const page = document.getElementById('discover-page');
        page.addEventListener('scroll', () => {
            if (page.scrollTop + page.clientHeight >= page.scrollHeight - 200) {
                this.load();
            }
        }, { passive: true, once: true });
    }
};