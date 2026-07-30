/* ============================================
   STORIES MODULE - 24hr Disappearing Stories
   ============================================ */

const Stories = {
    currentStoryIndex: 0,
    currentUserIndex: 0,
    storyGroups: [],
    progressInterval: null,
    storyDuration: 5000,
    isPaused: false,
    touchStartX: 0,
    touchStartY: 0,
    
    /* ==================
       LOAD STORIES BAR
       ================== */
    
    async loadStoriesBar(container) {
        if (!App.currentUser) return;
        
        try {
            const now = new Date();
            
            // Get active stories (not expired)
            const snapshot = await db.collection(Collections.STORIES)
                .where('expiresAt', '>', now)
                .orderBy('expiresAt', 'desc')
                .limit(30)
                .get();
            
            if (snapshot.empty) {
                if (container) container.style.display = 'none';
                return;
            }
            
            // Group by user
            const userStories = new Map();
            
            snapshot.forEach(doc => {
                const story = { id: doc.id, ...doc.data() };
                const uid = story.userId;
                
                if (!userStories.has(uid)) {
                    userStories.set(uid, {
                        userId: uid,
                        userData: story.userData,
                        stories: []
                    });
                }
                
                userStories.get(uid).stories.push(story);
            });
            
            this.storyGroups = Array.from(userStories.values());
            
            // Prioritize: My story first, then unseen
            const myStoryIdx = this.storyGroups.findIndex(g => g.userId === App.currentUser.uid);
            if (myStoryIdx > 0) {
                const [myStory] = this.storyGroups.splice(myStoryIdx, 1);
                this.storyGroups.unshift(myStory);
            }
            
            if (container) {
                container.style.display = 'flex';
                container.innerHTML = this.renderStoriesBar();
            }
            
        } catch (error) {
            console.error('Load stories error:', error);
        }
    },
    
    renderStoriesBar() {
        const myStory = this.storyGroups.find(g => g.userId === App.currentUser?.uid);
        
        let html = `
            <!-- Add Story Button -->
            <div class="story-item" onclick="Create.postStory()">
                <div class="story-avatar-ring ${myStory ? '' : 'add-story-ring'}">
                    <img src="${App.currentUser?.photoURL || 'assets/icons/default-avatar.png'}" 
                         class="story-avatar" loading="lazy">
                    ${!myStory ? `
                    <div style="position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;
                                 background:var(--gradient-primary);border-radius:50%;
                                 display:flex;align-items:center;justify-content:center;
                                 border:2px solid var(--bg-primary);">
                        <span style="color:white;font-size:0.7rem;font-weight:800;">+</span>
                    </div>
                    ` : ''}
                </div>
                <span class="story-name">${myStory ? 'Your Story' : 'Add Story'}</span>
            </div>
        `;
        
        this.storyGroups.forEach((group, idx) => {
            if (group.userId === App.currentUser?.uid) return;
            
            const hasViewed = group.stories.every(s => 
                s.viewedBy?.includes(App.currentUser?.uid)
            );
            
            html += `
                <div class="story-item" onclick="Stories.open(${idx})">
                    <div class="story-avatar-ring ${hasViewed ? 'viewed' : ''}">
                        <img src="${group.userData?.photoURL || 'assets/icons/default-avatar.png'}" 
                             class="story-avatar" loading="lazy">
                    </div>
                    <span class="story-name">${App.escapeHtml(group.userData?.displayName?.split(' ')[0] || 'User')}</span>
                </div>
            `;
        });
        
        return html;
    },
    
    /* ==================
       OPEN STORY VIEWER
       ================== */
    
    open(userIndex = 0) {
        if (this.storyGroups.length === 0) return;
        
        this.currentUserIndex = userIndex;
        this.currentStoryIndex = 0;
        
        const viewer = this.createViewer();
        document.body.appendChild(viewer);
        
        this.renderCurrentStory();
        this.startProgress();
        this.setupTouchHandlers(viewer);
    },
    
    createViewer() {
        const viewer = document.createElement('div');
        viewer.id = 'story-viewer';
        viewer.style.cssText = `
            position: fixed;
            inset: 0;
            background: #000;
            z-index: 600;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        viewer.innerHTML = `
            <!-- Progress Bars -->
            <div id="story-progress-bars" style="
                display: flex;
                gap: 4px;
                padding: 8px 12px;
                padding-top: calc(8px + var(--safe-area-top));
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                z-index: 20;
            "></div>
            
            <!-- Story Header -->
            <div id="story-header" style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                display: flex;
                align-items: center;
                padding: 40px 12px 8px;
                padding-top: calc(40px + var(--safe-area-top));
                z-index: 15;
                background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
            ">
                <img id="story-user-avatar" src="" style="
                    width: 36px; height: 36px; border-radius: 50%;
                    object-fit: cover; border: 2px solid white; margin-right: 10px;
                ">
                <div style="flex: 1;">
                    <div id="story-user-name" style="color: white; font-weight: 700; font-size: 0.9rem;"></div>
                    <div id="story-time" style="color: rgba(255,255,255,0.7); font-size: 0.72rem;"></div>
                </div>
                <button onclick="Stories.close()" style="
                    color: white; font-size: 1.2rem;
                    width: 36px; height: 36px;
                    display: flex; align-items: center; justify-content: center;
                ">✕</button>
                <button id="story-options-btn" onclick="Stories.showOptions()" style="
                    color: white; font-size: 1rem;
                    width: 36px; height: 36px;
                    display: flex; align-items: center; justify-content: center;
                ">⋯</button>
            </div>
            
            <!-- Story Content -->
            <div id="story-content" style="width: 100%; height: 100%; position: relative;"></div>
            
            <!-- Story Footer -->
            <div id="story-footer" style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 12px;
                padding-bottom: calc(12px + var(--safe-area-bottom));
                background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%);
                z-index: 15;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <div id="story-reply-area" style="
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <input type="text" id="story-reply-input" placeholder="Reply to story..." style="
                        flex: 1; padding: 10px 16px;
                        background: rgba(255,255,255,0.15);
                        border-radius: var(--radius-full);
                        color: white; font-size: 0.88rem;
                        backdrop-filter: blur(10px);
                    ">
                    <button onclick="Stories.sendReply()" style="
                        color: white; font-size: 1.1rem;
                        width: 36px; height: 36px;
                        background: rgba(255,255,255,0.15);
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        backdrop-filter: blur(10px);
                    ">❤️</button>
                    <button onclick="Stories.sendReply()" style="
                        color: white; font-size: 1rem;
                        width: 36px; height: 36px;
                        background: rgba(255,255,255,0.15);
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        backdrop-filter: blur(10px);
                    ">✈️</button>
                </div>
            </div>
            
            <!-- Navigation zones -->
            <div onclick="Stories.prevStory()" style="
                position: absolute; left: 0; top: 0;
                width: 30%; height: 100%; z-index: 10;
            "></div>
            <div onclick="Stories.nextStory()" style="
                position: absolute; right: 0; top: 0;
                width: 30%; height: 100%; z-index: 10;
            "></div>
        `;
        
        return viewer;
    },
    
    async renderCurrentStory() {
        const group = this.storyGroups[this.currentUserIndex];
        if (!group) {
            this.close();
            return;
        }
        
        const story = group.stories[this.currentStoryIndex];
        if (!story) {
            this.close();
            return;
        }
        
        // Update header
        const avatar = document.getElementById('story-user-avatar');
        const name = document.getElementById('story-user-name');
        const time = document.getElementById('story-time');
        
        if (avatar) avatar.src = group.userData?.photoURL || 'assets/icons/default-avatar.png';
        if (name) name.textContent = group.userData?.displayName || 'User';
        if (time) time.textContent = App.timeAgo(story.createdAt);
        
        // Show/hide options for own story
        const optionsBtn = document.getElementById('story-options-btn');
        if (optionsBtn) {
            optionsBtn.style.display = group.userId === App.currentUser?.uid ? 'flex' : 'flex';
        }
        
        // Update reply area
        const replyArea = document.getElementById('story-reply-area');
        if (replyArea) {
            replyArea.style.display = group.userId === App.currentUser?.uid ? 'none' : 'flex';
        }
        
        // Update progress bars
        const barsContainer = document.getElementById('story-progress-bars');
        if (barsContainer) {
            barsContainer.innerHTML = group.stories.map((s, i) => `
                <div style="flex: 1; height: 3px; background: rgba(255,255,255,0.3);
                             border-radius: 2px; overflow: hidden;">
                    <div class="story-progress-bar" id="story-bar-${i}" style="
                        height: 100%;
                        background: white;
                        width: ${i < this.currentStoryIndex ? '100%' : i === this.currentStoryIndex ? '0%' : '0%'};
                        transition: none;
                    "></div>
                </div>
            `).join('');
        }
        
        // Render content
        const content = document.getElementById('story-content');
        if (!content) return;
        
        content.innerHTML = '';
        
        if (story.type === 'video') {
            content.innerHTML = `
                <video src="${story.mediaURL}" autoplay playsinline loop
                       style="width:100%;height:100%;object-fit:cover;"
                       onloadstart="Stories.isPaused=false">
                </video>
            `;
        } else if (story.type === 'image') {
            content.innerHTML = `
                <img src="${story.mediaURL}" 
                     style="width:100%;height:100%;object-fit:cover;"
                     loading="lazy">
            `;
        } else if (story.type === 'text') {
            content.innerHTML = `
                <div style="width:100%;height:100%;background:${story.bgColor || 'var(--gradient-primary)'};
                             display:flex;align-items:center;justify-content:center;padding:32px;">
                    <p style="color:white;font-size:1.8rem;font-weight:700;
                               text-align:center;line-height:1.5;word-break:break-word;">
                        ${App.escapeHtml(story.text || '')}
                    </p>
                </div>
            `;
        }
        
        // Mark as viewed
        if (story.userId !== App.currentUser?.uid) {
            this.markViewed(story.id);
        }
        
        // Show viewer count for own stories
        if (group.userId === App.currentUser?.uid) {
            const footer = document.getElementById('story-footer');
            if (footer) {
                footer.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;color:white;">
                        <span style="font-size:1rem;">👁</span>
                        <span style="font-size:0.85rem;">${story.views || 0} views</span>
                    </div>
                    <button onclick="Stories.deleteCurrentStory()" style="
                        color:white;font-size:0.85rem;margin-left:auto;
                        background:rgba(255,255,255,0.15);padding:6px 14px;
                        border-radius:var(--radius-full);backdrop-filter:blur(10px);
                    ">🗑 Delete</button>
                `;
            }
        }
    },
    
    async markViewed(storyId) {
        try {
            await db.collection(Collections.STORIES).doc(storyId).update({
                views: firebase.firestore.FieldValue.increment(1),
                viewedBy: firebase.firestore.FieldValue.arrayUnion(App.currentUser.uid)
            });
        } catch (e) {}
    },
    
    /* ==================
       PROGRESS SYSTEM
       ================== */
    
    startProgress() {
        this.stopProgress();
        
        const bar = document.getElementById(`story-bar-${this.currentStoryIndex}`);
        if (!bar) return;
        
        let progress = 0;
        const increment = 100 / (this.storyDuration / 100);
        
        this.progressInterval = setInterval(() => {
            if (this.isPaused) return;
            
            progress += increment;
            bar.style.width = Math.min(progress, 100) + '%';
            bar.style.transition = 'width 0.1s linear';
            
            if (progress >= 100) {
                this.nextStory();
            }
        }, 100);
    },
    
    stopProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    },
    
    /* ==================
       NAVIGATION
       ================== */
    
    nextStory() {
        this.stopProgress();
        
        const group = this.storyGroups[this.currentUserIndex];
        
        if (this.currentStoryIndex < (group?.stories.length || 0) - 1) {
            this.currentStoryIndex++;
            this.renderCurrentStory();
            this.startProgress();
        } else {
            // Next user's stories
            if (this.currentUserIndex < this.storyGroups.length - 1) {
                this.currentUserIndex++;
                this.currentStoryIndex = 0;
                this.renderCurrentStory();
                this.startProgress();
            } else {
                this.close();
            }
        }
    },
    
    prevStory() {
        this.stopProgress();
        
        if (this.currentStoryIndex > 0) {
            this.currentStoryIndex--;
        } else if (this.currentUserIndex > 0) {
            this.currentUserIndex--;
            const group = this.storyGroups[this.currentUserIndex];
            this.currentStoryIndex = (group?.stories.length || 1) - 1;
        }
        
        this.renderCurrentStory();
        this.startProgress();
    },
    
    close() {
        this.stopProgress();
        document.getElementById('story-viewer')?.remove();
        this.currentStoryIndex = 0;
        this.currentUserIndex = 0;
        this.isPaused = false;
    },
    
    /* ==================
       TOUCH HANDLERS
       ================== */
    
    setupTouchHandlers(viewer) {
        viewer.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.isPaused = true;
        }, { passive: true });
        
        viewer.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - this.touchStartX;
            const dy = Math.abs(e.changedTouches[0].clientY - this.touchStartY);
            
            this.isPaused = false;
            
            if (dy > 100) {
                this.close();
                return;
            }
            
            if (dx > 50) {
                this.prevStory();
            } else if (dx < -50) {
                this.nextStory();
            }
        }, { passive: true });
        
        // Long press to pause
        viewer.addEventListener('touchstart', () => {
            this.isPaused = true;
        }, { passive: true });
        
        viewer.addEventListener('touchend', () => {
            this.isPaused = false;
        }, { passive: true });
    },
    
    /* ==================
       REPLY TO STORY
       ================== */
    
    async sendReply() {
        const input = document.getElementById('story-reply-input');
        const text = input?.value.trim();
        const group = this.storyGroups[this.currentUserIndex];
        
        if (!text || !group) return;
        
        input.value = '';
        
        await Chat.openWithUser(
            group.userId,
            group.userData?.displayName || '',
            group.userData?.photoURL || ''
        );
        
        // Auto-send story reply
        if (Chat.currentChatId) {
            const story = group.stories[this.currentStoryIndex];
            await db.collection(Collections.CHATS)
                .doc(Chat.currentChatId)
                .collection('messages')
                .add({
                    senderId: App.currentUser.uid,
                    type: 'story_reply',
                    text: text,
                    storyId: story.id,
                    storyThumb: story.mediaURL,
                    storyType: story.type,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        }
        
        App.showToast('Reply sent! 💬', 'success');
    },
    
    /* ==================
       STORY OPTIONS
       ================== */
    
    showOptions() {
        const group = this.storyGroups[this.currentUserIndex];
        const isOwn = group?.userId === App.currentUser?.uid;
        
        this.isPaused = true;
        
        const sheet = document.createElement('div');
        sheet.className = 'modal-bottom';
        sheet.style.display = 'block';
        sheet.innerHTML = `
            <div class="modal-bottom-content">
                <div class="modal-drag-handle"></div>
                ${isOwn ? `
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;"
                        onclick="Stories.deleteCurrentStory(); this.closest('.modal-bottom').remove()">
                    🗑 Delete Story
                </button>
                ` : `
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;"
                        onclick="Profile.reportUser('${group?.userId}'); this.closest('.modal-bottom').remove()">
                    🚩 Report Story
                </button>
                `}
                <button class="btn btn-full btn-secondary"
                        onclick="this.closest('.modal-bottom').remove(); Stories.isPaused=false">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(sheet);
    },
    
    async deleteCurrentStory() {
        const group = this.storyGroups[this.currentUserIndex];
        if (!group || group.userId !== App.currentUser?.uid) return;
        
        const story = group.stories[this.currentStoryIndex];
        if (!story) return;
        
        try {
            await db.collection(Collections.STORIES).doc(story.id).delete();
            group.stories.splice(this.currentStoryIndex, 1);
            
            if (group.stories.length === 0) {
                this.storyGroups.splice(this.currentUserIndex, 1);
                this.close();
            } else {
                if (this.currentStoryIndex >= group.stories.length) {
                    this.currentStoryIndex = group.stories.length - 1;
                }
                this.renderCurrentStory();
                this.startProgress();
            }
            
            App.showToast('Story deleted', 'info');
        } catch (e) {
            App.showToast('Error deleting story', 'error');
        }
    },
    
    /* ==================
       AUTO CLEANUP (24hr)
       ================== */
    
    async cleanupExpiredStories() {
        if (!App.isAdmin) return;
        
        try {
            const now = new Date();
            const expired = await db.collection(Collections.STORIES)
                .where('expiresAt', '<', now)
                .limit(100)
                .get();
            
            const batch = db.batch();
            expired.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            console.log(`Cleaned up ${expired.size} expired stories`);
        } catch (e) {}
    }
};