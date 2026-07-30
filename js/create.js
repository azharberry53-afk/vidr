/* ============================================
   CREATE MODULE - Post Creation
   ============================================ */

const Create = {
    selectedImages: [],
    selectedVideo: null,
    selectedProducts: [],
    
    /* ==================
       GO LIVE
       ================== */
    
    async goLive() {
        App.closeCreateModal();
        
        if (!App.currentUser) return;
        
        // Show live setup
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:420px;background:var(--bg-secondary);border-radius:var(--radius-xl);
                        overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>🔴 Start Live</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:16px;">
                    <div id="live-preview" style="width:100%;height:300px;background:#000;border-radius:var(--radius-lg);
                                                    overflow:hidden;position:relative;margin-bottom:16px;">
                        <video id="live-setup-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
                        <div style="position:absolute;top:8px;right:8px;display:flex;gap:8px;">
                            <button onclick="Live.switchCamera()" style="padding:6px 10px;background:rgba(0,0,0,0.5);color:white;border-radius:var(--radius-full);font-size:0.8rem;backdrop-filter:blur(10px);">
                                <i class="fas fa-sync"></i>
                            </button>
                            <button onclick="Live.toggleFilters()" style="padding:6px 10px;background:rgba(0,0,0,0.5);color:white;border-radius:var(--radius-full);font-size:0.8rem;backdrop-filter:blur(10px);">
                                <i class="fas fa-magic"></i> Filters
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <input type="text" id="live-title" class="form-input" placeholder="Live title..." maxlength="50">
                    </div>
                    <div class="form-group" style="display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <p style="font-weight:600;font-size:0.9rem;">Enable Shop</p>
                            <p style="color:var(--text-secondary);font-size:0.78rem;">Show products during live</p>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="live-shop-enable" ${App.currentUser?.isVerified ? '' : 'disabled'}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    ${!App.currentUser?.isVerified ? `
                    <p style="color:var(--text-tertiary);font-size:0.78rem;margin-bottom:12px;">
                        ✨ Get Verified to enable shop during live
                    </p>
                    ` : ''}
                    <button class="btn btn-primary btn-full" style="background:var(--gradient-live);" onclick="Live.start()">
                        <i class="fas fa-broadcast-tower"></i> Go LIVE!
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Start camera preview
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const video = modal.querySelector('#live-setup-video');
            video.srcObject = stream;
            Live.setupStream = stream;
        } catch {
            App.showToast('Camera access required', 'error');
        }
    },
    
    /* ==================
       POST VIDEO
       ================== */
    
    postVideo() {
        App.closeCreateModal();
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this.showVideoEditor(file);
        };
        input.click();
    },
    
    showVideoEditor(file) {
        if (file.size > 100 * 1024 * 1024) {
            App.showToast('Video too large. Max 100MB', 'warning');
            return;
        }
        
        this.selectedVideo = file;
        const url = URL.createObjectURL(file);
        
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.id = 'video-editor';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="Create.closeEditor()">
                    <i class="fas fa-times"></i>
                </button>
                <h2>New Video</h2>
                <button class="btn btn-sm btn-primary" onclick="Create.uploadVideo()">Post</button>
            </div>
            <div style="padding:16px;">
                <!-- Video Preview -->
                <div style="width:100%;border-radius:var(--radius-lg);overflow:hidden;margin-bottom:16px;background:#000;max-height:400px;">
                    <video src="${url}" style="width:100%;max-height:400px;object-fit:contain;" controls></video>
                </div>
                
                <!-- Caption -->
                <div class="form-group">
                    <textarea id="post-caption" class="form-input" placeholder="Write a caption... @mention friends" 
                              maxlength="500" rows="3" style="resize:none;"></textarea>
                    <p style="font-size:0.72rem;color:var(--text-tertiary);text-align:right;margin-top:4px;">
                        <span id="caption-count">0</span>/500
                    </p>
                </div>
                
                <!-- Products (Verified only) -->
                ${App.currentUser?.isVerified || App.isAdmin ? `
                <div class="form-group">
                    <label style="font-weight:600;font-size:0.85rem;margin-bottom:8px;display:block;">
                        🛍️ Tag Products
                    </label>
                    <button class="btn btn-secondary" onclick="Create.tagProducts()">
                        + Tag Products (${this.selectedProducts.length})
                    </button>
                </div>
                ` : ''}
                
                <!-- Visibility -->
                <div class="form-group">
                    <label style="font-weight:600;font-size:0.85rem;margin-bottom:8px;display:block;">Visibility</label>
                    <div style="display:flex;gap:8px;">
                        <button class="visibility-btn active" data-vis="public">🌍 Public</button>
                        <button class="visibility-btn" data-vis="followers">👥 Followers</button>
                        <button class="visibility-btn" data-vis="private">🔒 Private</button>
                    </div>
                </div>
                
                <!-- Boost Post -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;
                             background:var(--bg-tertiary);border-radius:var(--radius-md);">
                    <div>
                        <p style="font-weight:600;font-size:0.9rem;">⚡ Boost Post</p>
                        <p style="color:var(--text-secondary);font-size:0.78rem;">
                            1,500 free coins or ${App.currentUser?.freeBoostsRemaining > 0 ? `${App.currentUser.freeBoostsRemaining} free boost left` : 'purchase to boost'}
                        </p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="boost-toggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <!-- Upload Progress -->
                <div id="upload-progress" style="display:none;margin-top:16px;">
                    <div style="height:6px;background:var(--border-color);border-radius:var(--radius-full);overflow:hidden;">
                        <div id="upload-bar" style="height:100%;background:var(--gradient-primary);width:0%;transition:width 0.3s;border-radius:var(--radius-full);"></div>
                    </div>
                    <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:6px;" id="upload-text">Preparing...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Caption counter
        modal.querySelector('#post-caption').addEventListener('input', function() {
            document.getElementById('caption-count').textContent = this.value.length;
        });
        
        // Visibility buttons
        modal.querySelectorAll('.visibility-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.visibility-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Add visibility button styles
        if (!document.getElementById('editor-styles')) {
            const style = document.createElement('style');
            style.id = 'editor-styles';
            style.textContent = `
                .visibility-btn {
                    flex:1;padding:8px;border-radius:var(--radius-md);font-size:0.8rem;font-weight:600;
                    background:var(--bg-tertiary);border:2px solid transparent;color:var(--text-primary);
                    transition:all var(--transition-fast);
                }
                .visibility-btn.active {
                    border-color:var(--primary);background:rgba(var(--primary-rgb),0.08);color:var(--primary);
                }
                .toggle-switch { position:relative;display:inline-block;width:44px;height:24px; }
                .toggle-switch input { opacity:0;width:0;height:0; }
                .toggle-slider {
                    position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;
                    background:var(--border-color);border-radius:24px;transition:0.3s;
                }
                .toggle-slider:before {
                    position:absolute;content:"";height:18px;width:18px;left:3px;bottom:3px;
                    background:white;border-radius:50%;transition:0.3s;
                }
                .toggle-switch input:checked + .toggle-slider { background:var(--primary); }
                .toggle-switch input:checked + .toggle-slider:before { transform:translateX(20px); }
            `;
            document.head.appendChild(style);
        }
    },
    
    async uploadVideo() {
        if (!this.selectedVideo) return;
        
        const caption = document.getElementById('post-caption')?.value.trim() || '';
        const visibility = document.querySelector('.visibility-btn.active')?.dataset.vis || 'public';
        const boost = document.getElementById('boost-toggle')?.checked || false;
        
        // Check boost cost
        if (boost) {
            const hasFreBoost = App.currentUser?.freeBoostsRemaining > 0;
            if (!hasFreBoost) {
                if ((App.currentUser?.freeCoins || 0) < 1500) {
                    App.showToast('Not enough free coins for boost (1500 needed)', 'warning');
                    document.getElementById('boost-toggle').checked = false;
                }
            }
        }
        
        // Show progress
        document.getElementById('upload-progress').style.display = 'block';
        document.querySelector('.overlay-header .btn-primary').disabled = true;
        
        try {
            // Generate thumbnail
            const thumbnail = await this.generateVideoThumbnail(this.selectedVideo);
            
            // Upload video
            const videoPath = `videos/${App.currentUser.uid}/${Date.now()}_${this.selectedVideo.name}`;
            const videoRef = storage.ref(videoPath);
            const uploadTask = videoRef.put(this.selectedVideo);
            
            uploadTask.on('state_changed', (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                document.getElementById('upload-bar').style.width = progress + '%';
                document.getElementById('upload-text').textContent = `Uploading... ${Math.round(progress)}%`;
            });
            
            await uploadTask;
            const videoURL = await videoRef.getDownloadURL();
            
            // Upload thumbnail
            let thumbnailURL = '';
            if (thumbnail) {
                document.getElementById('upload-text').textContent = 'Processing...';
                const thumbRef = storage.ref(`thumbnails/${App.currentUser.uid}/${Date.now()}`);
                await thumbRef.put(thumbnail);
                thumbnailURL = await thumbRef.getDownloadURL();
            }
            
            document.getElementById('upload-text').textContent = 'Finalizing...';
            
            // Create post document
            const postData = {
                userId: App.currentUser.uid,
                type: 'video',
                caption: caption,
                videoURL: videoURL,
                thumbnailURL: thumbnailURL,
                visibility: visibility,
                isActive: true,
                isBoosted: boost,
                products: this.selectedProducts,
                likes: 0,
                comments: 0,
                shares: 0,
                views: 0,
                likedBy: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userData: {
                    displayName: App.currentUser.displayName,
                    username: App.currentUser.username,
                    photoURL: App.currentUser.photoURL,
                    isVerified: App.currentUser.isVerified,
                    role: App.currentUser.role
                }
            };
            
            await db.collection(Collections.POSTS).add(postData);
            
            // Handle boost
            if (boost) {
                if (App.currentUser.freeBoostsRemaining > 0) {
                    await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                        freeBoostsRemaining: firebase.firestore.FieldValue.increment(-1)
                    });
                } else {
                    await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                        freeCoins: firebase.firestore.FieldValue.increment(-1500)
                    });
                }
            }
            
            // Update post count
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                totalPosts: firebase.firestore.FieldValue.increment(1)
            });
            
            // XP
            App.addXP(10, 'post');
            App.grantAchievement('first_post', 1);
            
            App.showToast('Video posted! 🎉', 'success');
