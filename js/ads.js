/* ============================================
   ADS MODULE - Multi-Network Monetization
   Adsterra + PropellerAds + Monetag +
   HilltopAds + PopAds + Bidvertiser
   ============================================ */

const Ads = {
    
    // Your Ad Network IDs (replace with real ones)
    networks: {
        adsterra: {
    popunderKey: '889554cbac659d714dc93b56d9e194b7',
    socialBarKey: '3e495ab467031ef4a211837c890dbba2',
    smartlinkKey: 'f9077165b1c528e6bc6fd05ec3302cbf',
    nativeBannerKey: '33a09e788da26a493e7cb3d24079d49e',
    banner300x250Key: '368869537135b685019c170be1b841a2',
    banner468x60Key: 'd5b030ab7dc6f25911930cebe81375a3',
    banner160x300Key: 'a4a628a3a5aebf58b894d49f345fad68',
    siteId: '5929701',
    active: true
        },
        propellerads: {
            zoneId: 'YOUR_PROPELLERADS_ZONE',
            active: true
        },
        monetag: {
            publisherId: 'YOUR_MONETAG_ID',
            active: true
        },
        hilltopads: {
            zoneId: 'YOUR_HILLTOPADS_ZONE',
            active: true
        },
        popads: {
            publisherId: 'YOUR_POPADS_ID',
            active: false
        },
        bidvertiser: {
            zoneId: 'YOUR_BIDVERTISER_ZONE',
            active: false
        },
        yllix: {
            publisherId: 'YOUR_YLLIX_ID',
            active: false
        }
    },
    
    adCounter: 0,
    interstitialCooldown: false,
    interstitialInterval: 5 * 60 * 1000, // 5 minutes
    rewardedAdReady: false,
    spinAdsWatched: 0,
    requiredAdsForSpin: 3,
    isLoadingAd: false,
    
    /* ==================
       INITIALIZE
       ================== */
    
    init() {
        this.loadAdScripts();
        this.setupPushNotificationAds();
        this.setupInterstitialTimer();
        this.injectBannerAds();
        console.log('💰 Ads initialized');
    },
    
    /* ==================
       LOAD AD SCRIPTS
       ================== */
    
    loadAdScripts() {
        // Adsterra - Social Bar (non-intrusive)
        if (this.networks.adsterra.active) {
            const script = document.createElement('script');
            script.async = true;
            script.setAttribute('data-cfasync', 'false');
            script.src = `//pl${this.networks.adsterra.key}.safeframe.googlesyndication.com/safechrome/js/adsbygoogle.js`;
            // Replace with actual Adsterra script URL from dashboard
            // script.src = 'https://pl17568770.highrevenuegate.com/YOUR_ID.js';
            document.head.appendChild(script);
        }
        
        // PropellerAds - Smart Link
        if (this.networks.propellerads.active) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://crypto.ondnitrajs.com/js/YOUR_PROPELLERADS_ID.js`;
            document.head.appendChild(script);
        }
        
        // Monetag - Push + Native
        if (this.networks.monetag.active) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://cdn.monetag.com/script/YOUR_MONETAG_SCRIPT.js`;
            document.head.appendChild(script);
        }
        
        // HilltopAds
        if (this.networks.hilltopads.active) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://jsc.hilltopads.net/YOUR_HILLTOP_SCRIPT.js`;
            document.head.appendChild(script);
        }
    },
    
    /* ==================
       BANNER ADS
       ================== */
    
    injectBannerAds() {
        // Create a floating banner container
        const bannerContainer = document.createElement('div');
        bannerContainer.id = 'ad-banner-container';
        bannerContainer.style.cssText = `
            position: fixed;
            bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 4px);
            left: 50%;
            transform: translateX(-50%);
            width: 320px;
            max-width: 90vw;
            z-index: 90;
            display: none;
            border-radius: var(--radius-md);
            overflow: hidden;
            box-shadow: var(--shadow-md);
        `;
        
        // Adsterra 320x50 Banner
        bannerContainer.innerHTML = `
            <div style="position:relative;">
                <button onclick="document.getElementById('ad-banner-container').style.display='none'"
                        style="position:absolute;top:2px;right:2px;z-index:5;width:20px;height:20px;
                               background:rgba(0,0,0,0.5);color:white;border-radius:50%;font-size:0.6rem;
                               display:flex;align-items:center;justify-content:center;">✕</button>
                <!-- Adsterra Banner Code -->
                <div id="adsterra-banner-320x50">
                    <!-- Replace with actual Adsterra banner code -->
                    <div style="width:320px;height:50px;background:var(--bg-tertiary);display:flex;
                                 align-items:center;justify-content:center;font-size:0.75rem;color:var(--text-tertiary);">
                        Advertisement
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(bannerContainer);
        
        // Show banner after 5 seconds
        setTimeout(() => {
            bannerContainer.style.display = 'block';
        }, 5000);
        
        // Auto-refresh banner every 60 seconds
        setInterval(() => {
            this.refreshBanner();
        }, 60000);
    },
    
    refreshBanner() {
        const banner = document.getElementById('adsterra-banner-320x50');
        if (banner) {
            // Trigger ad refresh
            banner.innerHTML = banner.innerHTML;
        }
    },
    
    /* ==================
       INTERSTITIAL ADS
       ================== */
    
    setupInterstitialTimer() {
        // Show interstitial every 5 minutes
        setInterval(() => {
            if (!this.interstitialCooldown && App.currentUser) {
                this.showInterstitial();
            }
        }, this.interstitialInterval);
    },
    
    showInterstitial(callback = null) {
        if (this.interstitialCooldown) {
            if (callback) callback();
            return;
        }
        
        this.interstitialCooldown = true;
        
        const overlay = document.createElement('div');
        overlay.id = 'interstitial-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.95);
            z-index: 500;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
        `;
        
        let countdown = 5;
        
        overlay.innerHTML = `
            <div style="width:100%;max-width:400px;background:var(--bg-secondary);border-radius:var(--radius-xl);overflow:hidden;">
                <div style="padding:12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-light);">
                    <span style="font-size:0.78rem;color:var(--text-secondary);">Advertisement</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span id="interstitial-countdown" style="font-size:0.78rem;color:var(--text-secondary);">
                            Close in ${countdown}s
                        </span>
                        <button id="interstitial-close-btn" onclick="Ads.closeInterstitial('${Date.now()}')"
                                style="display:none;padding:4px 12px;background:var(--bg-tertiary);border-radius:var(--radius-full);
                                       font-size:0.78rem;font-weight:600;color:var(--text-primary);">
                            Close ✕
                        </button>
                    </div>
                </div>
                
                <!-- Ad Content Area -->
                <div style="width:100%;min-height:300px;display:flex;align-items:center;justify-content:center;
                             background:var(--bg-tertiary);" id="interstitial-ad-content">
                    <!-- Adsterra Interstitial / PropellerAds Interstitial Code -->
                    <div style="text-align:center;color:var(--text-tertiary);">
                        <div style="font-size:2rem;margin-bottom:8px;">📢</div>
                        <p style="font-size:0.85rem;">Advertisement</p>
                        <!-- Place your ad network code here -->
                    </div>
                </div>
                
                <div style="padding:12px;text-align:center;">
                    <p style="font-size:0.72rem;color:var(--text-tertiary);">
                        Ads help keep Vidr free ❤️
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Countdown timer
        const countdownEl = overlay.querySelector('#interstitial-countdown');
        const closeBtn = overlay.querySelector('#interstitial-close-btn');
        
        const timer = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = `Close in ${countdown}s`;
            
            if (countdown <= 0) {
                clearInterval(timer);
                if (countdownEl) countdownEl.style.display = 'none';
                if (closeBtn) closeBtn.style.display = 'block';
            }
        }, 1000);
        
        overlay.dataset.callback = callback ? 'true' : 'false';
        overlay.dataset.callbackId = Date.now().toString();
        
        if (callback) {
            window[`_adCallback_${overlay.dataset.callbackId}`] = callback;
        }
        
        // Reset cooldown after 2 minutes
        setTimeout(() => {
            this.interstitialCooldown = false;
        }, 120000);
    },
    
    closeInterstitial(callbackId) {
        const overlay = document.getElementById('interstitial-overlay');
        if (overlay) {
            const cb = window[`_adCallback_${overlay.dataset.callbackId}`];
            overlay.remove();
            if (cb) {
                cb();
                delete window[`_adCallback_${overlay.dataset.callbackId}`];
            }
        }
    },
    
    /* ==================
       REWARDED ADS
       ================== */
    
    async showRewardedAd(onComplete) {
        if (this.isLoadingAd) return;
        this.isLoadingAd = true;
        
        App.showLoading();
        await new Promise(r => setTimeout(r, 1000));
        App.hideLoading();
        
        this.isLoadingAd = false;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.95);
            z-index: 500;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;
        
        let timeLeft = 15;
        
        overlay.innerHTML = `
            <div style="width:100%;max-width:400px;text-align:center;padding:24px;">
                <!-- Reward indicator -->
                <div style="background:var(--gradient-primary);border-radius:var(--radius-lg);padding:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <span style="font-size:1.2rem;">🎁</span>
                    <span style="color:white;font-weight:700;font-size:0.9rem;">Watch to earn a spin!</span>
                </div>
                
                <!-- Ad content -->
                <div style="width:100%;height:250px;background:var(--bg-secondary);border-radius:var(--radius-lg);
                             display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;overflow:hidden;">
                    <div style="text-align:center;color:var(--text-tertiary);">
                        <div style="font-size:3rem;margin-bottom:8px;">📱</div>
                        <p>Rewarded Ad Playing...</p>
                        <!-- Adsterra / PropellerAds rewarded ad code here -->
                    </div>
                    
                    <!-- Progress bar -->
                    <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.2);">
                        <div id="ad-progress-bar" style="height:100%;background:var(--gradient-primary);width:0%;transition:width 0.5s;border-radius:var(--radius-full);"></div>
                    </div>
                </div>
                
                <!-- Timer -->
                <div style="display:flex;align-items:center;justify-content:center;gap:8px;color:white;">
                    <div style="width:40px;height:40px;border:3px solid var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;" id="ad-timer">
                        ${timeLeft}
                    </div>
                    <span style="font-size:0.85rem;opacity:0.8;">seconds remaining</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const timerEl = overlay.querySelector('#ad-timer');
        const progressBar = overlay.querySelector('#ad-progress-bar');
        const totalTime = timeLeft;
        
        const timer = setInterval(() => {
            timeLeft--;
            if (timerEl) timerEl.textContent = timeLeft;
            if (progressBar) progressBar.style.width = ((totalTime - timeLeft) / totalTime * 100) + '%';
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                overlay.remove();
                if (onComplete) onComplete();
            }
        }, 1000);
    },
    
    /* ==================
       PUSH NOTIFICATION ADS
       ================== */
    
    setupPushNotificationAds() {
        // PropellerAds Push Notifications
        if (this.networks.propellerads.active && 'Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    // Register push service worker for PropellerAds
                    // This will be handled by PropellerAds SDK
                }
            });
        }
        
        // Monetag Push Notifications
        if (this.networks.monetag.active) {
            // Monetag handles push registration automatically via their script
        }
    },
    
    /* ==================
       FEED ADS
       ================== */
    
    renderFeedAd() {
        const adTypes = ['adsterra', 'propellerads', 'monetag'];
        const adType = adTypes[this.adCounter % adTypes.length];
        
        return `
            <div class="feed-item ad-feed-item" style="scroll-snap-align:start;background:var(--bg-primary);">
                <div class="ad-label">Ad</div>
                <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    ${this.renderInlineFeedAd(adType)}
                </div>
            </div>
        `;
    },
    
    renderInlineFeedAd(network) {
        switch(network) {
            case 'adsterra':
                return `
                    <!-- Adsterra Native / In-feed Ad -->
                    <div style="width:100%;max-width:400px;padding:16px;">
                        <ins class="adsbygoogle"
                             style="display:block"
                             data-ad-format="fluid"
                             data-ad-layout-key="-gw-3+1f-3d+2z"
                             data-ad-client="ca-pub-ADSTERRA_ID"
                             data-ad-slot="YOUR_SLOT_ID"></ins>
                    </div>
                `;
            case 'propellerads':
                return `
                    <div id="propeller-infeed-${Date.now()}" style="width:300px;height:250px;">
                        <!-- PropellerAds Zone Code -->
                    </div>
                `;
            case 'monetag':
                return `
                    <div id="monetag-infeed-${Date.now()}" style="width:300px;height:250px;">
                        <!-- Monetag Native Ad Code -->
                    </div>
                `;
            default:
                return `<div style="width:300px;height:250px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;border-radius:var(--radius-lg);color:var(--text-tertiary);font-size:0.85rem;">Ad</div>`;
        }
    },
    
    /* ==================
       POPUNDER ADS
       ================== */
    
    triggerPopunder() {
        // PopAds / Adsterra Popunder - triggered on first click
        if (!sessionStorage.getItem('popunder_shown')) {
            sessionStorage.setItem('popunder_shown', 'true');
            
            // Adsterra Popunder
            if (this.networks.adsterra.active) {
                // window.open('https://www.adsterra.com/popunder/YOUR_KEY', '_blank');
            }
            
            // PropellerAds Onclick
            if (this.networks.propellerads.active) {
                // Handled by PropellerAds script automatically
            }
        }
    },
    
    /* ==================
       AD REVENUE TRACKER
       ================== */
    
    trackImpression(network, type) {
        if (!App.currentUser) return;
        
        // Track ad impressions for analytics
        const today = new Date().toISOString().split('T')[0];
        
        db.collection('ad_analytics').doc(today).set({
            [`${network}_${type}`]: firebase.firestore.FieldValue.increment(1),
            totalImpressions: firebase.firestore.FieldValue.increment(1),
            date: today
        }, { merge: true });
    }
};