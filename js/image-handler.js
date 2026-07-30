/* ============================================
   IMAGE FALLBACK HANDLER
   File: js/image-handler.js
   ============================================ */

const ImageHandler = {
    
    // Your actual file paths
    defaultAvatar: 'assets/icons/default-avatar.png',
    defaultCover: 'assets/icons/default-cover.png',  // ✅ Changed from .jpg
    defaultProduct: 'assets/icons/default-product.png',
    logo: 'assets/logo/icon-192.png',
    logoLarge: 'assets/logo/icon-512.png',
    favicon: 'assets/logo/favicon.png',
    
    init() {
        // Auto-handle broken images
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                this.handleBrokenImage(e.target);
            }
        }, true);
        
        this.preloadCritical();
    },
    
    handleBrokenImage(img) {
        // Prevent infinite loop
        if (img.dataset.fallback === 'true') return;
        img.dataset.fallback = 'true';
        
        const classes = img.className || '';
        
        // Avatar images
        if (classes.includes('avatar') || 
            classes.includes('feed-avatar') ||
            classes.includes('nav-avatar') ||
            classes.includes('chat-avatar') ||
            classes.includes('profile-avatar') ||
            classes.includes('search-result-avatar') ||
            classes.includes('discover-avatar') ||
            classes.includes('lb-avatar') ||
            classes.includes('story-avatar') ||
            classes.includes('comment-item-avatar') ||
            classes.includes('friend-req-avatar') ||
            classes.includes('friend-list-avatar') ||
            classes.includes('notification-avatar') ||
            classes.includes('live-avatar') ||
            classes.includes('live-comment-avatar') ||
            classes.includes('share-friend-avatar') ||
            classes.includes('chat-item-avatar')) {
            img.src = this.defaultAvatar;
        } 
        // Cover images
        else if (classes.includes('profile-cover-img') || 
                 classes.includes('discover-cover')) {
            img.src = this.defaultCover;
        }
        // Product images
        else if (classes.includes('shop-product-image') || 
                 classes.includes('product-listing-thumb')) {
            img.src = this.defaultProduct;
        }
        // Logo images
        else if (classes.includes('header-logo') || 
                 classes.includes('splash-logo-img') ||
                 classes.includes('login-logo')) {
            img.src = this.logo;
        }
        // Default fallback
        else {
            img.src = this.defaultAvatar;
        }
    },
    
    preloadCritical() {
        const critical = [
            this.logo,
            this.defaultAvatar,
            this.defaultCover,
            this.defaultProduct,
            this.favicon
        ];
        
        critical.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
};

// Initialize on DOM ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        ImageHandler.init();
    });
}
