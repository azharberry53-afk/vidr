/* ============================================
   FIREBASE CONFIGURATION
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAkly2twR_NDAHIBJQRZToUhPmm0nLh1XI",
  authDomain: "vidr-d183f.firebaseapp.com",
  databaseURL: "https://vidr-d183f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vidr-d183f",
  storageBucket: "vidr-d183f.firebasestorage.app",
  messagingSenderId: "1049465277288",
  appId: "1:1049465277288:web:95e96419094f78155724dd"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();
const storage = firebase.storage();

// Firestore Settings for Performance
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
});

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence not available');
    }
});

// Collections Reference
const Collections = {
    USERS: 'users',
    POSTS: 'posts',
    COMMENTS: 'comments',
    LIKES: 'likes',
    FOLLOWERS: 'followers',
    FOLLOWING: 'following',
    CHATS: 'chats',
    MESSAGES: 'messages',
    NOTIFICATIONS: 'notifications',
    GIFTS: 'gifts',
    PRODUCTS: 'products',
    ORDERS: 'orders',
    TRANSACTIONS: 'transactions',
    REPORTS: 'reports',
    ACHIEVEMENTS: 'achievements',
    TITLES: 'titles',
    STORIES: 'stories',
    LIVE_STREAMS: 'liveStreams',
    FRIEND_REQUESTS: 'friendRequests',
    BLOCKS: 'blocks',
    DAILY_REWARDS: 'dailyRewards',
    XP_BOOSTS: 'xpBoosts',
    SETTINGS: 'settings',
    BOTS: 'bots'
};

console.log('🔥 Firebase initialized');