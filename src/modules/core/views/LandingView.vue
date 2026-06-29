<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import { useAuthStore } from '../../auth/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const avgRating = ref(0)
const totalReviews = ref(0)
const currentSlide = ref(0)
const images = [
  '/Cuplikan layar 2026-06-08 090900.png',
  '/WhatsApp Image 2026-06-20 at 16.23.03 (1).jpeg',
  '/WhatsApp Image 2026-06-20 at 16.23.03.jpeg',
]
let interval: any = null

const reviews = ref<any[]>([])
const activeFaq = ref<number | null>(null)

const dashboardPath = computed(() => {
  const role = authStore.profile.value?.role
  if (role === 'admin') return '/admin'
  if (role === 'driver') return '/driver'
  return '/customer'
})

onMounted(async () => {
  await authStore.initAuth()
  interval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % images.length
  }, 4000)
  
  try {
    const { data } = await supabase.rpc('get_rating_stats')
    if (data?.[0]?.total_reviews > 0) {
      totalReviews.value = Number(data[0].total_reviews)
      avgRating.value = Number(data[0].avg_rating)
    }
  } catch (err) {
    console.error(err)
  }

  // Fetch reviews from DB via RPC (bypasses RLS)
  try {
    const { data: rpcReviews } = await supabase.rpc('get_recent_reviews', { limit_val: 6 })
    if (rpcReviews && rpcReviews.length > 0) {
      reviews.value = rpcReviews
      return
    }
  } catch (err) {
    console.error('Error fetching reviews via RPC:', err)
  }

  // Fallback direct query (if RLS is open or logged in)
  try {
    const { data: realReviews } = await supabase
      .from('orders')
      .select('customer_name, rating, review, created_at')
      .not('rating', 'is', null)
      .not('review', 'is', null)
      .neq('review', '')
      .order('created_at', { ascending: false })
      .limit(6)
    
    if (realReviews && realReviews.length > 0) {
      reviews.value = realReviews
    }
  } catch (err) {
    console.error('Error fetching reviews directly:', err)
  }
})
onUnmounted(() => { if (interval) clearInterval(interval) })
</script>

