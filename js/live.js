/* ============================================
   LIVE STREAMING MODULE
   ============================================ */

const Live = {
    setupStream: null,
    localStream: null,
    peerConnection: null,
    currentStreamId: null,
    currentHostId: null,
    isHost: false,
    viewerCount: 0,
    battleOpponent: null,
    battleScore: { left: 50, right: 50 },
    activeFilters: 'none',
    facingMode: 'user',
    liveListeners: [],
    selectedGift: null,
    giftTab: 'free',
    filterCanvas: null,
    filterContext: null,
    filterInterval: null,
    
    /* ==================
       START LIVE
       ================== */
    
    async start() {
        const title = document.getElementById('live-title')?.value.trim() || 'My Live Stream';
        const shopEnabled = document.getElementById('live-shop-enable')?.checked || false;
        
        // Close setup modal
        document.querySelector('.modal-overlay')?.remove();
        
        App.showLoading();
        
        try {
            // Get camera stream
            this.localStream = this.setupStream || await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            
            // Create live stream document
            const streamDoc = await db.collection(Collections.LIVE_STREAMS).add({
                hostId: App.currentUser.uid,
                hostName: App.currentUser.displayName,
                hostAvatar: App.currentUser.photoURL,
                hostVerified: App.currentUser.isVerified,
                title: title,
                isActive: true,
                shopEnabled: shopEnabled,
                viewers: 0,
                totalGifts: 0,
                battleActive: false,
                battleOpponentId: null,
                startedAt: firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    filtersEnabled: true,
                    guestsEnabled: false
                }
            });
            
            this.currentStreamId = streamDoc.id;
            this.isHost = true;
            
            // Setup live page
            const livePage = document.getElementById('live-page');
            livePage.style.display = 'block';
            
            const video = document.getElementById('live-video');
            video.srcObject = this.localStream;
            video.muted = true; // Host doesn't hear themselves
            
            // Set host info
            document.getElementById('live-host-avatar').src = App.currentUser.photoURL || 'assets/icons/default-avatar.png';
            document.getElementById('live-host-name').textContent = App.currentUser.displayName;
            
            // Show host controls
            this.setupHostControls();
            
            // Show shop button if enabled
            if (shopEnabled && (App.currentUser.isVerified || App.isAdmin)) {
                document.getElementById('live-shop-btn').style.display = 'flex';
            }
            
            // Listen to live events
            this.listenToLiveEvents();
            
            // Simulate viewer counter updates
            this.startViewerSimulation();
            
            // Add XP for going live
            App.addXP(20, 'live');
            App.grantAchievement('streamer', 1);
            
            // Notify followers
            this.notifyFollowers(title);
            
            App.showToast('🔴 You are LIVE!', 'success');
            
        } catch (error) {
            console.error('Live start error:', error);
            App.showToast('Cannot access camera/microphone', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       JOIN STREAM
       ================== */
    
    async joinStream(streamId) {
        App.showLoading();
        
        try {
            const streamDoc = await db.collection(Collections.LIVE_STREAMS).doc(streamId).get();
            if (!streamDoc.exists || !streamDoc.data().isActive) {
                App.showToast('Stream has ended', 'info');
                App.hideLoading();
                return;
            }
            
            const stream = streamDoc.data();
            this.currentStreamId = streamId;
            this.currentHostId = stream.hostId;
            this.isHost = false;
            
            // Setup live page for viewer
            const livePage = document.getElementById('live-page');
            livePage.style.display = 'block';
            
            // Set stream info
            document.getElementById('live-host-avatar').src = stream.hostAvatar || 'assets/icons/default-avatar.png';
            document.getElementById('live-host-name').textContent = stream.hostName;
            document.getElementById('live-viewer-count').textContent = App.formatNumber(stream.viewers || 0);
            
            // Show shop if enabled
            if (stream.shopEnabled) {
                document.getElementById('live-shop-btn').style.display = 'flex';
            }
            
            // Increment viewer count
            await db.collection(Collections.LIVE_STREAMS).doc(streamId).update({
                viewers: firebase.firestore.FieldValue.increment(1)
            });
            
            // Listen to live events
            this.listenToLiveEvents();
            
            // Send join message
            this.sendLiveComment(`${App.currentUser.displayName} joined the stream 👋`);
            
            // Add XP for watching
            App.addXP(1, 'watch_live');
            
        } catch (error) {
            console.error('Join stream error:', error);
            App.showToast('Error joining stream', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       LEAVE STREAM
       ================== */
    
    async leave() {
        if (this.isHost) {
            // End stream
            await db.collection(Collections.LIVE_STREAMS).doc(this.currentStreamId).update({
                isActive: false,
                endedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Stop media tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            // Stop filter processing
            if (this.filterInterval) {
                clearInterval(this.filterInterval);
                this.filterInterval = null;
            }
            
            App.showToast('Live ended', 'info');
        } else {
            // Decrement viewer
            if (this.currentStreamId) {
                await db.collection(Collections.LIVE_STREAMS).doc(this.currentStreamId).update({
                    viewers: firebase.firestore.FieldValue.increment(-1)
                });
            }
        }
        
        // Remove listeners
        this.liveListeners.forEach(unsub => unsub());
        this.liveListeners = [];
        
        // Clear intervals
        if (this.viewerSimInterval) clearInterval(this.viewerSimInterval);
        
        // Reset
        this.currentStreamId = null;
        this.currentHostId = null;
        this.isHost = false;
        this.battleOpponent = null;
        
        // Clear UI
        document.getElementById('live-page').style.display = 'none';
        document.getElementById('live-comments').innerHTML = '';
        document.getElementById('gift-overlay').innerHTML = '';
        document.getElementById('live-battle').style.display = 'none';
        document.getElementById('live-shop-btn').style.display = 'none';
    },
    
    /* ==================
       LIVE EVENTS LISTENER
       ================== */
    
    listenToLiveEvents() {
        if (!this.currentStreamId) return;
        
        // Listen to stream doc for viewer count, battle status
        const streamListener = db.collection(Collections.LIVE_STREAMS)
            .doc(this.currentStreamId)
            .onSnapshot(doc => {
                if (!doc.exists) {
                    this.leave();
                    return;
                }
                
                const data = doc.data();
                
                if (!data.isActive && !this.isHost) {
                    App.showToast('Stream ended', 'info');
                    this.leave();
                    return;
                }
                
                // Update viewer count
                document.getElementById('live-viewer-count').textContent = App.formatNumber(data.viewers || 0);
                
                // Battle status
                if (data.battleActive) {
                    document.getElementById('live-battle').style.display = 'block';
                    this.updateBattleBar(data.battleScores);
                }
            });
        
        this.liveListeners.push(streamListener);
        
        // Listen to live comments
        const commentsListener = db.collection(Collections.LIVE_STREAMS)
            .doc(this.currentStreamId)
            .collection('comments')
            .orderBy('createdAt', 'asc')
            .limitToLast(50)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        this.appendLiveComment(change.doc.data());
                    }
                });
            });
        
        this.liveListeners.push(commentsListener);
        
        // Listen to gifts
        const giftsListener = db.collection(Collections.LIVE_STREAMS)
            .doc(this.currentStreamId)
            .collection('gifts')
            .orderBy('sentAt', 'desc')
            .limitToLast(10)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        this.showGiftEffect(change.doc.data());
                    }
                });
            });
        
        this.liveListeners.push(giftsListener);
    },
    
    /* ==================
       LIVE COMMENTS
       ================== */
    
    appendLiveComment(commentData) {
        const commentsEl = document.getElementById('live-comments');
        
        const commentEl = document.createElement('div');
        commentEl.className = 'live-comment';
        commentEl.innerHTML = `
            <img src="${commentData.userAvatar || 'assets/icons/default-avatar.png'}" 
                 class="live-comment-avatar" loading="lazy">
            <div>
                <span class="live-comment-name">${App.escapeHtml(commentData.userName)}</span>
                ${commentData.isVerified ? '<i class="fas fa-check-circle" style="color:var(--accent);font-size:0.7rem;"></i>' : ''}
                <span class="live-comment-text"> ${App.escapeHtml(commentData.text)}</span>
            </div>
        `;
        
        commentsEl.appendChild(commentEl);
        
        // Keep only last 20 comments visible
        const comments = commentsEl.querySelectorAll('.live-comment');
        if (comments.length > 20) {
            comments[0].remove();
        }
        
        commentsEl.scrollTop = commentsEl.scrollHeight;
    },
    
    async sendLiveComment(text) {
        if (!text.trim() || !this.currentStreamId) return;
        
        const input = document.getElementById('live-comment-input');
        if (input && !text.startsWith(App.currentUser?.displayName)) {
            input.value = '';
        }
        
        await db.collection(Collections.LIVE_STREAMS)
            .doc(this.currentStreamId)
            .collection('comments')
            .add({
                userId: App.currentUser.uid,
                userName: App.currentUser.displayName,
                userAvatar: App.currentUser.photoURL,
                isVerified: App.currentUser.isVerified,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    /* ==================
       GIFT SYSTEM
       ================== */
    
    openGifts() {
        const panel = document.getElementById('gift-panel');
        panel.style.display = 'block';
        
        document.getElementById('gift-free-balance').textContent = 
            App.formatNumber(App.currentUser?.freeCoins || 0);
        document.getElementById('gift-gold-balance').textContent = 
            App.formatNumber(App.currentUser?.goldCoins || 0);
        
        this.loadGifts('free');
    },
    
    switchGiftTab(tab) {
        this.giftTab = tab;
        document.querySelectorAll('.gift-tab').forEach(t => {
            t.classList.toggle('active', t.textContent.includes(tab === 'free' ? 'Free' : 'Paid'));
        });
        this.loadGifts(tab);
    },
    
    loadGifts(tab) {
        const grid = document.getElementById('gift-grid');
        
        const freeGifts = [
            { id: 'rose', name: 'Rose', emoji: '🌹', cost: 1, type: 'free', effect: 'rose' },
            { id: 'heart', name: 'Heart', emoji: '❤️', cost: 5, type: 'free', effect: 'heart' },
            { id: 'star', name: 'Star', emoji: '⭐', cost: 10, type: 'free', effect: 'star' },
            { id: 'fire', name: 'Fire', emoji: '🔥', cost: 20, type: 'free', effect: 'fire' },
            { id: 'crown', name: 'Crown', emoji: '👑', cost: 50, type: 'free', effect: 'crown' },
            { id: 'diamond', name: 'Diamond', emoji: '💎', cost: 100, type: 'free', effect: 'diamond' },
            { id: 'rocket', name: 'Rocket', emoji: '🚀', cost: 200, type: 'free', effect: 'rocket' },
            { id: 'galaxy', name: 'Galaxy', emoji: '🌌', cost: 500, type: 'free', effect: 'galaxy' }
        ];
        
        const paidGifts = [
            { id: 'lollipop', name: 'Lollipop', emoji: '🍭', cost: 1, type: 'paid', effect: 'candy' },
            { id: 'icecream', name: 'Ice Cream', emoji: '🍦', cost: 5, type: 'paid', effect: 'icecream' },
            { id: 'cake', name: 'Cake', emoji: '🎂', cost: 10, type: 'paid', effect: 'cake' },
            { id: 'car', name: 'Sports Car', emoji: '🏎️', cost: 50, type: 'paid', effect: 'car' },
            { id: 'yacht', name: 'Yacht', emoji: '🛥️', cost: 100, type: 'paid', effect: 'yacht' },
            { id: 'lion', name: 'Lion', emoji: '🦁', cost: 500, type: 'paid', effect: 'lion' },
            { id: 'universe', name: 'Universe', emoji: '🌌', cost: 1000, type: 'paid', effect: 'universe' },
            { id: 'vidr_gift', name: 'Vidr Special', emoji: '💜', cost: 5000, type: 'paid', effect: 'vidr' }
        ];
        
        const gifts = tab === 'free' ? freeGifts : paidGifts;
        
        grid.innerHTML = gifts.map(gift => `
            <div class="gift-item" onclick="Live.selectGift(${JSON.stringify(gift).replace(/"/g, '&quot;')}, this)" 
                 id="gift-${gift.id}">
                <span class="gift-emoji">${gift.emoji}</span>
                <span class="gift-name">${gift.name}</span>
                <span class="gift-price">${gift.type === 'free' ? '⚡' : '🪙'} ${gift.cost}</span>
            </div>
        `).join('');
    },
    
    selectGift(gift, el) {
        this.selectedGift = gift;
        document.querySelectorAll('.gift-item').forEach(g => g.classList.remove('selected'));
        el.classList.add('selected');
    },
    
    async sendGift() {
        if (!this.selectedGift || !this.currentStreamId) {
            App.showToast('Select a gift first', 'warning');
            return;
        }
        
        const gift = this.selectedGift;
        const isFreeCoin = gift.type === 'free';
        const balance = isFreeCoin ? App.currentUser?.freeCoins : App.currentUser?.goldCoins;
        const field = isFreeCoin ? 'freeCoins' : 'goldCoins';
        
        if ((balance || 0) < gift.cost) {
            App.showToast(`Not enough ${isFreeCoin ? 'free coins ⚡' : 'gold coins 🪙'}`, 'warning');
            if (!isFreeCoin) {
                App.closeModal('gift-panel');
                document.getElementById('wallet-overlay').style.display = 'block';
                Wallet.showCoinPackages();
            }
            return;
        }
        
        App.closeModal('gift-panel');
        
        try {
            // Deduct coins
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                [field]: firebase.firestore.FieldValue.increment(-gift.cost)
            });
            App.currentUser[field] = (App.currentUser[field] || 0) - gift.cost;
            
            // Platform takes 8% if paid gift (to admin revenue)
            const platformFee = isFreeCoin ? 0 : gift.cost * 0.08;
            const hostEarning = isFreeCoin ? 0 : gift.cost * 0.92;
            
            // Add gift to stream
            await db.collection(Collections.LIVE_STREAMS)
                .doc(this.currentStreamId)
                .collection('gifts')
                .add({
                    senderId: App.currentUser.uid,
                    senderName: App.currentUser.displayName,
                    senderAvatar: App.currentUser.photoURL,
                    giftId: gift.id,
                    giftName: gift.name,
                    giftEmoji: gift.emoji,
                    giftEffect: gift.effect,
                    giftCost: gift.cost,
                    giftType: gift.type,
                    hostEarning: hostEarning,
                    sentAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Give host their earning (paid gifts)
            if (!isFreeCoin && this.currentHostId) {
                await db.collection(Collections.USERS).doc(this.currentHostId).update({
                    goldCoins: firebase.firestore.FieldValue.increment(hostEarning)
                });
                
                // Record transaction
                await db.collection(Collections.TRANSACTIONS).add({
                    type: 'gift',
                    fromUserId: App.currentUser.uid,
                    toUserId: this.currentHostId,
                    amount: gift.cost,
                    platformFee: platformFee,
                    hostEarning: hostEarning,
                    giftId: gift.id,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Update stream gift total
            await db.collection(Collections.LIVE_STREAMS).doc(this.currentStreamId).update({
                totalGifts: firebase.firestore.FieldValue.increment(gift.cost)
            });
            
            // Update user gift stats
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                totalGiftsSent: firebase.firestore.FieldValue.increment(gift.cost)
            });
            
            // XP
            App.addXP(5, 'gift');
            App.grantAchievement('gifter', 1);
            App.grantAchievement('earner', gift.cost);
            
            // Update coin display
            App.updateCoinDisplay();
            
            // Add live comment about gift
            this.sendLiveComment(`${App.currentUser.displayName} sent ${gift.emoji} ${gift.name}!`);
            
            // Battle update
            if (this.currentStreamId && this.battleOpponent) {
                this.updateBattleScore(gift.cost);
            }
            
        } catch (error) {
            console.error('Gift error:', error);
            App.showToast('Error sending gift', 'error');
        }
        
        this.selectedGift = null;
    },
    
    /* ==================
       GIFT OVERLAY EFFECTS
       ================== */
    
    showGiftEffect(giftData) {
        const overlay = document.getElementById('gift-overlay');
        
        const effectEl = document.createElement('div');
        effectEl.className = 'gift-effect';
        effectEl.style.cssText = `
            position: absolute;
            font-size: 4rem;
            animation: giftAppear 3s ease forwards;
            pointer-events: none;
            z-index: 30;
            top: 30%;
            left: 50%;
            transform: translateX(-50%);
        `;
        
        // Special effects for expensive gifts
        let effectContent = '';
        
        switch (giftData.giftEffect) {
            case 'vidr':
                effectContent = `
                    <div style="text-align:center;">
                        <div style="font-size:5rem;animation:spin 1s linear infinite;">💜</div>
                        <div style="color:white;font-weight:800;font-size:1.2rem;text-shadow:0 0 20px rgba(192,132,252,0.8);">VIDR SPECIAL!</div>
                    </div>
                `;
                this.createParticles(overlay, '💜', 30);
                break;
            case 'universe':
                effectContent = `
                    <div style="text-align:center;">
                        <div style="font-size:5rem;">🌌</div>
                        <div style="color:white;font-weight:800;">UNIVERSE!</div>
                    </div>
                `;
                this.createParticles(overlay, '⭐', 20);
                break;
            case 'lion':
                effectContent = `<div style="font-size:6rem;">🦁</div>`;
                this.createParticles(overlay, '✨', 15);
                break;
            case 'yacht':
                effectContent = `<div style="font-size:5rem;">🛥️</div>`;
                this.createParticles(overlay, '💦', 10);
                break;
            case 'car':
                effectContent = `
                    <div style="font-size:4rem;animation:slideInRight 0.5s ease;">🏎️</div>
                `;
                break;
            default:
                effectContent = `<div style="font-size:4rem;">${giftData.giftEmoji}</div>`;
        }
        
        effectEl.innerHTML = `
            <div style="text-align:center;">
                ${effectContent}
                <div style="color:white;font-size:0.85rem;background:rgba(0,0,0,0.5);
                             padding:4px 12px;border-radius:var(--radius-full);margin-top:8px;
                             backdrop-filter:blur(10px);">
                    <strong>${App.escapeHtml(giftData.senderName)}</strong> sent ${giftData.giftEmoji}
                </div>
            </div>
        `;
        
        overlay.appendChild(effectEl);
        
        setTimeout(() => {
            if (effectEl.parentNode) effectEl.remove();
        }, 3000);
    },
    
    createParticles(container, emoji, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    font-size: ${Math.random() * 1.5 + 0.8}rem;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    animation: confetti ${Math.random() * 2 + 1}s ease forwards;
                    pointer-events: none;
                    z-index: 25;
                `;
                particle.textContent = emoji;
                container.appendChild(particle);
                
                setTimeout(() => particle.remove(), 3000);
            }, i * 100);
        }
    },
    
    /* ==================
       LIVE BATTLE SYSTEM
       ================== */
    
    async challengeBattle(opponentStreamId) {
        if (!this.isHost) return;
        
        await db.collection(Collections.LIVE_STREAMS).doc(this.currentStreamId).update({
            battleActive: true,
            battleOpponentId: opponentStreamId,
            battleScores: {
                [this.currentStreamId]: 0,
                [opponentStreamId]: 0
            },
            battleStarted: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('live-battle').style.display = 'block';
        
        App.showToast('Battle started! 🥊', 'success');
        
        // Auto end battle after 60 seconds
        setTimeout(() => this.endBattle(), 60000);
    },
    
    updateBattleScore(giftAmount) {
        this.battleScore.left = Math.min(95, this.battleScore.left + (giftAmount / 10));
        this.battleScore.right = Math.max(5, 100 - this.battleScore.left);
        
        document.getElementById('battle-bar-left').style.width = this.battleScore.left + '%';
        document.getElementById('battle-bar-right').style.width = this.battleScore.right + '%';
    },
    
    updateBattleBar(scores) {
        if (!scores) return;
        const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
        const myScore = scores[this.currentStreamId] || 0;
        const percentage = (myScore / total) * 100;
        
        document.getElementById('battle-bar-left').style.width = percentage + '%';
        document.getElementById('battle-bar-right').style.width = (100 - percentage) + '%';
    },
    
    endBattle() {
        if (!this.isHost || !this.currentStreamId) return;
        
        db.collection(Collections.LIVE_STREAMS).doc(this.currentStreamId).update({
            battleActive: false,
            battleOpponentId: null
        });
        
        document.getElementById('live-battle').style.display = 'none';
        this.battleOpponent = null;
    },
    
    /* ==================
       CAMERA FILTERS
       ================== */
    
    toggleFilters() {
        const filtersEl = document.getElementById('live-filters');
        filtersEl.style.display = filtersEl.style.display === 'none' ? 'block' : 'none';
        
        // Bind filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyFilter(btn.dataset.filter);
            };
        });
    },
    
    applyFilter(filterName) {
        this.activeFilters = filterName;
        const video = document.getElementById('live-video');
        
        const filters = {
            none: 'none',
            beauty: 'brightness(1.1) contrast(0.9) saturate(1.2)',
            warm: 'sepia(0.4) saturate(1.3) brightness(1.05)',
            cool: 'hue-rotate(20deg) saturate(1.2) brightness(1.05)',
            vintage: 'sepia(0.6) contrast(1.1) brightness(0.9)',
            bw: 'grayscale(1) contrast(1.1)'
        };
        
        video.style.filter = filters[filterName] || 'none';
    },
    
    /* ==================
       SWITCH CAMERA
       ================== */
    
    async switchCamera() {
        if (!this.localStream) return;
        
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        
        try {
            this.localStream.getTracks().forEach(track => track.stop());
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.facingMode },
                audio: true
            });
            
            const video = document.getElementById('live-video');
            video.srcObject = this.localStream;
            
            // Reapply filter
            this.applyFilter(this.activeFilters);
            
        } catch (error) {
            App.showToast('Cannot switch camera', 'error');
        }
    },
    
    /* ==================
       HOST CONTROLS
       ================== */
    
    setupHostControls() {
        const overlay = document.querySelector('.live-overlay');
        
        // Add host control buttons
        const hostControls = document.createElement('div');
        hostControls.style.cssText = `
            position: absolute;
            top: 60px;
            right: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 20;
        `;
        hostControls.innerHTML = `
            <button onclick="Live.switchCamera()" class="live-action-btn" title="Switch Camera">
                <i class="fas fa-sync"></i>
            </button>
            <button onclick="Live.toggleFilters()" class="live-action-btn" title="Filters">
                <i class="fas fa-magic"></i>
            </button>
            <button onclick="Live.toggleMic()" class="live-action-btn" id="mic-btn" title="Mute/Unmute">
                <i class="fas fa-microphone"></i>
            </button>
            <button onclick="Live.share()" class="live-action-btn" title="Share">
                <i class="fas fa-share"></i>
            </button>
            <button onclick="Live.findBattle()" class="live-action-btn" title="Battle" style="color:#ef4444;">
                ⚔️
            </button>
        `;
        
        overlay.appendChild(hostControls);
    },
    
    toggleMic() {
        if (!this.localStream) return;
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const btn = document.getElementById('mic-btn');
            btn.innerHTML = audioTrack.enabled 
                ? '<i class="fas fa-microphone"></i>' 
                : '<i class="fas fa-microphone-slash"></i>';
            btn.style.color = audioTrack.enabled ? 'white' : 'var(--danger)';
        }
    },
    
    /* ==================
       SHARE LIVE
       ================== */
    
    share() {
        const link = `https://vidr.click/live/${this.currentStreamId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Watch me live on Vidr!',
                text: `${App.currentUser?.displayName} is live!`,
                url: link
            });
        } else {
            navigator.clipboard.writeText(link).then(() => {
                App.showToast('Live link copied! 📋', 'success');
            });
        }
    },
    
    /* ==================
       NOTIFY FOLLOWERS
       ================== */
    
    async notifyFollowers(title) {
        try {
            const followersSnap = await db.collection(Collections.USERS)
                .doc(App.currentUser.uid)
                .collection('followers')
                .limit(100)
                .get();
            
            const batch = db.batch();
            
            followersSnap.docs.forEach(doc => {
                const notifRef = db.collection(Collections.NOTIFICATIONS).doc();
                batch.set(notifRef, {
                    userId: doc.id,
                    type: 'live',
                    fromUser: App.currentUser.displayName,
                    fromAvatar: App.currentUser.photoURL,
                    fromUserId: App.currentUser.uid,
                    message: `${App.currentUser.displayName} is live: ${title}`,
                    streamId: this.currentStreamId,
                    isRead: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
        } catch (error) {
            console.error('Notify followers error:', error);
        }
    },
    
    /* ==================
       VIEWER SIMULATION (for bots)
       ================== */
    
    viewerSimInterval: null,
    
    startViewerSimulation() {
        let fakeViewers = 0;
        
        this.viewerSimInterval = setInterval(async () => {
            if (!this.currentStreamId || !this.isHost) {
                clearInterval(this.viewerSimInterval);
                return;
            }
            
            // Random viewer fluctuation
            const change = Math.floor(Math.random() * 5) - 2;
            fakeViewers = Math.max(0, fakeViewers + change);
            
            await db.collection(Collections.LIVE_STREAMS).doc(this.currentStreamId).update({
                viewers: firebase.firestore.FieldValue.increment(1)
            });
            
        }, 5000);
    },
    
    /* ==================
       FIND BATTLE OPPONENT
       ================== */
    
    async findBattle() {
        if (!this.isHost) return;
        
        const activeStreams = await db.collection(Collections.LIVE_STREAMS)
            .where('isActive', '==', true)
            .where('battleActive', '==', false)
            .get();
        
        const opponents = activeStreams.docs.filter(doc => 
            doc.id !== this.currentStreamId
        );
        
        if (opponents.length === 0) {
            App.showToast('No opponents available for battle', 'info');
            return;
        }
        
        // Show opponent list
        const modal = document.createElement('div');
        modal.style.cssText = `
            position:fixed;bottom:0;left:0;width:100%;z-index:400;
        `;
        modal.innerHTML = `
            <div class="modal-bottom-content" style="background:var(--bg-secondary);border-radius:var(--radius-xl) var(--radius-xl) 0 0;padding:16px;">
                <div class="modal-drag-handle"></div>
                <h3 style="margin-bottom:12px;">⚔️ Challenge to Battle</h3>
                <div style="max-height:200px;overflow-y:auto;">
                    ${opponents.map(doc => {
                        const s = doc.data();
                        return `
                            <div class="search-result-item" onclick="Live.challengeBattle('${doc.id}'); this.closest('.modal-bottom-content').parentElement.remove()">
                                <img src="${s.hostAvatar}" class="search-result-avatar">
                                <div class="search-result-info">
                                    <div class="search-result-name">${App.escapeHtml(s.hostName)}</div>
                                    <div class="search-result-username">${s.viewers || 0} viewers</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <button class="btn btn-full btn-secondary" style="margin-top:12px;" onclick="this.parentElement.parentElement.remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    openFromLive() {
        App.closeModal('gift-panel');
        Shop.openFromLive(this.currentHostId);
    }
};