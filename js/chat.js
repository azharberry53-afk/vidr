/* ============================================
   CHAT MODULE
   ============================================ */

const Chat = {
    currentChatId: null,
    currentChatUserId: null,
    messagesListener: null,
    chatsListener: null,
    selectedGift: null,
    
    /* ==================
       LOAD CHATS LIST
       ================== */
    
    loadChats() {
        if (!App.currentUser) return;
        
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
        
        if (this.chatsListener) this.chatsListener();
        
        this.chatsListener = db.collection(Collections.CHATS)
            .where('participants', 'array-contains', App.currentUser.uid)
            .orderBy('lastMessageTime', 'desc')
            .limit(50)
            .onSnapshot(async (snapshot) => {
                if (snapshot.empty) {
                    chatList.innerHTML = `
                        <div style="text-align:center;padding:80px 20px;color:var(--text-tertiary);">
                            <p style="font-size:3rem;margin-bottom:16px;">💬</p>
                            <h3>No messages yet</h3>
                            <p>Start a conversation!</p>
                        </div>
                    `;
                    return;
                }
                
                let html = '';
                
                for (const doc of snapshot.docs) {
                    const chat = doc.data();
                    const otherUserId = chat.participants.find(id => id !== App.currentUser.uid);
                    
                    if (!otherUserId) continue;
                    
                    const userDoc = await db.collection(Collections.USERS).doc(otherUserId).get();
                    if (!userDoc.exists) continue;
                    
                    const user = userDoc.data();
                    const unread = (chat.unreadCount?.[App.currentUser.uid] || 0);
                    const isLastMe = chat.lastSenderId === App.currentUser.uid;
                    const isVerified = user.isVerified;
                    
                    html += `
                        <div class="chat-item" onclick="Chat.openRoom('${doc.id}', '${otherUserId}', '${App.escapeHtml(user.displayName)}', '${user.photoURL || ''}')">
                            <div style="position:relative;">
                                <img src="${user.photoURL || 'assets/icons/default-avatar.png'}" 
                                     class="chat-item-avatar" loading="lazy">
                                <div class="online-dot" style="position:absolute;bottom:0;right:0;width:10px;height:10px;
                                     background:var(--success);border-radius:50%;border:2px solid var(--bg-secondary);"></div>
                            </div>
                            <div class="chat-item-info">
                                <div class="chat-item-name">
                                    ${App.escapeHtml(user.displayName)}
                                    ${isVerified ? '<i class="fas fa-check-circle verified-icon" style="font-size:0.8rem;"></i>' : ''}
                                </div>
                                <div class="chat-item-last">
                                    ${isLastMe ? 'You: ' : ''}${App.escapeHtml(chat.lastMessage || '')}
                                </div>
                            </div>
                            <div class="chat-item-meta">
                                <span class="chat-item-time">${App.timeAgo(chat.lastMessageTime)}</span>
                                ${unread > 0 ? `<span class="chat-unread-badge">${unread}</span>` : ''}
                            </div>
                        </div>
                    `;
                }
                
                chatList.innerHTML = html || '<div style="text-align:center;padding:40px;color:var(--text-tertiary);">No chats</div>';
                
                // Update chat badge
                const totalUnread = snapshot.docs.reduce((acc, doc) => {
                    return acc + (doc.data().unreadCount?.[App.currentUser.uid] || 0);
                }, 0);
                
                const badge = document.getElementById('chat-badge');
                if (totalUnread > 0) {
                    badge.textContent = totalUnread;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });
    },
    
    /* ==================
       OPEN CHAT ROOM
       ================== */
    
    async openRoom(chatId, userId, userName, userAvatar) {
        this.currentChatId = chatId;
        this.currentChatUserId = userId;
        
        const room = document.getElementById('chat-room');
        room.style.display = 'block';
        
        // Set header info
        document.querySelector('.chat-room-user .chat-avatar').src = userAvatar || 'assets/icons/default-avatar.png';
        document.querySelector('.chat-room-user .chat-username').textContent = userName;
        
        // Clear unread
        await db.collection(Collections.CHATS).doc(chatId).update({
            [`unreadCount.${App.currentUser.uid}`]: 0
        });
        
        // Listen to messages
        this.loadMessages(chatId);
    },
    
    async openWithUser(userId, userName, userAvatar) {
        if (!App.currentUser) return;
        
        // Find existing chat
        const existingChat = await db.collection(Collections.CHATS)
            .where('participants', 'array-contains', App.currentUser.uid)
            .get();
        
        let chatId = null;
        existingChat.forEach(doc => {
            const chat = doc.data();
            if (chat.participants.includes(userId)) {
                chatId = doc.id;
            }
        });
        
        if (!chatId) {
            // Create new chat
            const chatDoc = await db.collection(Collections.CHATS).add({
                participants: [App.currentUser.uid, userId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: '',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSenderId: null,
                unreadCount: {
                    [App.currentUser.uid]: 0,
                    [userId]: 0
                },
                isMessageRequest: true,
                requestAccepted: false,
                firstMessageSent: false
            });
            chatId = chatDoc.id;
        }
        
        this.openRoom(chatId, userId, userName, userAvatar);
    },
    
    /* ==================
       MESSAGES
       ================== */
    
    loadMessages(chatId) {
        const messagesEl = document.getElementById('chat-messages');
        messagesEl.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
        
        if (this.messagesListener) this.messagesListener();
        
        this.messagesListener = db.collection(Collections.CHATS)
            .doc(chatId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(100)
            .onSnapshot((snapshot) => {
            if (change.type === 'added') {
                const msg = change.doc.data();
                // Only play for received messages
                if (msg.senderId !== App.currentUser.uid) {
                    Sound.play('message');
                    Sound.haptic('notification');
      
                messagesEl.innerHTML = '';
                
                let lastDate = null;
                
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    const isMe = msg.senderId === App.currentUser.uid;
                    const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
                    
                    // Date separator
                    const dateStr = msgDate.toLocaleDateString();
                    if (dateStr !== lastDate) {
                        messagesEl.innerHTML += `
                            <div style="text-align:center;padding:8px 0;color:var(--text-tertiary);font-size:0.72rem;">
                                ${dateStr}
                            </div>
                        `;
                        lastDate = dateStr;
                    }
                    
                    messagesEl.innerHTML += this.renderMessage(msg, isMe);
                });
                
                // Scroll to bottom
                messagesEl.scrollTop = messagesEl.scrollHeight;
            });
    },
    
    renderMessage(msg, isMe) {
        // Sticker message
        if (msg.type === 'sticker') {
            return `
                <div class="message-bubble message-sticker" style="align-self:${isMe ? 'flex-end' : 'flex-start'}">
                    <div style="font-size:3rem;text-align:${isMe ? 'right' : 'left'}">${msg.sticker}</div>
                </div>
            `;
        }
        
        // Post share
        if (msg.type === 'post_share') {
            return `
                <div class="message-bubble ${isMe ? 'message-sent' : 'message-received'}">
                    <p style="font-size:0.78rem;margin-bottom:6px;">📤 Shared a post</p>
                    <div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:8px;cursor:pointer;" 
                         onclick="Profile.openPost('${msg.postId}')">
                        ${msg.postThumb ? `<img src="${msg.postThumb}" style="width:100%;border-radius:6px;margin-bottom:4px;">` : ''}
                        <p style="font-size:0.75rem;">${App.escapeHtml(msg.postCaption || 'View post')}</p>
                    </div>
                    <p class="message-time">${App.timeAgo(msg.createdAt)}</p>
                </div>
            `;
        }
        
        // Image message
        if (msg.type === 'image') {
            return `
                <div class="message-bubble ${isMe ? 'message-sent' : 'message-received'}" style="max-width:200px;padding:4px;">
                    <img src="${msg.imageURL}" style="width:100%;border-radius:8px;" loading="lazy">
                    <p class="message-time" style="padding:4px;">${App.timeAgo(msg.createdAt)}</p>
                </div>
            `;
        }
        
        // Text message
        return `
            <div class="message-bubble ${isMe ? 'message-sent' : 'message-received'}">
                ${App.escapeHtml(msg.text || '')}
                <p class="message-time">${App.timeAgo(msg.createdAt)}</p>
            </div>
        `;
    },
    
    /* ==================
       SEND MESSAGE
       ================== */
    
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        
        if (!text || !this.currentChatId) return;
        
        input.value = '';
        
        // Check message request logic
        const chatDoc = await db.collection(Collections.CHATS).doc(this.currentChatId).get();
        const chatData = chatDoc.data();
        
        if (chatData.isMessageRequest && !chatData.requestAccepted) {
            if (chatData.firstMessageSent && chatData.participants[0] !== App.currentUser.uid) {
                App.showToast('Waiting for acceptance...', 'info');
                return;
            }
        }
        
        const message = {
            senderId: App.currentUser.uid,
            senderName: App.currentUser.displayName,
            senderAvatar: App.currentUser.photoURL,
            text: text,
            type: 'text',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection(Collections.CHATS)
            .doc(this.currentChatId)
            .collection('messages')
            .add(message);
        
        const otherUserId = chatData.participants.find(id => id !== App.currentUser.uid);
        
        await db.collection(Collections.CHATS).doc(this.currentChatId).update({
            lastMessage: text.substring(0, 50),
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastSenderId: App.currentUser.uid,
            firstMessageSent: true,
            [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
        });
        
        App.addXP(1, 'chat');
        App.grantAchievement('chatter', 1);
        
        // Notification
        Notifications.send(otherUserId, 'message', {
 Sound.play('whoosh');
    Sound.haptic('light');
            fromUser: App.currentUser.displayName,
            fromAvatar: App.currentUser.photoURL,
            message: text.substring(0, 50),
            chatId: this.currentChatId
        });
    },
    
    async sendPostToFriend(friendId, postId) {
        const postDoc = await db.collection(Collections.POSTS).doc(postId).get();
        const post = postDoc.data();
        
        let chatId = null;
        
        const existingChat = await db.collection(Collections.CHATS)
            .where('participants', 'array-contains', App.currentUser.uid)
            .get();
        
        existingChat.forEach(doc => {
            if (doc.data().participants.includes(friendId)) {
                chatId = doc.id;
            }
        });
        
        if (!chatId) {
            const chatDoc = await db.collection(Collections.CHATS).add({
                participants: [App.currentUser.uid, friendId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: '📤 Shared a post',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSenderId: App.currentUser.uid,
                unreadCount: { [App.currentUser.uid]: 0, [friendId]: 1 },
                isMessageRequest: false,
                requestAccepted: true,
                firstMessageSent: true
            });
            chatId = chatDoc.id;
        }
        
        await db.collection(Collections.CHATS)
            .doc(chatId)
            .collection('messages')
            .add({
                senderId: App.currentUser.uid,
                type: 'post_share',
                postId: postId,
                postThumb: post?.type === 'images' ? post?.imageURLs?.[0] : post?.thumbnailURL,
                postCaption: post?.caption?.substring(0, 50) || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        await db.collection(Collections.CHATS).doc(chatId).update({
            lastMessage: '📤 Shared a post',
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastSenderId: App.currentUser.uid,
            [`unreadCount.${friendId}`]: firebase.firestore.FieldValue.increment(1)
        });
    },
    
    /* ==================
       STICKERS
       ================== */
    
    openStickers() {
        document.getElementById('sticker-panel').style.display = 'block';
        this.loadStickers('default');
    },
    
    loadStickers(pack) {
        const grid = document.getElementById('sticker-grid');
        
        const stickers = {
            default: ['😀', '😂', '🥰', '😎', '🤩', '😢', '😡', '😱', '🥳', '🤔', '😏', '🥺', '😍', '🤣', '😅', '😴', '🫡', '🫶'],
            love: ['❤️', '💕', '💖', '💗', '💓', '💝', '💘', '💟', '🩷', '🫀', '😘', '🥰', '💋', '💌', '💞', '🌹', '🌷', '💐'],
            fun: ['🎉', '🎊', '🎈', '🥂', '🎁', '🎯', '🎮', '🎰', '🃏', '🎭', '🪄', '⭐', '🌈', '🦄', '🔥', '💫', '✨', '💥'],
            animated: ['🌀', '⚡', '🌊', '🌪️', '🎆', '🎇', '💫', '✨', '💥', '🔮', '🌟', '💎', '🏆', '👑', '🚀', '🌙', '☀️', '🎭']
        };
        
        grid.innerHTML = (stickers[pack] || stickers.default).map(emoji => `
            <div class="sticker-item ${pack === 'animated' ? 'animated' : ''}" 
                 onclick="Chat.sendSticker('${emoji}')">
                ${emoji}
            </div>
        `).join('');
    },
    
    async sendSticker(emoji) {
        if (!this.currentChatId) return;
        
        App.closeModal('sticker-panel');
        
        const chatDoc = await db.collection(Collections.CHATS).doc(this.currentChatId).get();
        const otherUserId = chatDoc.data().participants.find(id => id !== App.currentUser.uid);
        
        await db.collection(Collections.CHATS)
            .doc(this.currentChatId)
            .collection('messages')
            .add({
                senderId: App.currentUser.uid,
                type: 'sticker',
                sticker: emoji,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        await db.collection(Collections.CHATS).doc(this.currentChatId).update({
            lastMessage: `${emoji} Sticker`,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastSenderId: App.currentUser.uid,
            [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
        });
    },
    
    /* ==================
       MEDIA ATTACH
       ================== */
    
    attachMedia() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            App.showLoading();
            
            try {
                const ref = storage.ref(`chat-media/${App.currentUser.uid}/${Date.now()}`);
                await ref.put(file);
                const url = await ref.getDownloadURL();
                
                const chatDoc = await db.collection(Collections.CHATS).doc(this.currentChatId).get();
                const otherUserId = chatDoc.data().participants.find(id => id !== App.currentUser.uid);
                
                await db.collection(Collections.CHATS)
                    .doc(this.currentChatId)
                    .collection('messages')
                    .add({
                        senderId: App.currentUser.uid,
                        type: 'image',
                        imageURL: url,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                await db.collection(Collections.CHATS).doc(this.currentChatId).update({
                    lastMessage: '📷 Photo',
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastSenderId: App.currentUser.uid,
                    [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
                });
            } catch (error) {
                App.showToast('Error sending image', 'error');
            }
            
            App.hideLoading();
        };
        input.click();
    },
    
    /* ==================
       GROUP CHAT
       ================== */
    
    async newChat() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:420px;background:var(--bg-secondary);border-radius:var(--radius-xl);
                        overflow:hidden;max-height:80vh;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>New Message</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:12px 16px;">
                    <input type="text" placeholder="Search users..." class="form-input"
                           oninput="Chat.searchForChat(this.value, 'chat-search-results')" style="margin-bottom:12px;">
                    <div id="chat-search-results"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    /* ============================================
   FIX: js/chat.js
   Replace searchForChat and add startChatWithUser
   ============================================ */

    async searchForChat(query, resultId) {
        if (!query.trim()) return;
        
        const snapshot = await db.collection(Collections.USERS)
            .where('username', '>=', query.toLowerCase())
            .where('username', '<=', query.toLowerCase() + '\uf8ff')
            .limit(10)
            .get();
        
        const el = document.getElementById(resultId);
        if (!el) return;
        
        let html = '';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            if (doc.id === App.currentUser.uid) return;
            if (user.role === 'admin' && !App.isAdmin) return;
            
            // ✅ Extract values safely
            const uid = doc.id;
            const displayName = App.escapeHtml(user.displayName || '');
            const username = App.escapeHtml(user.username || '');
            const photoURL = user.photoURL || 'assets/icons/default-avatar.png';
            
            html += `
                <div class="search-result-item" onclick="Chat.startChatWithUser('${uid}')">
                    <img src="${photoURL}" class="search-result-avatar" loading="lazy"
                         onerror="this.src='assets/icons/default-avatar.png'">
                    <div class="search-result-info">
                        <div class="search-result-name">${displayName}</div>
                        <div class="search-result-username">@${username}</div>
                    </div>
                </div>
            `;
        });
        
        el.innerHTML = html || '<p style="text-align:center;color:var(--text-tertiary);padding:20px;">No users found</p>';
    },
    
    // NEW helper method - fixes escape issues
    async startChatWithUser(uid) {
        // Close any open modal
        document.querySelector('.modal-overlay')?.remove();
        
        try {
            const userDoc = await db.collection(Collections.USERS).doc(uid).get();
            if (!userDoc.exists) {
                App.showToast('User not found', 'error');
                return;
            }
            
            const user = userDoc.data();
            this.openWithUser(uid, user.displayName || '', user.photoURL || '');
        } catch (error) {
            App.showToast('Error opening chat', 'error');
        }
    },
    
    /* ==================
       ROOM OPTIONS
       ================== */
    
    roomOptions() {
        const options = document.createElement('div');
        options.className = 'modal-bottom';
        options.style.display = 'block';
        options.innerHTML = `
            <div class="modal-bottom-content">
                <div class="modal-drag-handle"></div>
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;"
                        onclick="Profile.viewProfile('${this.currentChatUserId}'); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-user"></i> View Profile
                </button>
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;"
                        onclick="Chat.clearChat(); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-trash"></i> Clear Chat
                </button>
                <button class="btn btn-full btn-danger" style="margin-bottom:8px;"
                        onclick="Profile.blockUser('${this.currentChatUserId}'); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-ban"></i> Block User
                </button>
                <button class="btn btn-full btn-secondary"
                        onclick="this.closest('.modal-bottom').remove()">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(options);
    },
    
    async clearChat() {
        const batch = db.batch();
        const messages = await db.collection(Collections.CHATS)
            .doc(this.currentChatId)
            .collection('messages')
            .get();
        
        messages.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        App.showToast('Chat cleared', 'success');
    },
    
    closeRoom() {
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
        document.getElementById('chat-room').style.display = 'none';
        this.currentChatId = null;
        this.currentChatUserId = null;
    }
};