<template>
  <div class="landing">
    <!-- Navbar -->
    <nav class="nav">
      <div class="nav-inner">
        <div class="nav-brand">
          <img src="/logobwj.jpeg" alt="BWJ" class="nav-logo" />
          <span class="nav-title">Berdikari Water Jaya</span>
        </div>
        <div class="nav-actions" v-if="!authStore.loading.value">
          <template v-if="authStore.profile.value">
            <span class="nav-user-greeting">Halo, <strong>{{ authStore.profile.value.name }}</strong></span>
            <button class="btn-cta" @click="router.push(dashboardPath)">Ke Dashboard</button>
          </template>
          <template v-else>
            <button class="btn-ghost" @click="router.push('/login')">Masuk</button>
            <button class="btn-cta" @click="router.push('/login')">Daftar Gratis</button>
          </template>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg">
        <div v-for="(img, i) in images" :key="i" class="hero-slide" :class="{ active: i === currentSlide }" :style="{ backgroundImage: `url('${img}')` }"></div>
        <div class="hero-overlay"></div>
      </div>
      <div class="hero-content">
        <span class="hero-badge">🚛 Depot Tangki Air Terpercaya</span>
        <h1>Solusi Air Bersih<br/>untuk Kebutuhan Anda</h1>
        <p>Layanan pengisian dan pengiriman air bersih cepat &amp; terpercaya di Depok, Jawa Barat. Pesan langsung dari HP Anda!</p>
        <div class="hero-btns">
          <button class="btn-hero" @click="router.push(authStore.profile.value ? dashboardPath : '/login')">Pesan Sekarang</button>
          <a href="#tentang" class="btn-hero-outline">Pelajari Lebih</a>
        </div>
        <div v-if="totalReviews > 0" class="hero-rating">
          <div class="stars">
            <svg v-for="i in 5" :key="i" width="18" height="18" viewBox="0 0 24 24" :fill="i <= Math.round(avgRating) ? '#fbbf24' : 'none'" :stroke="i <= Math.round(avgRating) ? '#fbbf24' : 'rgba(255,255,255,0.4)'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <span>{{ avgRating.toFixed(1) }} dari {{ totalReviews }} ulasan</span>
        </div>
      </div>
    </section>

    <!-- Tentang -->
    <section id="tentang" class="section about">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Tentang Kami</span>
          <h2>Mengapa Memilih BWJ?</h2>
          <p>Berdikari Water Jaya adalah depot tangki air bersih yang melayani wilayah Depok dan sekitarnya dengan kualitas terbaik.</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon blue">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Air Bersih Berkualitas</h3>
            <p>Air bersih yang telah melewati proses penyaringan dan uji kualitas sehingga aman untuk digunakan.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon green">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <h3>Pengiriman Cepat</h3>
            <p>Armada tangki air siap mengantar ke lokasi Anda dengan cepat dan tepat waktu di area Depok.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon purple">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <h3>Lacak Pesanan Real-time</h3>
            <p>Pantau status pesanan dan posisi supir secara langsung melalui fitur tracking di aplikasi.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon amber">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            </div>
            <h3>Program Hadiah</h3>
            <p>Dapatkan poin dari setiap pemesanan dan tukarkan dengan hadiah menarik sebagai pelanggan setia.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Kategori & Daftar Harga -->
    <section class="section pricing-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Pilihan Air</span>
          <h2>Kategori Air &amp; Daftar Harga</h2>
          <p>Kami menyediakan dua pilihan kategori air bersih sesuai dengan kebutuhan industri, depot, maupun konsumsi rumah tangga Anda.</p>
        </div>
        
        <div class="pricing-grid">
          <!-- Air Pam Card -->
          <div class="pricing-card">
            <div class="pricing-badge blue">Air Bersih &amp; Proyek</div>
            <div class="pricing-card-header">
              <h3>Air Pam</h3>
              <p class="pricing-desc">Air bersih berkualitas tinggi yang bersumber langsung dari instalasi PDAM/PAM resmi, sangat ideal untuk kebutuhan sanitasi dan operasional.</p>
            </div>
            <div class="pricing-price">
              <span class="price-val">Rp 100.000</span>
              <span class="price-unit">/ Mobil Tangki</span>
            </div>
            <ul class="pricing-features">
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Cocok untuk sanitasi, mandi &amp; cuci</span>
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Sangat ideal untuk kolam renang &amp; proyek</span>
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Pengiriman cepat dengan truk tangki khusus</span>
              </li>
            </ul>
            <button class="pricing-btn btn-blue" @click="router.push(authStore.profile.value ? dashboardPath : '/login')">Pesan Air Pam</button>
          </div>

          <!-- Air Minum Card -->
          <div class="pricing-card highlighted">
            <div class="pricing-badge green">Khusus Konsumsi</div>
            <div class="pricing-card-header">
              <h3>Air Minum</h3>
              <p class="pricing-desc">Air bersih standar konsumsi tinggi yang higienis dan teruji, siap mensuplai depot air isi ulang maupun kebutuhan dapur Anda.</p>
            </div>
            <div class="pricing-price">
              <span class="price-val">Rp 90.000</span>
              <span class="price-unit">/ Mobil Tangki</span>
            </div>
            <ul class="pricing-features">
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Standar higienis untuk dikonsumsi</span>
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Sangat cocok untuk suplai depot isi ulang</span>
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Bebas bau &amp; rasa, diuji berkala</span>
              </li>
            </ul>
            <button class="pricing-btn btn-green" @click="router.push(authStore.profile.value ? dashboardPath : '/login')">Pesan Air Minum</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Layanan -->
    <section class="section services">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Layanan Kami</span>
          <h2>Cara Kerja Pemesanan</h2>
        </div>
        <div class="steps-grid">
          <div class="step-card" v-for="(s, i) in [
            { num: '01', title: 'Daftar Akun', desc: 'Buat akun gratis di aplikasi BWJ Tracking Air hanya dalam hitungan detik.' },
            { num: '02', title: 'Buat Pesanan', desc: 'Pilih volume air yang dibutuhkan dan masukkan alamat pengiriman Anda.' },
            { num: '03', title: 'Konfirmasi Admin', desc: 'Admin akan memproses dan menyetujui pesanan Anda dengan cepat.' },
            { num: '04', title: 'Terima di Lokasi', desc: 'Supir mengantar air bersih ke lokasi. Lacak perjalanan secara real-time!' }
          ]" :key="i">
            <span class="step-num">{{ s.num }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Ulasan Pelanggan -->
    <section class="section reviews-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Ulasan Pelanggan</span>
          <h2>Apa Kata Mereka?</h2>
          <p>Pendapat pelanggan setia kami mengenai layanan pengisian dan pengiriman air bersih Berdikari Water Jaya.</p>
        </div>
        <div class="reviews-grid" v-if="reviews.length > 0">
          <div class="review-card" v-for="(rev, i) in reviews" :key="i">
            <div class="review-header">
              <div class="review-avatar">
                {{ rev.customer_name ? rev.customer_name.charAt(0).toUpperCase() : 'U' }}
              </div>
              <div class="review-meta">
                <span class="review-name">{{ rev.customer_name || 'Pelanggan Setia' }}</span>
                <div class="review-stars">
                  <svg v-for="star in 5" :key="star" width="14" height="14" viewBox="0 0 24 24" :fill="star <= rev.rating ? '#fbbf24' : 'none'" :stroke="star <= rev.rating ? '#fbbf24' : '#cbd5e1'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
              </div>
            </div>
            <p class="review-text">"{{ rev.review }}"</p>
          </div>
        </div>
        <div class="empty-reviews" v-else>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>Belum ada ulasan dari pelanggan saat ini.</p>
        </div>
      </div>
    </section>

    <!-- Info & FAQ -->
    <section class="section faq-section">
      <div class="container">
        <div class="faq-layout">
          <!-- Info Column -->
          <div class="info-col">
            <span class="section-tag">Kontak &amp; Lokasi</span>
            <h2>Depot Berdikari Water Jaya</h2>
            <p class="info-intro">Kami siap menyuplai kebutuhan air bersih dan air minum Anda langsung ke lokasi proyek, ruko, depot isi ulang, maupun rumah tinggal.</p>
            
            <div class="info-list">
              <div class="info-item">
                <div class="info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div class="info-text">
                  <h4>Alamat Depot</h4>
                  <p>Jl. Raya Tapos, kelurahan tapoos, Kec. Tapos, Kota Depok, Jawa Barat 16457</p>
                </div>
              </div>

              <div class="info-item">
                <div class="info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div class="info-text">
                  <h4>Jam Operasional</h4>
                  <p>24 Jam Non-stop (Senin - Minggu)</p>
                </div>
              </div>

              <div class="info-item">
                <div class="info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div class="info-text">
                  <h4>Cakupan Layanan</h4>
                  <p>Hanya melayani wilayah Jabodetabek saja (Jakarta, Bogor, Depok, Tangerang, Bekasi)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- FAQ Column -->
          <div class="faq-col">
            <span class="section-tag">FAQ</span>
            <h2>Pertanyaan Umum</h2>
            
            <div class="faq-accordion">
              <div 
                v-for="(item, index) in [
                  { q: 'Bagaimana cara melakukan pemesanan air?', a: 'Anda cukup mendaftar akun di aplikasi kami, pilih jenis air (Air PAM atau Air Minum), tentukan jumlah armada truk tangki, lalu tandai titik lokasi pengiriman di peta secara akurat.' },
                  { q: 'Bagaimana cara melacak pengiriman air saya?', a: 'Setelah pesanan Anda dikonfirmasi oleh admin dan supir ditugaskan, Anda dapat memantau status pesanan dan pergerakan lokasi supir secara real-time langsung melalui peta di aplikasi kami.' },
                  { q: 'Bagaimana perhitungan biaya pengiriman?', a: 'Biaya pengiriman dihitung secara otomatis berdasarkan jarak antara lokasi Depot BWJ di Tapos dengan titik lokasi pengiriman Anda yang ditandai di peta (dihitung per kilometer).' },
                  { q: 'Apakah BWJ melayani pemesanan di luar Jabodetabek?', a: 'Saat ini, wilayah operasional armada tangki air Berdikari Water Jaya hanya melayani wilayah Jabodetabek (Jakarta, Bogor, Depok, Tangerang, Bekasi).' }
                ]" 
                :key="index" 
                class="faq-item"
                :class="{ active: activeFaq === index }"
              >
                <button class="faq-trigger" @click="activeFaq = activeFaq === index ? null : index">
                  <span>{{ item.q }}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="faq-chevron"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="faq-content">
                  <p>{{ item.a }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section cta-section">
      <div class="container cta-box">
        <h2>Siap Memesan Air Bersih?</h2>
        <p>Daftar sekarang dan nikmati layanan pengiriman air bersih terbaik di Depok.</p>
        <button class="btn-cta-large" @click="router.push(authStore.profile.value ? dashboardPath : '/login')">
          {{ authStore.profile.value ? 'Ke Dashboard Anda' : 'Mulai Sekarang — Gratis' }}
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <img src="/logobwj.jpeg" alt="BWJ" class="footer-logo" />
          <div>
            <strong>Berdikari Water Jaya</strong>
            <p>Depot Tangki Air Bersih — Depok, Jawa Barat</p>
          </div>
        </div>
        <div class="footer-links">
          <a href="#tentang">Tentang</a>
          <span>•</span>
          <a href="https://wa.me/6281234567890" target="_blank">WhatsApp</a>
          <span>•</span>
          <a @click="router.push(authStore.profile.value ? dashboardPath : '/login')" style="cursor:pointer">
            {{ authStore.profile.value ? 'Dashboard' : 'Login' }}
          </a>
        </div>
        <p class="footer-copy">&copy; 2026 Berdikari Water Jaya. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
.landing { font-family: 'Inter', sans-serif; color: #0f172a; background: #fff; }

/* Nav */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.06); }
.nav-inner { max-width: 1200px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
.nav-brand { display: flex; align-items: center; gap: 10px; }
.nav-logo { width: 38px; height: 38px; border-radius: 10px; object-fit: cover; }
.nav-title { font-weight: 800; font-size: 17px; color: #0f172a; }
.nav-actions { display: flex; gap: 10px; align-items: center; }
.nav-user-greeting { font-size: 14px; color: #475569; margin-right: 8px; }
.nav-user-greeting strong { color: #0f172a; font-weight: 700; }
.btn-ghost { background: none; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 9px 20px; font-weight: 600; font-size: 14px; color: #334155; cursor: pointer; transition: all .2s; }
.btn-ghost:hover { border-color: #0f172a; color: #0f172a; }
.btn-cta { background: linear-gradient(135deg, #0f172a, #1e3a5f); border: none; border-radius: 10px; padding: 9px 20px; font-weight: 600; font-size: 14px; color: #fff; cursor: pointer; transition: all .2s; box-shadow: 0 2px 8px rgba(15,23,42,0.2); }
.btn-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(15,23,42,0.3); }

/* Hero */
.hero { position: relative; min-height: 92vh; display: flex; align-items: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; }
.hero-slide { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity 1.2s ease; }
.hero-slide.active { opacity: 1; }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.75) 100%); }
.hero-content { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 120px 24px 60px; color: #fff; }
.hero-badge { display: inline-block; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); border-radius: 50px; padding: 8px 18px; font-size: 14px; font-weight: 600; margin-bottom: 24px; backdrop-filter: blur(8px); }
.hero-content h1 { font-size: clamp(32px, 5vw, 56px); font-weight: 900; line-height: 1.15; margin: 0 0 20px; max-width: 680px; }
.hero-content > p { font-size: 18px; line-height: 1.7; opacity: 0.9; max-width: 540px; margin: 0 0 32px; }
.hero-btns { display: flex; gap: 14px; flex-wrap: wrap; }
.btn-hero { background: linear-gradient(135deg, #0ea5e9, #0284c7); border: none; border-radius: 12px; padding: 14px 32px; color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; transition: all .25s; box-shadow: 0 4px 20px rgba(14,165,233,0.35); }
.btn-hero:hover { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(14,165,233,0.45); }
.btn-hero-outline { border: 1.5px solid rgba(255,255,255,0.4); border-radius: 12px; padding: 14px 32px; color: #fff; font-weight: 600; font-size: 16px; cursor: pointer; text-decoration: none; transition: all .25s; background: rgba(255,255,255,0.06); }
.btn-hero-outline:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.7); }
.hero-rating { margin-top: 36px; display: inline-flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px 18px; backdrop-filter: blur(8px); }
.stars { display: flex; gap: 2px; }
.hero-rating span { font-size: 14px; opacity: 0.9; }

/* Sections */
.section { padding: 80px 0; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section-header { text-align: center; margin-bottom: 56px; }
.section-tag { display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 13px; padding: 6px 16px; border-radius: 50px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
.section-header h2 { font-size: 36px; font-weight: 800; margin: 0 0 12px; color: #0f172a; }
.section-header p { font-size: 16px; color: #64748b; max-width: 560px; margin: 0 auto; line-height: 1.6; }

/* Features */
.about { background: #f8fafc; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
.feature-card { background: #fff; border-radius: 16px; padding: 32px 28px; border: 1px solid #e2e8f0; transition: all .3s; }
.feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(15,23,42,0.08); }
.feature-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.feature-icon.blue { background: #dbeafe; color: #2563eb; }
.feature-icon.green { background: #dcfce7; color: #16a34a; }
.feature-icon.purple { background: #ede9fe; color: #7c3aed; }
.feature-icon.amber { background: #fef3c7; color: #d97706; }
.feature-card h3 { font-size: 18px; font-weight: 700; margin: 0 0 10px; }
.feature-card p { font-size: 14px; color: #64748b; line-height: 1.65; margin: 0; }

/* Pricing */
.pricing-section { background: #fff; }
.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; max-width: 900px; margin: 0 auto; }
.pricing-card { background: #fff; border-radius: 20px; padding: 40px 32px; border: 1.5px solid #e2e8f0; position: relative; display: flex; flex-direction: column; transition: all 0.3s ease; }
.pricing-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); border-color: #cbd5e1; }
.pricing-card.highlighted { border-color: #10b981; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.05); }
.pricing-card.highlighted:hover { border-color: #059669; box-shadow: 0 20px 40px rgba(16, 185, 129, 0.12); }
.pricing-badge { position: absolute; top: 20px; right: 24px; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 6px 12px; border-radius: 50px; letter-spacing: 0.5px; }
.pricing-badge.blue { background: #e0f2fe; color: #0369a1; }
.pricing-badge.green { background: #dcfce7; color: #15803d; }
.pricing-card-header { margin-bottom: 24px; }
.pricing-card-header h3 { font-size: 24px; font-weight: 800; margin: 0 0 12px; color: #0f172a; }
.pricing-desc { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0; }
.pricing-price { display: flex; align-items: baseline; gap: 6px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1.5px solid #f1f5f9; }
.price-val { font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
.price-unit { font-size: 14px; color: #64748b; font-weight: 600; }
.pricing-features { list-style: none; padding: 0; margin: 0 0 32px; display: flex; flex-direction: column; gap: 14px; flex-grow: 1; }
.pricing-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #475569; line-height: 1.4; text-align: left; }
.pricing-features li svg { color: #10b981; flex-shrink: 0; margin-top: 2px; }
.pricing-btn { width: 100%; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; text-align: center; }
.pricing-btn.btn-blue { background: #0f172a; color: #fff; }
.pricing-btn.btn-blue:hover { background: #1e293b; }
.pricing-btn.btn-green { background: #10b981; color: #fff; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); }
.pricing-btn.btn-green:hover { background: #059669; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }

/* Steps */
.services { background: #fff; }
.steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
.step-card { text-align: center; padding: 32px 24px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; transition: all .3s; }
.step-card:hover { background: #f0f9ff; border-color: #bae6fd; }
.step-num { display: inline-block; font-size: 32px; font-weight: 900; color: #0ea5e9; margin-bottom: 12px; }
.step-card h3 { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
.step-card p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0; }

/* CTA */
.cta-section { background: #f8fafc; }
.cta-box { text-align: center; background: linear-gradient(135deg, #0f172a, #1e3a5f); border-radius: 24px; padding: 64px 32px; color: #fff; }
.cta-box h2 { font-size: 32px; font-weight: 800; margin: 0 0 12px; }
.cta-box p { font-size: 16px; opacity: 0.85; margin: 0 0 28px; }
.btn-cta-large { background: linear-gradient(135deg, #0ea5e9, #0284c7); border: none; border-radius: 14px; padding: 16px 40px; color: #fff; font-weight: 700; font-size: 17px; cursor: pointer; transition: all .25s; box-shadow: 0 4px 20px rgba(14,165,233,0.3); }
.btn-cta-large:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(14,165,233,0.45); }

/* Footer */
.footer { background: #0f172a; color: #94a3b8; padding: 40px 0; }
.footer-inner { display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
.footer-brand { display: flex; align-items: center; gap: 12px; }
.footer-logo { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; }
.footer-brand strong { color: #e2e8f0; font-size: 16px; display: block; }
.footer-brand p { margin: 2px 0 0; font-size: 13px; }
.footer-links { display: flex; gap: 12px; font-size: 14px; }
.footer-links a { color: #94a3b8; text-decoration: none; transition: color .2s; }
.footer-links a:hover { color: #e2e8f0; }
.footer-copy { font-size: 13px; margin: 0; }

/* Reviews */
.reviews-section { background: #f8fafc; }
.reviews-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
.review-card { background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; transition: all .3s; display: flex; flex-direction: column; gap: 16px; }
.review-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(15,23,42,0.06); }
.review-header { display: flex; align-items: center; gap: 14px; }
.review-avatar { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #2563eb); color: #fff; font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: center; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.review-meta { display: flex; flex-direction: column; gap: 4px; }
.review-name { font-weight: 700; font-size: 15px; color: #0f172a; }
.review-stars { display: flex; gap: 2px; }
.review-text { font-size: 14.5px; color: #475569; line-height: 1.6; margin: 0; font-style: italic; }
.empty-reviews { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 48px 24px; border: 1.5px dashed #cbd5e1; border-radius: 16px; background: #fff; color: #64748b; text-align: center; }
.empty-reviews p { margin: 0; font-size: 15px; font-weight: 600; }

/* FAQ & Info Section */
.faq-section { background: #fff; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
.faq-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 64px; }
.info-col, .faq-col { display: flex; flex-direction: column; }
.info-col h2, .faq-col h2 { font-size: 32px; font-weight: 800; margin: 0 0 16px; color: #0f172a; }
.info-intro { font-size: 15px; color: #64748b; line-height: 1.6; margin: 0 0 32px; }
.info-list { display: flex; flex-direction: column; gap: 24px; }
.info-item { display: flex; gap: 16px; }
.info-icon { width: 44px; height: 44px; border-radius: 12px; background: #e0f2fe; color: #0ea5e9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.info-text h4 { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #0f172a; }
.info-text p { margin: 0; font-size: 14px; color: #475569; line-height: 1.5; }

.faq-accordion { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
.faq-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; transition: all 0.25s ease; }
.faq-item:hover { border-color: #cbd5e1; }
.faq-item.active { border-color: #bae6fd; background: #f0f9ff; }
.faq-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: none; border: none; font-size: 15px; font-weight: 700; color: #0f172a; cursor: pointer; text-align: left; transition: color 0.2s; }
.faq-trigger:hover { color: #0ea5e9; }
.faq-chevron { transition: transform 0.25s ease; color: #64748b; }
.faq-item.active .faq-chevron { transform: rotate(180deg); color: #0ea5e9; }
.faq-content { max-height: 0; overflow: hidden; transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s ease; padding: 0 24px; }
.faq-item.active .faq-content { max-height: 200px; padding-bottom: 20px; }
.faq-content p { margin: 0; font-size: 14px; color: #475569; line-height: 1.6; }

@media (max-width: 992px) {
  .faq-layout { grid-template-columns: 1fr; gap: 48px; }
}

@media (max-width: 768px) {
  .hero-content h1 { font-size: 28px; }
  .hero-content > p { font-size: 15px; }
  .section { padding: 56px 0; }
  .section-header h2 { font-size: 26px; }
  .nav-title { display: none; }
  .btn-ghost { padding: 8px 14px; font-size: 13px; }
  .btn-cta { padding: 8px 14px; font-size: 13px; }
  .cta-box { padding: 40px 20px; }
  .cta-box h2 { font-size: 24px; }
}
</style>
