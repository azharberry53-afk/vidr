/* ============================================
   AUTHENTICATION MODULE
   ============================================ */

const Auth = {
    
    /* ==================
       EMAIL LOGIN
       ================== */
    
    async loginEmail() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            App.showToast('Please fill in all fields', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            App.showToast('Welcome back! 👋', 'success');
        } catch (error) {
            this.handleAuthError(error);
        }
        
        App.hideLoading();
    },
    
    /* ==================
       REGISTRATION
       ================== */
    
    async register() {
        const username = document.getElementById('reg-username').value.trim().toLowerCase();
        const displayName = document.getElementById('reg-displayname').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        // Validation
        if (!username || !displayName || !email || !password) {
            App.showToast('Please fill in all fields', 'warning');
            return;
        }
        
        if (username.length < 3 || username.length > 20) {
            App.showToast('Username must be 3-20 characters', 'warning');
            return;
        }
        
        if (!/^[a-z0-9_]+$/.test(username)) {
            App.showToast('Username: letters, numbers, underscores only', 'warning');
            return;
        }
        
        if (password.length < 8) {
            App.showToast('Password must be at least 8 characters', 'warning');
            return;
        }
        
        if (password !== confirmPassword) {
            App.showToast('Passwords do not match', 'warning');
            return;
        }
        
        App.showLoading();
        
        try {
            // Check username uniqueness
            const usernameCheck = await db.collection(Collections.USERS)
                .where('username', '==', username)
                .limit(1)
                .get();
            
            if (!usernameCheck.empty) {
                App.showToast('Username already taken', 'warning');
                App.hideLoading();
                return;
            }
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            await userCredential.user.updateProfile({
                displayName: displayName
            });
            
            // User document will be created by onAuthStateChanged
            App.showToast('Account created! Welcome! 🎉', 'success');
            
        } catch (error) {
            this.handleAuthError(error);
        }
        
        App.hideLoading();
    },
    
    /* ==================
       GOOGLE LOGIN
       ================== */
    
    async loginGoogle() {
        App.showLoading();
        
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            await auth.signInWithPopup(provider);
            App.showToast('Welcome! 🎉', 'success');
            
        } catch (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                this.handleAuthError(error);
            }
        }
        
        App.hideLoading();
    },
    
    /* ==================
       LOGOUT
       ================== */
    
    async logout() {
        try {
            // Update last active
            if (App.currentUser) {
                await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            await auth.signOut();
            App.currentUser = null;
            App.showToast('Logged out', 'info');
            
        } catch (error) {
            console.error('Logout error:', error);
        }
    },
    
    /* ==================
       SCREEN SWITCH
       ================== */
    
    showRegister() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('register-screen').style.display = 'flex';
    },
    
    showLogin() {
        document.getElementById('register-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    },
    
    /* ==================
       ERROR HANDLER
       ================== */
    
    handleAuthError(error) {
        const messages = {
            'auth/email-already-in-use': 'Email already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'Account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/weak-password': 'Password is too weak',
            'auth/network-request-failed': 'Network error. Check your connection',
            'auth/too-many-requests': 'Too many attempts. Try again later',
            'auth/popup-blocked': 'Popup blocked. Allow popups and try again'
        };
        
        const message = messages[error.code] || 'An error occurred. Please try again.';
        App.showToast(message, 'error');
        console.error('Auth error:', error);
    }
};