/* ============================================
   FRIENDS MODULE - Friend Request System
   js/friends.js
   ============================================ */

const Friends = {
    
    requestsListener: null,
    
    /* ==================
       SEND FRIEND REQUEST
       ================== */
    
    async sendRequest(toUserId) {
        if (!App.currentUser) return;
        if (toUserId === App.currentUser.uid) return;
        
        App.showLoading();
        
        try {
            // Check if already friends (mutual follow)
            const isMutual = await this.checkMutual(App.currentUser.uid, toUserId);
            if (isMutual) {
                App.showToast('You are already friends! 👥', 'info');
                App.hideLoading();
                return;
            }
            
            // Check if request already sent
            const existingSnap = await db.collection(Collections.FRIEND_REQUESTS)
                .where('fromUserId', '==', App.currentUser.uid)
                .where('toUserId', '==', toUserId)
                .where('status', '==', 'pending')
                .limit(1)
                .get();
            
            if (!existingSnap.empty) {
                App.showToast('Friend request already sent! ⏳', 'info');
                App.hideLoading();
                return;
            }
            
            // Check if they already sent us a request
            const theirRequestSnap = await db.collection(Collections.FRIEND_REQUESTS)
                .where('fromUserId', '==', toUserId)
                .where('toUserId', '==', App.currentUser.uid)
                .where('status', '==', 'pending')
                .limit(1)
                .get();
            
            if (!theirRequestSnap.empty) {
                // Auto accept their request
                await this.acceptRequest(
                    theirRequestSnap.docs[0].id,
                    toUserId
                );
                App.hideLoading();
                return;
            }
            
            // Send new request
            await db.collection(Collections.FRIEND_REQUESTS).add({
                fromUserId: App.currentUser.uid,
                fromName: App.currentUser.displayName,
                fromAvatar: App.currentUser.photoURL || '',
                fromUsername: App.currentUser.username || '',
                toUserId: toUserId,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Notify the other user
            Notifications.send(toUserId, 'friend_request', {
                fromUser: App.currentUser.displayName,
                fromAvatar: App.currentUser.photoURL || '',
                message: 'sent you a friend request'
            });
            
            App.addXP(2, 'social');
            App.showToast('Friend request sent! 👋', 'success');
            
        } catch (error) {
            console.error('Send request error:', error);
            App.showToast('Error sending request', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       ACCEPT REQUEST
       ================== */
    
    async acceptRequest(requestId, fromUserId) {
        App.showLoading();
        
        try {
            const batch = db.batch();
            
            // Update request status
            batch.update(
                db.collection(Collections.FRIEND_REQUESTS).doc(requestId),
                {
                    status: 'accepted',
                    acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            );
            
            // Mutual follow each other
            batch.set(
                db.collection(Collections.USERS)
                    .doc(App.currentUser.uid)
                    .collection('following')
                    .doc(fromUserId),
                { followedAt: firebase.firestore.FieldValue.serverTimestamp() }
            );
            
            batch.set(
                db.collection(Collections.USERS)
                    .doc(fromUserId)
                    .collection('followers')
                    .doc(App.currentUser.uid),
                { followedAt: firebase.firestore.FieldValue.serverTimestamp() }
            );
            
            batch.set(
                db.collection(Collections.USERS)
                    .doc(fromUserId)
                    .collection('following')
                    .doc(App.currentUser.uid),
                { followedAt: firebase.firestore.FieldValue.serverTimestamp() }
            );
            
            batch.set(
                db.collection(Collections.USERS)
                    .doc(App.currentUser.uid)
                    .collection('followers')
                    .doc(fromUserId),
                { followedAt: firebase.firestore.FieldValue.serverTimestamp() }
            );
            
            // Update follower/following counts
            batch.update(
                db.collection(Collections.USERS).doc(App.currentUser.uid),
                {
                    followers: firebase.firestore.FieldValue.increment(1),
                    following: firebase.firestore.FieldValue.increment(1)
                }
            );
            
            batch.update(
                db.collection(Collections.USERS).doc(fromUserId),
                {
                    followers: firebase.firestore.FieldValue.increment(1),
                    following: firebase.firestore.FieldValue.increment(1)
                }
            );
            
            await batch.commit();
            
            // Notify the requester
            Notifications.send(fromUserId, 'friend_accepted', {
                fromUser: App.currentUser.displayName,
                fromAvatar: App.currentUser.photoURL || '',
                message: 'accepted your friend request'
            });
            
            App.addXP(5, 'social');
            App.grantAchievement('first_follow', 1);
            App.showToast('Friend request accepted! 🎉', 'success');
            
            // Refresh requests list
            this.loadPendingRequests();
            
        } catch (error) {
            console.error('Accept request error:', error);
            App.showToast('Error accepting request', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       DECLINE REQUEST
       ================== */
    
    async declineRequest(requestId) {
        try {
            await db.collection(Collections.FRIEND_REQUESTS)
                .doc(requestId)
                .update({
                    status: 'declined',
                    declinedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            App.showToast('Request declined', 'info');
            this.loadPendingRequests();
            
        } catch (error) {
            App.showToast('Error declining request', 'error');
        }
    },
    
    /* ==================
       CANCEL REQUEST
       ================== */
    
    async cancelRequest(toUserId) {
        try {
            const snap = await db.collection(Collections.FRIEND_REQUESTS)
                .where('fromUserId', '==', App.currentUser.uid)
                .where('toUserId', '==', toUserId)
                .where('status', '==', 'pending')
                .limit(1)
                .get();
            
            if (!snap.empty) {
                await snap.docs[0].ref.delete();
                App.showToast('Request cancelled', 'info');
            }
            
        } catch (error) {
            App.showToast('Error cancelling request', 'error');
        }
    },
    
    /* ==================
       CHECK MUTUAL FRIENDS
       ================== */
    
    async checkMutual(userId1, userId2) {
        try {
            const [f1, f2] = await Promise.all([
                db.collection(Collections.USERS)
                    .doc(userId1)
                    .collection('following')
                    .doc(userId2)
                    .get(),
                db.collection(Collections.USERS)
                    .doc(userId2)
                    .collection('following')
                    .doc(userId1)
                    .get()
            ]);
            return f1.exists && f2.exists;
        } catch {
            return false;
        }
    },
    
    /* ==================
       CHECK REQUEST STATUS
       ================== */
    
    async getRequestStatus(toUserId) {
        try {
            // Sent by me
            const sentSnap = await db.collection(Collections.FRIEND_REQUESTS)
                .where('fromUserId', '==', App.currentUser.uid)
                .where('toUserId', '==', toUserId)
                .where('status', '==', 'pending')
                .limit(1)
                .get();
            
            if (!sentSnap.empty) return 'sent';
            
            // Received from them
            const receivedSnap = await db.collection(Collections.FRIEND_REQUESTS)
                .where('fromUserId', '==', toUserId)
                .where('toUserId', '==', App.currentUser.uid)
                .where('status', '==', 'pending')
                .limit(1)
                .get();
            
            if (!receivedSnap.empty) {
                return { status: 'received', requestId: receivedSnap.docs[0].id };
            }
            
            // Check mutual
            const mutual = await this.checkMutual(App.currentUser.uid, toUserId);
            if (mutual) return 'friends';
            
            return 'none';
            
        } catch {
            return 'none';
        }
    },
    
    /* ==================
       LOAD PENDING REQUESTS
       ================== */
    
    async openRequestsPage() {
        const page = document.createElement('div');
        page.className = 'overlay-page';
        page.id = 'friend-requests-page';
        page.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" 
                        onclick="this.closest('.overlay-page').remove()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Friend Requests</h2>
                <span class="friend-req-count" id="friend-req-badge" 
                      style="display:none;"></span>
            </div>
            
            <div class="friend-req-tabs">
                <button class="friend-tab active" 
                        onclick="Friends.switchRequestTab('received', this)">
                    Received
                </button>
                <button class="friend-tab" 
                        onclick="Friends.switchRequestTab('sent', this)">
                    Sent
                </button>
                <button class="friend-tab" 
                        onclick="Friends.switchRequestTab('friends', this)">
                    My Friends
                </button>
            </div>
            
            <div id="friend-requests-content" 
                 style="padding:12px;overflow-y:auto;
                        height:calc(100vh - 112px);">
                <div class="spinner" 
                     style="margin:40px auto;display:block;"></div>
            </div>
        `;
        document.body.appendChild(page);
        
        this.loadPendingRequests();
    },
    
    async loadPendingRequests() {
        const content = document.getElementById('friend-requests-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="spinner" 
                 style="margin:40px auto;display:block;"></div>
        `;
        
        try {
            const snapshot = await db.collection(Collections.FRIEND_REQUESTS)
                .where('toUserId', '==', App.currentUser.uid)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(30)
                .get();
            
            // Update badge
            const badge = document.getElementById('friend-req-badge');
            if (badge && snapshot.size > 0) {
                badge.textContent = snapshot.size;
                badge.style.display = 'flex';
            }
            
            if (snapshot.empty) {
                content.innerHTML = this.renderEmptyState(
                    '👥',
                    'No Friend Requests',
                    'When someone sends you a request, it will appear here'
                );
                return;
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const req = doc.data();
                html += this.renderRequestCard(req, doc.id, 'received');
            });
            
            content.innerHTML = html;
            
        } catch (error) {
            console.error('Load requests error:', error);
            content.innerHTML = `
                <p style="text-align:center;padding:40px;
                           color:var(--text-tertiary);">
                    Error loading requests
                </p>
            `;
        }
    },
    
    async loadSentRequests() {
        const content = document.getElementById('friend-requests-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="spinner" 
                 style="margin:40px auto;display:block;"></div>
        `;
        
        try {
            const snapshot = await db.collection(Collections.FRIEND_REQUESTS)
                .where('fromUserId', '==', App.currentUser.uid)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(30)
                .get();
            
            if (snapshot.empty) {
                content.innerHTML = this.renderEmptyState(
                    '📤',
                    'No Sent Requests',
                    'Friend requests you send will appear here'
                );
                return;
            }
            
            let html = '';
            
            for (const doc of snapshot.docs) {
                const req = doc.data();
                
                // Get their profile
                const userDoc = await db.collection(Collections.USERS)
                    .doc(req.toUserId).get();
                
                if (!userDoc.exists) continue;
                
                const user = userDoc.data();
                req.toName = user.displayName;
                req.toAvatar = user.photoURL || '';
                req.toUsername = user.username;
                
                html += this.renderRequestCard(req, doc.id, 'sent');
            }
            
            content.innerHTML = html || this.renderEmptyState(
                '📤', 'No Sent Requests', ''
            );
            
        } catch (error) {
            console.error('Load sent error:', error);
        }
    },
    
    async loadFriendsList() {
        const content = document.getElementById('friend-requests-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="spinner" 
                 style="margin:40px auto;display:block;"></div>
        `;
        
        try {
            // Friends = mutual follows
            const followingSnap = await db.collection(Collections.USERS)
                .doc(App.currentUser.uid)
                .collection('following')
                .limit(100)
                .get();
            
            const followingIds = followingSnap.docs.map(d => d.id);
            
            if (followingIds.length === 0) {
                content.innerHTML = this.renderEmptyState(
                    '💜',
                    'No Friends Yet',
                    'Add friends to see them here!'
                );
                return;
            }
            
            let html = '';
            let friendCount = 0;
            
            for (const uid of followingIds) {
                // Check if they follow back (mutual = friend)
                const followsBack = await db.collection(Collections.USERS)
                    .doc(uid)
                    .collection('following')
                    .doc(App.currentUser.uid)
                    .get();
                
                if (!followsBack.exists) continue;
                
                const userDoc = await db.collection(Collections.USERS)
                    .doc(uid).get();
                
                if (!userDoc.exists) continue;
                
                const user = { id: uid, ...userDoc.data() };
                friendCount++;
                
                html += this.renderFriendCard(user);
            }
            
            if (friendCount === 0) {
                content.innerHTML = this.renderEmptyState(
                    '💜',
                    'No Mutual Friends',
                    'Follow people who follow you back to become friends!'
                );
                return;
            }
            
            // Add count header
            content.innerHTML = `
                <p style="font-size:0.82rem;color:var(--text-secondary);
                           margin-bottom:12px;padding:0 4px;">
                    ${friendCount} friend${friendCount !== 1 ? 's' : ''}
                </p>
                ${html}
            `;
            
        } catch (error) {
            console.error('Load friends error:', error);
        }
    },
    
    /* ==================
       RENDER CARDS
       ================== */
    
    renderRequestCard(req, requestId, type) {
        const isReceived = type === 'received';
        const name = isReceived ? req.fromName : req.toName;
        const avatar = isReceived ? req.fromAvatar : req.toAvatar;
        const username = isReceived ? req.fromUsername : req.toUsername;
        const userId = isReceived ? req.fromUserId : req.toUserId;
        
        return `
            <div class="friend-request-card" id="req-card-${requestId}">
                <div class="friend-req-avatar-wrap" 
                     onclick="Profile.viewProfile('${userId}')">
                    <img src="${avatar || 'assets/icons/default-avatar.png'}" 
                         class="friend-req-avatar" loading="lazy">
                </div>
                <div class="friend-req-info" 
                     onclick="Profile.viewProfile('${userId}')">
                    <div class="friend-req-name">
                        ${App.escapeHtml(name || 'User')}
                    </div>
                    <div class="friend-req-username">
                        @${App.escapeHtml(username || '')}
                    </div>
                    <div class="friend-req-time">
                        ${App.timeAgo(req.createdAt)}
                    </div>
                </div>
                <div class="friend-req-actions">
                    ${isReceived ? `
                        <button class="friend-accept-btn" 
                                onclick="Friends.acceptRequest(
                                    '${requestId}', 
                                    '${req.fromUserId}'
                                ); document.getElementById('req-card-${requestId}')?.remove()">
                            Accept
                        </button>
                        <button class="friend-decline-btn" 
                                onclick="Friends.declineRequest('${requestId}');
                                         document.getElementById('req-card-${requestId}')?.remove()">
                            ✕
                        </button>
                    ` : `
                        <button class="friend-cancel-btn" 
                                onclick="Friends.cancelRequest('${req.toUserId}');
                                         document.getElementById('req-card-${requestId}')?.remove()">
                            Cancel
                        </button>
                    `}
                </div>
            </div>
        `;
    },
    
    renderFriendCard(user) {
        return `
            <div class="friend-list-card">
                <div style="position:relative;">
                    <img src="${user.photoURL || 'assets/icons/default-avatar.png'}" 
                         class="friend-list-avatar" 
                         onclick="Profile.viewProfile('${user.id}')"
                         loading="lazy">
                    <div class="friend-online-dot"></div>
                </div>
                <div class="friend-list-info" 
                     onclick="Profile.viewProfile('${user.id}')">
                    <div class="friend-list-name">
                        ${App.escapeHtml(user.displayName || 'User')}
                        ${user.isVerified ? `
                            <i class="fas fa-check-circle verified-icon" 
                               style="font-size:0.8rem;"></i>
                        ` : ''}
                    </div>
                    <div class="friend-list-username">
                        @${App.escapeHtml(user.username || '')}
                    </div>
                    <div class="friend-list-stats">
                        Lv.${user.level || 1} • 
                        ${App.formatNumber(user.followers || 0)} followers
                    </div>
                </div>
                <div class="friend-list-actions">
                    <button class="friend-msg-btn" 
                            onclick="Chat.openWithUser(
                                '${user.id}',
                                '${App.escapeHtml(user.displayName || '')}',
                                '${user.photoURL || ''}'
                            ); App.navigate('chat')">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    renderEmptyState(emoji, title, sub) {
        return `
            <div class="friend-empty-state">
                <div class="friend-empty-emoji">${emoji}</div>
                <h3>${title}</h3>
                ${sub ? `<p>${sub}</p>` : ''}
            </div>
        `;
    },
    
    /* ==================
       TAB SWITCHING
       ================== */
    
    switchRequestTab(tab, btn) {
        document.querySelectorAll('.friend-tab').forEach(t => {
            t.classList.remove('active');
        });
        btn.classList.add('active');
        
        switch (tab) {
            case 'received':
                this.loadPendingRequests();
                break;
            case 'sent':
                this.loadSentRequests();
                break;
            case 'friends':
                this.loadFriendsList();
                break;
        }
    },
    
    /* ==================
       LISTEN TO REQUESTS
       ================== */
    
    listenToRequests() {
        if (!App.currentUser) return;
        
        if (this.requestsListener) {
            this.requestsListener();
        }
        
        this.requestsListener = db.collection(Collections.FRIEND_REQUESTS)
            .where('toUserId', '==', App.currentUser.uid)
            .where('status', '==', 'pending')
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                
                // Update notification badge
                const notifBadge = document.getElementById('notif-badge');
                if (notifBadge && count > 0) {
                    notifBadge.style.display = 'flex';
                }
                
                // Update friend requests badge if page is open
                const reqBadge = document.getElementById('friend-req-badge');
                if (reqBadge) {
                    if (count > 0) {
                        reqBadge.textContent = count;
                        reqBadge.style.display = 'flex';
                    } else {
                        reqBadge.style.display = 'none';
                    }
                }
            });
    },
    
    /* ==================
       FRIEND BUTTON (Profile Page)
       ================== */
    
    async renderFriendButton(targetUserId) {
        const status = await this.getRequestStatus(targetUserId);
        
        switch (status) {
            case 'friends':
                return `
                    <button class="btn btn-secondary profile-action-btn friend-btn-friends"
                            onclick="Friends.showFriendOptions('${targetUserId}')">
                        <i class="fas fa-user-check"></i> Friends
                    </button>
                `;
            
            case 'sent':
                return `
                    <button class="btn btn-secondary profile-action-btn friend-btn-pending"
                            onclick="Friends.cancelRequest('${targetUserId}')">
                        <i class="fas fa-user-clock"></i> Requested
                    </button>
                `;
            
            case 'received':
                const receivedStatus = status;
                return `
                    <button class="btn btn-primary profile-action-btn friend-btn-accept"
                            onclick="Friends.acceptRequest(
                                '${receivedStatus.requestId}',
                                '${targetUserId}'
                            )">
                        <i class="fas fa-user-plus"></i> Accept
                    </button>
                `;
            
            default:
                return `
                    <button class="btn btn-primary profile-action-btn friend-btn-add"
                            onclick="Friends.sendRequest('${targetUserId}')">
                        <i class="fas fa-user-plus"></i> Add Friend
                    </button>
                `;
        }
    },
    
    showFriendOptions(userId) {
        const sheet = document.createElement('div');
        sheet.className = 'modal-bottom';
        sheet.style.display = 'block';
        sheet.innerHTML = `
            <div class="modal-bottom-content">
                <div class="modal-drag-handle"></div>
                <div style="text-align:center;margin-bottom:16px;">
                    <div class="friend-options-icon">👥</div>
                    <p style="font-weight:700;">You are friends!</p>
                </div>
                <button class="btn btn-full btn-secondary" 
                        style="margin-bottom:8px;"
                        onclick="Chat.openWithUser('${userId}','','');
                                 App.navigate('chat');
                                 this.closest('.modal-bottom').remove()">
                    <i class="fas fa-comment"></i> Send Message
                </button>
                <button class="btn btn-full btn-danger"
                        onclick="Friends.unfriend('${userId}');
                                 this.closest('.modal-bottom').remove()">
                    <i class="fas fa-user-minus"></i> Unfriend
                </button>
                <button class="btn btn-full btn-secondary" 
                        style="margin-top:8px;"
                        onclick="this.closest('.modal-bottom').remove()">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(sheet);
    },
    
    async unfriend(userId) {
        App.showLoading();
        
        try {
            const batch = db.batch();
            
            // Remove mutual follows
            batch.delete(
                db.collection(Collections.USERS)
                    .doc(App.currentUser.uid)
                    .collection('following')
                    .doc(userId)
            );
            batch.delete(
                db.collection(Collections.USERS)
                    .doc(userId)
                    .collection('following')
                    .doc(App.currentUser.uid)
            );
            batch.delete(
                db.collection(Collections.USERS)
                    .doc(App.currentUser.uid)
                    .collection('followers')
                    .doc(userId)
            );
            batch.delete(
                db.collection(Collections.USERS)
                    .doc(userId)
                    .collection('followers')
                    .doc(App.currentUser.uid)
            );
            
            // Update counts
            batch.update(
                db.collection(Collections.USERS).doc(App.currentUser.uid),
                {
                    followers: firebase.firestore.FieldValue.increment(-1),
                    following: firebase.firestore.FieldValue.increment(-1)
                }
            );
            batch.update(
                db.collection(Collections.USERS).doc(userId),
                {
                    followers: firebase.firestore.FieldValue.increment(-1),
                    following: firebase.firestore.FieldValue.increment(-1)
                }
            );
            
            await batch.commit();
            
            App.showToast('Unfriended', 'info');
            
        } catch (error) {
            App.showToast('Error unfriending', 'error');
        }
        
        App.hideLoading();
    }
};