import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC5Vu87Y8XdASZ_FijqbTNEl-rQPQ_pudk",
    authDomain: "evaluation-4d-dash.firebaseapp.com",
    projectId: "evaluation-4d-dash",
    storageBucket: "evaluation-4d-dash.firebasestorage.app",
    messagingSenderId: "835508848865",
    appId: "1:835508848865:web:fbfa88b847b07ea4a8cfa0",
    measurementId: "G-BF4GRF9CVS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { doc, setDoc, getDoc };