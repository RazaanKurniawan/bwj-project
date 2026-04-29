// src/firebase.js
   import { initializeApp } from "firebase/app";
   import { getDatabase } from "firebase/database";

   // GANTI KODE DI BAWAH INI SAMA PUNYA LU YANG TADI DI-COPY
   const firebaseConfig = {
  apiKey: "AIzaSyC6sIfvlt59g8iSdniKvGkaItK7gTOADWM",
  authDomain: "bwj-project.firebaseapp.com",
  databaseURL: "https://bwj-project-default-rtdb.firebaseio.com",
  projectId: "bwj-project",
  storageBucket: "bwj-project.firebasestorage.app",
  messagingSenderId: "637703909231",
  appId: "1:637703909231:web:4d6fe0920f61f66453829a",
  measurementId: "G-GTHX4NNFN3"
};

   // Inisialisasi Firebase
   const app = initializeApp(firebaseConfig);
   
   // Inisialisasi Realtime Database
   const db = getDatabase(app);

   export { db };