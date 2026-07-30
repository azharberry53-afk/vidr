/* ============================================
   NOTIFICATIONS MODULE
   ============================================ */

const Notifications = {
    
    listener: null,
    
    listen() {
        if (!App.currentUser) return;
        
        this.listener = db.collection(Collections.NOTIFICATIONS)
            .where('userId', '==', App.currentUser.uid)
            .where('isRead', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                const badge = document.getElementById('notif-badge');
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = count > 0 ? 'flex' : 'none';
                }
            });
    },
    
    async load() {
        const list = document.getElementById('notifications-list');
        list.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
        
        try {
            const snapshot = await db.collection(Collections.NOTIFICATIONS)
                .where('userId', '==', App.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            if (snapshot.empty) {
                list.innerHTML = '<div style="text-align:center;padding:80px 20px;color:var(--text-tertiary);"><i class="fas fa-bell" style="font-size:3rem;margin-bottom:16px;opacity:0.5;display:block;"></i><p>No notifications yet</p></div>';
                return;
            }
            
            // FIXED typeConfig - check for commas!
            const typeConfig = {
                like: { icon: '❤️', text: 'liked your post' },
                comment: { icon: '💬', text: 'commented on your post' },
                follow: { icon: '👥', text: 'started following you' },
                message: { icon: '✉️', text: 'sent you a message' },
                live: { icon: '🔴', text: 'is now LIVE' },
                gift: { icon: '🎁', text: 'sent you a gift' },
                sale: { icon: '🛍️', text: 'bought your product' },
                mention: { icon: '📢', text: 'mentioned you' },
                friend_request: { icon: '👋', text: 'sent you a friend request' },
                friend_accepted: { icon: '🤝', text: 'accepted your friend request' },
                referral: { icon: '🎁', text: 'joined using your referral' }
            };
            
            let html = '';
            const batch = db.batch();
            
            snapshot.forEach(doc => {
                const notif = doc.data();
                const config = typeConfig[notif.type] || { icon: '🔔', text: 'notification' };
                
                // Escape all values
                const notifId = doc.id;
                const notifType = notif.type || '';
                const fromUserId = notif.fromUserId || '';
                const postId = notif.postId || '';
                const streamId = notif.streamId || '';
                const chatId = notif.chatId || '';
                const fromUser = (notif.fromUser || '').replace(/'/g, '&#39;');
                const fromAvatar = notif.fromAvatar || 'assets/icons/default-avatar.png';
                const message = notif.message ? `: "${(notif.message.substring(0, 30)).replace(/'/g, '&#39;')}"` : '';
                
                html += `
                    <div class="notification-item ${notif.isRead ? '' : 'unread'}" 
                         onclick="Notifications.handleClick('${notifId}','${notifType}','${fromUserId}','${postId}','${streamId}','${chatId}')">
                        <div style="position:relative;flex-shrink:0;">
                            <img src="${fromAvatar}" class="notification-avatar" loading="lazy">
                            <div style="position:absolute;bottom:-2px;right:-2px;font-size:0.9rem;">${config.icon}</div>
                        </div>
                        <div class="notification-content">
                            <div class="notification-text">
                                <strong>${fromUser}</strong>
                                ${config.text}${message}
                            </div>
                            <div class="notification-time">${App.timeAgo(notif.createdAt)}</div>
                        </div>
                        ${notif.isRead ? '' : '<div style="width:8px;height:8px;background:var(--primary);border-radius:50%;flex-shrink:0;"></div>'}
                    </div>
                `;
                
                batch.update(doc.ref, { isRead: true });
            });
            
            list.innerHTML = html;
            await batch.commit();
            
            const badge = document.getElementById('notif-badge');
            if (badge) badge.style.display = 'none';
            
        } catch (error) {
            console.error('Load notifications error:', error);
        }
    },
    
    async handleClick(notifId, type, fromUserId, postId, streamId, chatId) {
        App.closeOverlay('notifications-overlay');
        
        switch (type) {
            case 'like':
            case 'comment':
            case 'mention':
                if (postId) Profile.openPost(postId);
                break;
            case 'follow':
            case 'friend_accepted':
                if (fromUserId) Profile.viewProfile(fromUserId);
                break;
            case 'friend_request':
                if (typeof Friends !== 'undefined') {
                    Friends.openRequestsPage();
                }
                break;
            case 'message':
                if (chatId && fromUserId) {
                    const userDoc = await db.collection(Collections.USERS).doc(fromUserId).get();
                    const user = userDoc.data();
                    if (typeof Chat !== 'undefined') {
                        Chat.openRoom(chatId, fromUserId, user?.displayName || '', user?.photoURL || '');
                    }
                    App.navigate('chat');
                }
                break;
            case 'live':
                if (streamId && typeof Live !== 'undefined') Live.joinStream(streamId);
                break;
            case 'sale':
            case 'referral':
                Wallet.history();
                break;
        }
    },
    
    async send(userId, type, data = {}) {
        if (!userId || userId === App.currentUser?.uid) return;
        
        try {
            await db.collection(Collections.NOTIFICATIONS).add({
                userId: userId,
                type: type,
                fromUserId: App.currentUser?.uid || '',
                fromUser: App.currentUser?.displayName || '',
                fromAvatar: App.currentUser?.photoURL || '',
                isRead: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                ...data
            });
        } catch (error) {
            console.error('Send notification error:', error);
        }
    }
};
