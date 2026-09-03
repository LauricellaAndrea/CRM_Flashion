import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration using credentials from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDxHASrgdONgDKTpLhvKml-yImqOXdrJM4",
  authDomain: "agentverse-summoner-cypkmmitjj.firebaseapp.com",
  projectId: "agentverse-summoner-cypkmmitjj",
  storageBucket: "agentverse-summoner-cypkmmitjj.firebasestorage.app",
  messagingSenderId: "94580553617",
  appId: "1:94580553617:web:8a3ab585dccef828624c30"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID from the provisioned instance
export const db = getFirestore(app, "ai-studio-0f2a6b18-3a31-4481-b2ba-682359bdf9bf");
