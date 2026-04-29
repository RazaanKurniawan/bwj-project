<script setup>
import { ref, onMounted } from 'vue'
import { db } from './firebase.js'
import { ref as dbRef, set, onValue } from 'firebase/database'

// Import Peta dari Leaflet
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ==========================================
// 1. LOGIKA CUSTOMER (NAMPILIN PETA)
// ==========================================
const map = ref(null)
let truckMarker = null

onMounted(() => {
  // Bikin peta dasar, pasang di elemen dengan id "mapContainer"
  // Angka [-6.200, 106.816] itu default tengah map (sekitaran Jakarta)
  map.value = L.map('mapContainer').setView([-6.200000, 106.816666], 13)

  // Masukin gambar peta gratis dari OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map.value)

  // Bikin Custom Marker pakai Emoji Truk biar keren
  const truckIcon = L.divIcon({
    html: '<div style="font-size: 35px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">🚚</div>',
    className: 'custom-truck-icon',
    iconSize: [35, 35],
    iconAnchor: [17, 17] // Biar titik tengah truknya pas di kordinat
  })

  // MANTENGIN FIREBASE (Ini keajaiban real-time nya)
  const truckDatabaseRef = dbRef(db, 'pengiriman/truk_01')
  onValue(truckDatabaseRef, (snapshot) => {
    const data = snapshot.val()
    
    // Cek kalau datanya ada dan punya kordinat
    if (data && data.lat && data.lng) {
      const posisiTruk = [data.lat, data.lng]

      // Kalau ikon truk belum ada di map, kita bikin baru
      if (!truckMarker) {
        truckMarker = L.marker(posisiTruk, { icon: truckIcon })
          .addTo(map.value)
          .bindPopup(`<b>Truk Air #01</b><br>Status: ${data.status}`)
          .openPopup()
      } else {
        // Kalau truknya udah ada, kita TINGGAL GESER posisinya!
        truckMarker.setLatLng(posisiTruk)
        truckMarker.getPopup().setContent(`<b>Truk Air #01</b><br>Status: ${data.status}`)
      }

      // Opsional: Bikin kamera map otomatis nge-zoom dan ngikutin posisi truk
      map.value.setView(posisiTruk, 16)
    }
  })
})

// ==========================================
// 2. LOGIKA SUPIR (NGIRIM LOKASI)
// ==========================================
const isTracking = ref(false)
const latitude = ref(null)
const longitude = ref(null)
const errorMsg = ref('')
let watchId = null

const startTracking = () => {
  if (!("geolocation" in navigator)) {
    errorMsg.value = "Yah, browser HP ini nggak support GPS nih."
    return
  }

  isTracking.value = true
  errorMsg.value = ''

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      latitude.value = position.coords.latitude
      longitude.value = position.coords.longitude

      const supirDatabaseRef = dbRef(db, 'pengiriman/truk_01')
      set(supirDatabaseRef, {
        lat: latitude.value,
        lng: longitude.value,
        status: "Sedang Mengantar Air",
        waktu_update: new Date().toLocaleTimeString()
      })
    },
    (error) => {
      errorMsg.value = "Gagal dapet lokasi: " + error.message
      isTracking.value = false
    },
    { enableHighAccuracy: true, maximumAge: 0 }
  )
}

const stopTracking = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  isTracking.value = false

  const supirDatabaseRef = dbRef(db, 'pengiriman/truk_01')
  set(supirDatabaseRef, {
    lat: latitude.value || 0,
    lng: longitude.value || 0,
    status: "Selesai / Standby",
    waktu_update: new Date().toLocaleTimeString()
  })
}
</script>

<template>
  <main class="container">
    
    <!-- Bagian Atas: HP SUPIR -->
    <div class="panel-supir">
      <h2>📱 Panel Supir</h2>
      <p>Status: <span :class="isTracking ? 'jalan' : 'stop'">{{ isTracking ? 'JALAN' : 'BERHENTI' }}</span></p>
      
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <button v-if="!isTracking" @click="startTracking" class="btn-mulai">Mulai Antar 🚚</button>
      <button v-else @click="stopTracking" class="btn-stop">Selesai Antar 🛑</button>
    </div>

    <!-- Bagian Bawah: LAYAR CUSTOMER (MAP) -->
    <div class="panel-customer">
      <h2>🗺️ Live Map Customer</h2>
      <!-- Map nya bakal dirender di dalem div ini -->
      <div id="mapContainer"></div> 
    </div>

  </main>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 20px auto;
  font-family: Arial, sans-serif;
  text-align: center;
}

/* Styling Panel Supir */
.panel-supir {
  background-color: #f1f5f9;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  border: 2px solid #cbd5e1;
}

/* Styling Layar Customer & Peta */
.panel-customer {
  background-color: #fff;
  padding: 10px;
  border-radius: 10px;
  border: 2px solid #cbd5e1;
}

/* TINGGI PETA NYA DIATUR DI SINI */
#mapContainer {
  height: 400px;
  width: 100%;
  border-radius: 8px;
  z-index: 1; /* Biar ngga nabrak tampilan Vue lain */
}

/* Styling Tombol & Teks */
.jalan { color: green; font-weight: bold; }
.stop { color: red; font-weight: bold; }
.error { color: red; }
.btn-mulai { background-color: #4CAF50; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; font-weight: bold; }
.btn-stop { background-color: #f44336; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; font-weight: bold;}
.custom-truck-icon { background: transparent; border: none; }
</style>