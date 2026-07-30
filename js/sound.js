/* ============================================
   SOUND EFFECTS MODULE
   File: js/sound.js
   
   Handles all sound effects with:
   - Preloading
   - Volume control
   - User preference toggle
   - Web Audio API for better performance
   ============================================ */

const Sound = {
    
    // Sound files registry
    sounds: {
        click: 'assets/sounds/click.mp3',
        like: 'assets/sounds/like.mp3',
        notification: 'assets/sounds/notification.mp3',
        message: 'assets/sounds/message.mp3',
        gift: 'assets/sounds/gift.mp3',
        coin: 'assets/sounds/coin.mp3',
        levelUp: 'assets/sounds/level-up.mp3',
        achievement: 'assets/sounds/achievement.mp3',
        error: 'assets/sounds/error.mp3',
        success: 'assets/sounds/success.mp3',
        swipe: 'assets/sounds/swipe.mp3',
        pop: 'assets/sounds/pop.mp3',
        whoosh: 'assets/sounds/whoosh.mp3',
        spin: 'assets/sounds/spin.mp3',
        win: 'assets/sounds/win.mp3',
        lose: 'assets/sounds/lose.mp3',
        typing: 'assets/sounds/typing.mp3',
        camera: 'assets/sounds/camera.mp3',
        liveStart: 'assets/sounds/live-start.mp3',
        follow: 'assets/sounds/follow.mp3',
        purchase: 'assets/sounds/purchase.mp3'
    },
    
    // Audio elements cache
    audioCache: {},
    
    // Settings
    enabled: true,
    volume: 0.5,
    lastPlayed: {},
    minInterval: 50, // ms between same sound
    audioContext: null,
    userInteracted: false,
    
    /* ==================
       INITIALIZE
       ================== */
    
    init() {
        // Load user preferences
        this.enabled = localStorage.getItem('vidr_sound_enabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('vidr_sound_volume')) || 0.5;
        
        // Preload critical sounds
        this.preload([
            'click',
            'like',
            'notification',
            'pop',
            'success',
            'error'
        ]);
        
        // Setup user interaction detection (browsers block audio before interaction)
        this.setupUserInteraction();
        
        console.log('🔊 Sound system initialized');
    },
    
    /* ==================
       USER INTERACTION
       (Required by browsers to allow audio)
       ================== */
    
    setupUserInteraction() {
        const handleInteraction = () => {
            this.userInteracted = true;
            
            // Initialize Web Audio Context
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('Web Audio not supported');
                }
            }
            
            // Resume context if suspended
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Remove listeners after first interaction
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };
        
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });
    },
    
    /* ==================
       PRELOAD SOUNDS
       ================== */
    
    preload(soundNames = []) {
        soundNames.forEach(name => {
            if (this.sounds[name] && !this.audioCache[name]) {
                const audio = new Audio(this.sounds[name]);
                audio.preload = 'auto';
                audio.volume = this.volume;
                this.audioCache[name] = audio;
            }
        });
    },
    
    preloadAll() {
        Object.keys(this.sounds).forEach(name => {
            if (!this.audioCache[name]) {
                const audio = new Audio(this.sounds[name]);
                audio.preload = 'auto';
                audio.volume = this.volume;
                this.audioCache[name] = audio;
            }
        });
    },
    
    /* ==================
       PLAY SOUND
       ================== */
    
    play(soundName, options = {}) {
        if (!this.enabled) return;
        if (!this.userInteracted) return;
        if (!this.sounds[soundName]) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }
        
        // Throttle same sound
        const now = Date.now();
        if (this.lastPlayed[soundName] && now - this.lastPlayed[soundName] < this.minInterval) {
            return;
        }
        this.lastPlayed[soundName] = now;
        
        try {
            // Get or create audio element
            let audio = this.audioCache[soundName];
            
            if (!audio) {
                audio = new Audio(this.sounds[soundName]);
                this.audioCache[soundName] = audio;
            }
            
            // Clone for overlapping playback
            const clone = audio.cloneNode();
            clone.volume = (options.volume ?? 1) * this.volume;
            
            if (options.playbackRate) {
                clone.playbackRate = options.playbackRate;
            }
            
            clone.play().catch(err => {
                console.warn('Sound play blocked:', soundName);
            });
            
            // Cleanup after playing
            clone.onended = () => {
                clone.remove();
            };
            
        } catch (error) {
            console.warn('Sound error:', error);
        }
    },
    
    /* ==================
       PLAY WITH VARIATION
       (For repetitive sounds like typing)
       ================== */
    
    playRandom(soundName) {
        this.play(soundName, {
            playbackRate: 0.9 + Math.random() * 0.2
        });
    },
    
    /* ==================
       STOP ALL SOUNDS
       ================== */
    
    stopAll() {
        Object.values(this.audioCache).forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {}
        });
    },
    
    /* ==================
       VOLUME CONTROL
       ================== */
    
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        localStorage.setItem('vidr_sound_volume', this.volume.toString());
        
        // Update all cached audio
        Object.values(this.audioCache).forEach(audio => {
            audio.volume = this.volume;
        });
    },
    
    /* ==================
       ENABLE / DISABLE
       ================== */
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('vidr_sound_enabled', this.enabled.toString());
        
        if (this.enabled) {
            this.play('pop');
            App.showToast('🔊 Sound On', 'info');
        } else {
            App.showToast('🔇 Sound Off', 'info');
        }
        
        return this.enabled;
    },
    
    enable() {
        this.enabled = true;
        localStorage.setItem('vidr_sound_enabled', 'true');
    },
    
    disable() {
        this.enabled = false;
        localStorage.setItem('vidr_sound_enabled', 'false');
    },
    
    /* ==================
       HAPTIC FEEDBACK
       (Vibration for mobile)
       ================== */
    
    haptic(type = 'light') {
        if (!navigator.vibrate) return;
        if (!this.enabled) return;
        
        const patterns = {
            light: 10,
            medium: 25,
            heavy: 50,
            success: [10, 50, 10],
            error: [50, 30, 50, 30, 50],
            notification: [100, 50, 100],
            heartbeat: [100, 100, 100, 100, 100]
        };
        
        try {
            navigator.vibrate(patterns[type] || patterns.light);
        } catch (e) {}
    },
    
    /* ==================
       COMBINED SOUND + HAPTIC
       ================== */
    
    feedback(soundName, hapticType = 'light') {
        this.play(soundName);
        this.haptic(hapticType);
    }
};

