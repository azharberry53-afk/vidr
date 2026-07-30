/* ============================================
   SEARCH MODULE - Hashtags & Trending
   ============================================ */

const Search = {
    recentSearches: [],
    
    init() {
        this.recentSearches = JSON.parse(localStorage.getItem('vidr_recent_searches') || '[]');
    },
    
    async search(query) {
        if (!query.trim()) {
            this.showRecent();
            return;
        }
        
        // Save to recent
        this.addToRecent(query);
        
        const resultsEl = document.getElementById('search-results');
        resultsEl.innerHTML = `
            <div class="search-tabs">
                ${['Users', 'Posts', 'Tags'].map((tab, i) => `
                    <button class="search-tab ${i===0?'active':''}" 
                            onclick="Search.switchTab('${tab.toLowerCase()}', this)">
                        ${tab}
                    </button>
                `).join('')}
            </div>
            <div id="search-tab-content">
                <div class="spinner" style="margin:40px auto;display:block;"></div>
            </div>
        `;
        
        this.searchUsers(query);
    },
    
    async searchUsers(query) {
        const content = document.getElementById('search-tab-content');
        if (!content) return;
        
        const queryLower = query.toLowerCase();
        
        try {
            const snapshot = await db.collection(Collections.USERS)
                .where('username', '>=', queryLower)
                .where('username', '<=', queryLower + '\uf8ff')
                .limit(15)
                .get();
            
            let html = '';
            snapshot.forEach(doc => {
                const user = doc.data();
                if (user.role === 'admin' && !App.isAdmin) return;
                if (user.isBot && !App.isAdmin) return;
                
                html += App.renderSearchResult(user);
            });
            
            content.innerHTML = html || '<p style="text-align:center;padding:40px;color:var(--text-tertiary);">No users found</p>';
        } catch (e) {
            content.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">Search error</p>';
        }
    },
    
    async searchPosts(query) {
        const content = document.getElementById('search-tab-content');
        if (!content) return;
        
        content.innerHTML = '<div class="spinner" style="margin:40px auto;display:block;"></div>';
        
        try {
            const snapshot = await db.collection(Collections.POSTS)
                .where('isActive', '==', true)
                .orderBy('likes', 'desc')
                .limit(20)
                .get();
            
            const posts = snapshot.docs
                .filter(doc => doc.data().caption?.toLowerCase().includes(query.toLowerCase()))
                .map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (posts.length === 0) {
                content.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-tertiary);">No posts found</p>';
                return;
            }
            
            content.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;">
                    ${posts.map(post => `
                        <div onclick="Profile.openPost('${post.id}')"
                             style="aspect-ratio:1;background:var(--bg-tertiary);cursor:pointer;position:relative;overflow:hidden;">
                            ${post.thumbnailURL || post.imageURLs?.[0] ? `
                                <img src="${post.thumbnailURL || post.imageURLs?.[0]}" 
                                     style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                            ` : `
                                <div style="width:100%;height:100%;background:var(--gradient-primary);
                                             display:flex;align-items:center;justify-content:center;
                                             color:white;font-size:0.7rem;padding:8px;text-align:center;">
                                    ${App.escapeHtml(post.text?.substring(0,50)||'')}
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            content.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">Search error</p>';
        }
    },
    
    async searchTags(query) {
        const content = document.getElementById('search-tab-content');
        if (!content) return;
        
        const tag = query.startsWith('#') ? query : `#${query}`;
        
        content.innerHTML = `
            <div style="padding:16px;">
                <div style="display:flex;align-items:center;gap:12px;padding:14px;
                             background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:16px;">
                    <div style="width:44px;height:44px;background:var(--gradient-primary);border-radius:var(--radius-md);
                                 display:flex;align-items:center;justify-content:center;color:white;font-weight:800;">
                        #
                    </div>
                    <div>
                        <div style="font-weight:700;">${App.escapeHtml(tag)}</div>
                        <div style="color:var(--text-secondary);font-size:0.78rem;">Trending</div>
                    </div>
                </div>
                <p style="text-align:center;color:var(--text-tertiary);padding:40px;">
                    Hashtag search coming soon!
                </p>
            </div>
        `;
    },
    
    switchTab(tab, btn) {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        
        const query = document.getElementById('search-input')?.value || '';
        
        switch(tab) {
            case 'users': this.searchUsers(query); break;
            case 'posts': this.searchPosts(query); break;
            case 'tags': this.searchTags(query); break;
        }
    },
    
    showRecent() {
        const el = document.getElementById('search-results');
        if (!el) return;
        
        if (this.recentSearches.length === 0) {
            el.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--text-tertiary);">
                    <i class="fas fa-search" style="font-size:2.5rem;margin-bottom:12px;opacity:0.4;display:block;"></i>
                    <p>Search for users, posts & tags</p>
                </div>
            `;
            return;
        }
        
        el.innerHTML = `
            <div style="padding:12px 16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="font-weight:700;font-size:0.9rem;">Recent</h3>
                    <button onclick="Search.clearRecent()" style="color:var(--primary);font-size:0.82rem;font-weight:600;">
                        Clear All
                    </button>
                </div>
                ${this.recentSearches.map(q => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;cursor:pointer;"
                         onclick="document.getElementById('search-input').value='${q}'; Search.search('${q}')">
                        <i class="fas fa-history" style="color:var(--text-tertiary);font-size:0.9rem;width:20px;"></i>
                        <span style="flex:1;font-size:0.9rem;">${App.escapeHtml(q)}</span>
                        <button onclick="event.stopPropagation();Search.removeRecent('${q}')" 
                                style="color:var(--text-tertiary);font-size:0.8rem;">✕</button>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    addToRecent(query) {
        this.recentSearches = [query, ...this.recentSearches.filter(q => q !== query)].slice(0, 10);
        localStorage.setItem('vidr_recent_searches', JSON.stringify(this.recentSearches));
    },
    
    removeRecent(query) {
        this.recentSearches = this.recentSearches.filter(q => q !== query);
        localStorage.setItem('vidr_recent_searches', JSON.stringify(this.recentSearches));
        this.showRecent();
    },
    
    clearRecent() {
        this.recentSearches = [];
        localStorage.removeItem('vidr_recent_searches');
        this.showRecent();
    }
};

// Add search tab styles
const searchStyle = document.createElement('style');
searchStyle.textContent = `
    .search-tabs {
        display: flex;
        border-bottom: 1px solid var(--border-light);
        background: var(--bg-secondary);
        position: sticky;
        top: 0;
        z-index: 5;
    }
    .search-tab {
        flex: 1;
        padding: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-secondary);
        border-bottom: 2px solid transparent;
        transition: all var(--transition-fast);
    }
    .search-tab.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
    }
`;
document.head.appendChild(searchStyle);