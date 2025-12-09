// firebase.js - Firebase utilities for the Christmas Gift Exchange app

// Your real Firebase config (provided by user)
const firebaseConfig = {
    apiKey: "AIzaSyCOxCavlsWWB662RO15X4iDcSZFrtH2uTI",
    authDomain: "christmasgiftexchange-8d38e.firebaseapp.com",
    projectId: "christmasgiftexchange-8d38e",
    storageBucket: "christmasgiftexchange-8d38e.firebasestorage.app",
    messagingSenderId: "184610390168",
    appId: "1:184610390168:web:fc87da7d2c88db285790ed",
    measurementId: "G-XYBRD248ES"
};

let app = null;
let db = null;
let isFirebaseAvailable = false;

try {
    // Import Firebase modules
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
    
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseAvailable = true;
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed:", error);
    alert("Firebase not set up. Using local storage (data not shared across devices).");
}

// Export functions
export { db, isFirebaseAvailable };

// Function to register a new user
export async function registerUser(name, email) {
    const newUser = { name, email, wishlist: '' };
    try {
        if (isFirebaseAvailable) {
            const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
            const docRef = doc(db, 'users', email);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                throw new Error('Account already exists! Please login instead.');
            }
            await setDoc(docRef, newUser);
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            // Add to global shared list for fallback
            let sharedUsers = JSON.parse(localStorage.getItem('sharedChristmasUsers')) || [];
            sharedUsers.push(newUser);
            localStorage.setItem('sharedChristmasUsers', JSON.stringify(sharedUsers));
            return { success: true, message: 'Registered successfully!' };
        } else {
            let users = JSON.parse(localStorage.getItem('christmasUsers')) || [];
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                throw new Error('Account already exists! Please login instead.');
            }
            users.push(newUser);
            localStorage.setItem('christmasUsers', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            // Simulate shared
            let sharedUsers = JSON.parse(localStorage.getItem('sharedChristmasUsers')) || [];
            sharedUsers.push(newUser);
            localStorage.setItem('sharedChristmasUsers', JSON.stringify(sharedUsers));
            return { success: true, message: 'Registered locally!' };
        }
    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, message: error.message };
    }
}

// Function to login an existing user
export async function loginUser(email) {
    try {
        if (isFirebaseAvailable) {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
            const docRef = doc(db, 'users', email);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error('Account not found. Please register first.');
            }
            localStorage.setItem('currentUser', JSON.stringify(docSnap.data()));
            return { success: true, message: 'Logged in successfully!' };
        } else {
            let users = JSON.parse(localStorage.getItem('christmasUsers')) || [];
            const existingUser = users.find(u => u.email === email);
            if (!existingUser) {
                throw new Error('Account not found. Please register first.');
            }
            localStorage.setItem('currentUser', JSON.stringify(existingUser));
            return { success: true, message: 'Logged in locally!' };
        }
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, message: error.message };
    }
}

// Function to save wishlist for current user
export async function saveWishlist(wishlistText) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return { success: false, message: 'No user logged in.' };
    
    currentUser.wishlist = wishlistText;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    try {
        if (isFirebaseAvailable) {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
            await setDoc(doc(db, 'users', currentUser.email), currentUser);
            // Update shared list
            let sharedUsers = JSON.parse(localStorage.getItem('sharedChristmasUsers')) || [];
            const index = sharedUsers.findIndex(u => u.email === currentUser.email);
            if (index !== -1) sharedUsers[index] = currentUser;
            localStorage.setItem('sharedChristmasUsers', JSON.stringify(sharedUsers));
            return { success: true, message: 'Wishlist saved and synced!' };
        } else {
            let users = JSON.parse(localStorage.getItem('christmasUsers')) || [];
            const index = users.findIndex(u => u.email === currentUser.email);
            if (index !== -1) {
                users[index] = currentUser;
                localStorage.setItem('christmasUsers', JSON.stringify(users));
            }
            // Update shared list
            let sharedUsers = JSON.parse(localStorage.getItem('sharedChristmasUsers')) || [];
            const sharedIndex = sharedUsers.findIndex(u => u.email === currentUser.email);
            if (sharedIndex !== -1) sharedUsers[sharedIndex] = currentUser;
            localStorage.setItem('sharedChristmasUsers', JSON.stringify(sharedUsers));
            return { success: true, message: 'Wishlist saved locally!' };
        }
    } catch (error) {
        console.error("Save wishlist error:", error);
        return { success: false, message: error.message };
    }
}

// Function to load history (all users)
export async function loadHistory(callback) {
    console.log("Loading history...");
    if (isFirebaseAvailable) {
        try {
            const { collection, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
            console.log("Setting up Firebase listener...");
            onSnapshot(collection(db, 'users'), (snapshot) => {
                const users = [];
                snapshot.forEach((doc) => users.push(doc.data()));
                console.log("Firebase users loaded:", users.length);
                callback(users);
            });
        } catch (error) {
            console.error("Firebase load history error:", error);
            loadLocalHistory(callback);
        }
    } else {
        console.log("Firebase not available, loading local history.");
        loadLocalHistory(callback);
    }
}

function loadLocalHistory(callback) {
    // Use shared list for "simulated" sharing on same device
    const users = JSON.parse(localStorage.getItem('sharedChristmasUsers')) || [];
    console.log("Local/shared users loaded:", users.length);
    callback(users);
}

// Function to load current user's wishlist on page load
export async function loadUserWishlist() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return '';
    
    try {
        if (isFirebaseAvailable) {
            const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
            const docRef = doc(db, 'users', currentUser.email);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return data.wishlist || '';
            } else {
                await setDoc(docRef, currentUser);
                return '';
            }
        } else {
            return currentUser.wishlist || '';
        }
    } catch (error) {
        console.error("Load wishlist error:", error);
        return currentUser.wishlist || '';
    }
}
