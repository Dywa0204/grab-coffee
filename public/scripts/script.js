const firebaseConfig = {
    apiKey: "AIzaSyCcL0982RRAtyRLGZptXuWL5zMiU_PQQxo",
    authDomain: "grab-coffee-5d5ad.firebaseapp.com",
    projectId: "grab-coffee-5d5ad",
    storageBucket: "grab-coffee-5d5ad.appspot.com",
    messagingSenderId: "700528440582",
    appId: "1:700528440582:web:cadf73fbbcd057139a5a87"
};

firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const storage = firebase.storage();