/* ============================================
   AUTO SOUND EFFECTS FOR UI
   Add to bottom of sound.js
   ============================================ */

// Auto-add sound to all button clicks
document.addEventListener('DOMContentLoaded', () => {
    // Wait for sound module to init
    setTimeout(() => {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .btn, .nav-item, .clickable');
            if (!target) return;
            
            // Skip if data-nosound attribute
            if (target.dataset.nosound) return;
            
            // Don't play if inside disabled element
            if (target.disabled) return;
            
            // Determine sound based on button type
            if (target.classList.contains('btn-primary')) {
                Sound.play('pop');
            } else if (target.classList.contains('btn-danger')) {
                Sound.play('error');
            } else if (target.classList.contains('feed-action-btn')) {
                // Already handled in Feed module
                return;
            } else if (target.classList.contains('close-btn') || target.classList.contains('back-btn')) {
                Sound.play('swipe');
            } else if (target.classList.contains('nav-item')) {
                Sound.play('click');
                Sound.haptic('light');
            } else {
                Sound.play('click');
            }
        }, true);
        
        // Sound on modal open
        const originalAppendChild = HTMLElement.prototype.appendChild;
        // Detect modal opens by watching body
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.classList?.contains('modal-overlay') || 
                        node.classList?.contains('modal-bottom')) {
                        Sound.play('whoosh');
                    }
                    if (node.classList?.contains('toast')) {
                        // Toast sound handled by App.showToast
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true });
    }, 500);
});