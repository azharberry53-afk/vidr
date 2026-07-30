/* ============================================
   LEADERBOARD MODULE
   ============================================ */

const Leaderboard = {
    currentTab: 'level',
    
    async load() {
        this.switchTab(this.currentTab);
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.lb-tab').forEach(t => {
            t.classList.toggle('active', t.textContent.toLowerCase() === tab || 
                (tab === 'gifters' && t.textContent === 'Top Gifters'));
        });
        this.loadTab(tab);
    },
    
    async loadTab(tab) {
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';
        
        let query;
        let valueField;
        let valueLabel;
        
        switch (tab) {
            case 'level':
                query = db.collection(Collections.USERS).orderBy('level', 'desc').limit(50);
                valueField = 'level';
                valueLabel = 'Level';
                break;
            case 'followers':
                query = db.collection(Collections.USERS).orderBy('followers', 'desc').limit(50);
                valueField = 'followers';
                valueLabel = 'Followers';
                break;
            case 'likes':
                query = db.collection(Collections.USERS).orderBy('likes', 'desc').limit(50);
                valueField = 'likes';
                valueLabel = 'Likes';
                break;
            case 'gifters':
                query = db.collection(Collections.USERS).orderBy('totalGiftsSent', 'desc').limit(50);
                valueField = 'totalGiftsSent';
                valueLabel = 'Gifts Sent';
                break;
        }
        
        try {
            const snapshot = await query.get();
            let html = '';
            
            const rankEmojis = ['🥇', '🥈', '🥉'];
            
            snapshot.docs.forEach((doc, i) => {
                const user = doc.data();
                
                if (user.role === 'admin' && !App.isAdmin) return;
                if (user.isBot && !App.isAdmin) return;
                
                const isMe = doc.id === App.currentUser?.uid;
                const value = user[valueField] || 0;
                
                html += `
                    <div class="lb-item ${isMe ? 'lb-item-me' : ''}" 
                         onclick="Profile.viewProfile('${doc.id}')"
                         style="${isMe ? 'border:2px solid var(--primary);background:rgba(var(--primary-rgb),0.05);' : ''}">
                        <div class="lb-rank">${i < 3 ? rankEmojis[i] : `#${i + 1}`}</div>
                        <img src="${user.photoURL || 'assets/icons/default-avatar.png'}" class="lb-avatar" loading="lazy">
                        <div class="lb-info">
                            <div class="lb-name">
                                ${App.escapeHtml(user.displayName || 'User')}
                                ${user.isVerified ? '<i class="fas fa-check-circle verified-icon" style="font-size:0.75rem;"></i>' : ''}
                                ${isMe ? '<span style="font-size:0.7rem;background:var(--primary);color:white;padding:2px 6px;border-radius:var(--radius-full);margin-left:4px;">You</span>' : ''}
                            </div>
                            <div class="lb-value">Lv.${user.level || 1} • ${App.formatNumber(user.followers || 0)} followers</div>
                        </div>
                        <div class="lb-stat">${App.formatNumber(value)}</div>
                    </div>
                `;
            });
            
            list.innerHTML = html || '<p style="text-align:center;padding:40px;color:var(--text-tertiary);">No data yet</p>';
            
        } catch (error) {
            console.error('Leaderboard error:', error);
            list.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-tertiary);">Error loading leaderboard</p>';
        }
    }
};

// Add styles for leaderboard
const lbStyle = document.createElement('style');
lbStyle.textContent = `
    .lb-item { cursor: pointer; transition: all var(--transition-fast); }
    .lb-item:active { transform: scale(0.98); }
`;
document.head.appendChild(lbStyle);