Sound.play('success');
Sound.haptic('success');
            this.closeEditor();
            
            // Refresh feed
            Feed.refresh();
            this.selectedVideo = null;
            this.selectedProducts = [];
            
        } catch (error) {
            console.error('Upload error:', error);
            App.showToast('Error uploading video', 'error');
            document.getElementById('upload-progress').style.display = 'none';
            document.querySelector('.overlay-header .btn-primary').disabled = false;
        }
    },
    
    generateVideoThumbnail(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.currentTime = 1;
            video.onloadeddata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 720;
                canvas.height = video.videoHeight || 1280;
                canvas.getContext('2d').drawImage(video, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            };
            video.onerror = () => resolve(null);
        });
    },
    
    /* ==================
       POST IMAGES (up to 8)
       ================== */
    
    postImages() {
        App.closeCreateModal();
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files).slice(0, 8);
            if (files.length > 0) this.showImageEditor(files);
        };
        input.click();
    },
    
    showImageEditor(files) {
        this.selectedImages = files;
        const previews = files.map(f => URL.createObjectURL(f));
        
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.id = 'image-editor';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="Create.closeEditor()">
                    <i class="fas fa-times"></i>
                </button>
                <h2>New Post (${files.length}/${8})</h2>
                <button class="btn btn-sm btn-primary" onclick="Create.uploadImages()">Post</button>
            </div>
            <div style="padding:16px;">
                <!-- Image Previews -->
                <div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:16px;padding-bottom:8px;">
                    ${previews.map((url, i) => `
                        <div style="position:relative;min-width:100px;height:100px;">
                            <img src="${url}" style="width:100px;height:100px;object-fit:cover;border-radius:var(--radius-md);">
                            <button onclick="Create.removeImage(${i})" 
                                    style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;background:var(--danger);
                                           color:white;border-radius:50%;font-size:0.6rem;display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('')}
                    ${files.length < 8 ? `
                    <button onclick="Create.addMoreImages()" 
                            style="min-width:100px;height:100px;border:2px dashed var(--border-color);border-radius:var(--radius-md);
                                   display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-tertiary);font-size:0.75rem;">
                        <i class="fas fa-plus" style="font-size:1.5rem;margin-bottom:4px;"></i>
                        Add
                    </button>
                    ` : ''}
                </div>
                
                <div class="form-group">
                    <textarea id="post-caption" class="form-input" placeholder="Write a caption..." 
                              maxlength="500" rows="3" style="resize:none;"></textarea>
                </div>
                
                ${App.currentUser?.isVerified || App.isAdmin ? `
                <div class="form-group">
                    <button class="btn btn-secondary" onclick="Create.tagProducts()">
                        🛍️ Tag Products
                    </button>
                </div>
                ` : ''}
                
                <div id="upload-progress" style="display:none;margin-top:16px;">
                    <div style="height:6px;background:var(--border-color);border-radius:var(--radius-full);overflow:hidden;">
                        <div id="upload-bar" style="height:100%;background:var(--gradient-primary);width:0%;transition:width 0.3s;border-radius:var(--radius-full);"></div>
                    </div>
                    <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:6px;" id="upload-text">Uploading...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async uploadImages() {
        if (this.selectedImages.length === 0) return;
        
        const caption = document.getElementById('post-caption')?.value.trim() || '';
        
        document.getElementById('upload-progress').style.display = 'block';
        document.querySelector('#image-editor .btn-primary').disabled = true;
        
        try {
            const imageURLs = [];
            
            for (let i = 0; i < this.selectedImages.length; i++) {
                const file = this.selectedImages[i];
                document.getElementById('upload-text').textContent = `Uploading image ${i + 1}/${this.selectedImages.length}...`;
                document.getElementById('upload-bar').style.width = ((i / this.selectedImages.length) * 100) + '%';
                
                const compressed = await Profile.compressImage(file, 1080, 1350);
                const ref = storage.ref(`images/${App.currentUser.uid}/${Date.now()}_${i}`);
                await ref.put(compressed);
                imageURLs.push(await ref.getDownloadURL());
            }
            
            document.getElementById('upload-bar').style.width = '100%';
            document.getElementById('upload-text').textContent = 'Posting...';
            
            await db.collection(Collections.POSTS).add({
                userId: App.currentUser.uid,
                type: 'images',
                caption: caption,
                imageURLs: imageURLs,
                visibility: 'public',
                isActive: true,
                products: this.selectedProducts,
                likes: 0,
                comments: 0,
                shares: 0,
                likedBy: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userData: {
                    displayName: App.currentUser.displayName,
                    username: App.currentUser.username,
                    photoURL: App.currentUser.photoURL,
                    isVerified: App.currentUser.isVerified,
                    role: App.currentUser.role
                }
            });
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                totalPosts: firebase.firestore.FieldValue.increment(1)
            });
            
            App.addXP(8, 'post');
            App.grantAchievement('first_post', 1);
            
            App.showToast('Photos posted! 📸', 'success');
Sound.play('camera');
Sound.haptic('success');
            this.closeEditor();
            Feed.refresh();
            
            this.selectedImages = [];
            this.selectedProducts = [];
            
        } catch (error) {
            console.error('Image upload error:', error);
            App.showToast('Error uploading images', 'error');
        }
    },
    
    /* ==================
       TEXT POST
       ================== */
    
    postText() {
        App.closeCreateModal();
        
        const bgColors = [
            'var(--gradient-primary)',
            'var(--gradient-accent)',
            'linear-gradient(135deg, #34d399, #059669)',
            'linear-gradient(135deg, #f97316, #ef4444)',
            'linear-gradient(135deg, #fbbf24, #f59e0b)',
            'linear-gradient(135deg, #60a5fa, #6366f1)'
        ];
        
        let selectedBg = bgColors[0];
        
        const modal = document.createElement('div');
        modal.className = 'overlay-page';
        modal.id = 'text-editor';
        modal.innerHTML = `
            <div class="overlay-header">
                <button class="back-btn" onclick="Create.closeEditor()">
                    <i class="fas fa-times"></i>
                </button>
                <h2>Text Post</h2>
                <button class="btn btn-sm btn-primary" onclick="Create.uploadTextPost()">Post</button>
            </div>
            <div style="padding:16px;">
                <!-- Text Preview -->
                <div id="text-preview" style="width:100%;min-height:300px;border-radius:var(--radius-lg);
                     display:flex;align-items:center;justify-content:center;padding:32px;
                     background:var(--gradient-primary);margin-bottom:16px;cursor:text;"
                     onclick="document.getElementById('text-content-input').focus()">
                    <p id="text-preview-content" style="color:white;font-size:1.5rem;font-weight:600;text-align:center;line-height:1.6;word-break:break-word;">
                        What's on your mind?
                    </p>
                </div>
                
                <!-- Hidden textarea for input -->
                <textarea id="text-content-input" style="position:absolute;opacity:0;pointer-events:none;" 
                          maxlength="500" oninput="Create.updateTextPreview(this.value)"></textarea>
                
                <!-- Background Colors -->
                <div style="display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:8px;margin-bottom:16px;">
                    ${bgColors.map((bg, i) => `
                        <button onclick="Create.selectTextBg('${bg}', this)"
                                style="min-width:36px;height:36px;border-radius:var(--radius-full);background:${bg};
                                       border:2px solid ${i === 0 ? 'var(--text-primary)' : 'transparent'};
                                       flex-shrink:0;">
                        </button>
                    `).join('')}
                </div>
                
                <!-- Font Size -->
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                    <span style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);">Text Size</span>
                    <input type="range" min="1" max="3" value="2" step="1" style="flex:1;"
                           oninput="Create.updateFontSize(this.value)">
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus text input
        setTimeout(() => {
            const input = modal.querySelector('#text-content-input');
            if (input) input.focus();
        }, 300);
    },
    
    updateTextPreview(value) {
        const preview = document.getElementById('text-preview-content');
        if (preview) {
            preview.textContent = value || "What's on your mind?";
        }
    },
    
    selectTextBg(bg, btn) {
        document.querySelectorAll('#text-editor button[onclick*="selectTextBg"]').forEach(b => {
            b.style.borderColor = 'transparent';
        });
        btn.style.borderColor = 'var(--text-primary)';
        
        const preview = document.getElementById('text-preview');
        if (preview) preview.style.background = bg;
        
        this._selectedTextBg = bg;
    },
    
    updateFontSize(size) {
        const fontSizes = { '1': '1rem', '2': '1.5rem', '3': '2rem' };
        const preview = document.getElementById('text-preview-content');
        if (preview) preview.style.fontSize = fontSizes[size];
    },
    
    _selectedTextBg: 'var(--gradient-primary)',
    
    async uploadTextPost() {
        const text = document.getElementById('text-content-input')?.value.trim();
        
        if (!text) {
            App.showToast('Please write something', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            await db.collection(Collections.POSTS).add({
                userId: App.currentUser.uid,
                type: 'text',
                text: text,
                bgColor: this._selectedTextBg,
                visibility: 'public',
                isActive: true,
                likes: 0,
                comments: 0,
                shares: 0,
                likedBy: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userData: {
                    displayName: App.currentUser.displayName,
                    username: App.currentUser.username,
                    photoURL: App.currentUser.photoURL,
                    isVerified: App.currentUser.isVerified,
                    role: App.currentUser.role
                }
            });
            
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                totalPosts: firebase.firestore.FieldValue.increment(1)
            });
            
            App.addXP(5, 'post');
            App.grantAchievement('first_post', 1);
            
            App.showToast('Text post shared! ✍️', 'success');
            this.closeEditor();
            Feed.refresh();
            
        } catch (error) {
            App.showToast('Error creating post', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       STORY
       ================== */
    
    postStory() {
        App.closeCreateModal();
        
        const options = document.createElement('div');
        options.className = 'modal-bottom';
        options.style.display = 'block';
        options.innerHTML = `
            <div class="modal-bottom-content">
                <div class="modal-drag-handle"></div>
                <h3 style="margin-bottom:16px;">Create Story</h3>
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;" 
                        onclick="Create.storyFromCamera(); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-camera"></i> Camera
                </button>
                <button class="btn btn-full btn-secondary" style="margin-bottom:8px;"
                        onclick="Create.storyFromGallery(); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-images"></i> Gallery
                </button>
                <button class="btn btn-full btn-secondary"
                        onclick="Create.storyText(); this.closest('.modal-bottom').remove()">
                    <i class="fas fa-font"></i> Text Story
                </button>
            </div>
        `;
        document.body.appendChild(options);
    },
    
    storyFromGallery() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this.uploadStory(file);
        };
        input.click();
    },
    
    async uploadStory(file) {
        App.showLoading();
        
        try {
            const isVideo = file.type.startsWith('video/');
            const ref = storage.ref(`stories/${App.currentUser.uid}/${Date.now()}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            
            await db.collection(Collections.STORIES).add({
                userId: App.currentUser.uid,
                type: isVideo ? 'video' : 'image',
                mediaURL: url,
                expiresAt: expiresAt,
                views: 0,
                viewedBy: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userData: {
                    displayName: App.currentUser.displayName,
                    username: App.currentUser.username,
                    photoURL: App.currentUser.photoURL
                }
            });
            
            App.addXP(3, 'story');
            App.showToast('Story posted! 👆 Expires in 24hrs', 'success');
            
        } catch (error) {
            App.showToast('Error posting story', 'error');
        }
        
        App.hideLoading();
    },
    
    /* ==================
       TAG PRODUCTS
       ================== */
    
    async tagProducts() {
        if (!App.currentUser?.isVerified && !App.isAdmin) {
            App.showToast('Verified users only can tag products', 'warning');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div style="width:100%;max-width:420px;max-height:80vh;background:var(--bg-secondary);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-xl);">
                <div class="modal-header">
                    <h2>🛍️ Tag Products</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding:0 16px 16px;overflow-y:auto;max-height:400px;" id="tag-products-list">
                    <div class="spinner"></div>
                </div>
                <div style="padding:16px;border-top:1px solid var(--border-light);">
                    <button class="btn btn-primary btn-full" onclick="this.closest('.modal-overlay').remove()">Done (${this.selectedProducts.length})</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Load seller's products
        const snapshot = await db.collection(Collections.PRODUCTS)
            .where('sellerId', '==', App.currentUser.uid)
            .where('isActive', '==', true)
            .get();
        
        const listEl = modal.querySelector('#tag-products-list');
        
        if (snapshot.empty) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--text-tertiary);">
                    <p>No products yet</p>
                    <button class="btn btn-primary" style="margin-top:12px;" onclick="Shop.addProduct()">+ Add Product</button>
                </div>
            `;
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const isSelected = this.selectedProducts.some(p => p.id === doc.id);
            
            html += `
                <div class="product-listing-item" onclick="Create.toggleTagProduct('${doc.id}', ${JSON.stringify(product).replace(/'/g, "'")})" 
                     id="tag-product-${doc.id}" style="border-color:${isSelected ? 'var(--primary)' : 'transparent'}">
                    <img src="${product.images?.[0] || ''}" class="product-listing-thumb" loading="lazy">
                    <div class="product-listing-info">
                        <div class="product-listing-name">${App.escapeHtml(product.name)}</div>
                        <div class="product-listing-price">$${product.price?.toFixed(2)}</div>
                    </div>
                    <div style="font-size:1.5rem;">${isSelected ? '✅' : '⬜'}</div>
                </div>
            `;
        });
        
        listEl.innerHTML = html;
    },
    
    toggleTagProduct(id, product) {
        const idx = this.selectedProducts.findIndex(p => p.id === id);
        const el = document.getElementById(`tag-product-${id}`);
        
        if (idx === -1) {
            this.selectedProducts.push({ id, ...product });
            if (el) {
                el.style.borderColor = 'var(--primary)';
                el.querySelector('div:last-child').textContent = '✅';
            }
        } else {
            this.selectedProducts.splice(idx, 1);
            if (el) {
                el.style.borderColor = 'transparent';
                el.querySelector('div:last-child').textContent = '⬜';
            }
        }
    },
    
    /* ==================
       HELPERS
       ================== */
    
    closeEditor() {
        document.getElementById('video-editor')?.remove();
        document.getElementById('image-editor')?.remove();
        document.getElementById('text-editor')?.remove();
        
        const liveSetup = document.querySelector('.modal-overlay');
        if (liveSetup) {
            // Stop camera if was started
            if (Live.setupStream) {
                Live.setupStream.getTracks().forEach(track => track.stop());
                Live.setupStream = null;
            }
        }
    },
    
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        if (this.selectedImages.length > 0) {
            this.showImageEditor(this.selectedImages);
            document.getElementById('image-editor')?.remove();
        } else {
            this.closeEditor();
        }
    },
    
    addMoreImages() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            const newFiles = Array.from(e.target.files);
            const remaining = 8 - this.selectedImages.length;
            this.selectedImages = [...this.selectedImages, ...newFiles.slice(0, remaining)];
            document.getElementById('image-editor')?.remove();
            this.showImageEditor(this.selectedImages);
        };
        input.click();
    }
};