<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { updateProfile } from '../services/profileService';
import { updateUserCredentials } from '../services/authService';

const authStore = useAuthStore();
const isLoading = ref(false);
const message = ref({ text: '', type: '' });

const formData = ref({
  name: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: ''
});

onMounted(() => {
  if (authStore.profile.value) {
    formData.value.name = authStore.profile.value.name ?? '';
    formData.value.phone = authStore.profile.value.phone ?? '';
  }
  if (authStore.user.value) {
    formData.value.email = authStore.user.value.email ?? '';
  }
});

const handleSave = async () => {
  message.value = { text: '', type: '' };
  
  if (formData.value.password && formData.value.password !== formData.value.confirmPassword) {
    message.value = { text: 'Password dan konfirmasi password tidak cocok', type: 'error' };
    return;
  }

  isLoading.value = true;
  
  try {
    const user = authStore.user.value;
    const profile = authStore.profile.value;
    
    if (!user || !profile) {
      throw new Error("User tidak ditemukan.");
    }
    
    // Update public profile data
    if (formData.value.name !== profile.name || formData.value.phone !== profile.phone) {
      const updatedProfile = await updateProfile(profile.id, {
        name: formData.value.name,
        phone: formData.value.phone
      });
      authStore.profile.value = updatedProfile;
    }

    // Update auth credentials if changed
    const credentialsPatch: { email?: string; password?: string } = {};
    if (formData.value.email !== user.email) {
      credentialsPatch.email = formData.value.email;
    }
    if (formData.value.password) {
      credentialsPatch.password = formData.value.password;
    }

    if (Object.keys(credentialsPatch).length > 0) {
      const { error } = await updateUserCredentials(credentialsPatch);
      if (error) throw error;
      
      // Clear password fields
      formData.value.password = '';
      formData.value.confirmPassword = '';
      
      if (credentialsPatch.email) {
        message.value = { text: 'Profil diperbarui. Periksa email Anda untuk verifikasi jika email diganti.', type: 'success' };
      } else {
        message.value = { text: 'Profil dan password berhasil diperbarui.', type: 'success' };
      }
    } else {
      message.value = { text: 'Profil berhasil diperbarui.', type: 'success' };
    }
    
  } catch (err: any) {
    message.value = { text: err.message || 'Gagal memperbarui profil', type: 'error' };
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="profile-container">
    <div class="profile-header">
      <h2 class="page-title">Edit Profile</h2>
      <p class="page-subtitle">Perbarui informasi akun Anda.</p>
    </div>

    <div class="profile-content">
      <div v-if="message.text" class="alert" :class="message.type">
        {{ message.text }}
      </div>

      <form @submit.prevent="handleSave" class="profile-form">
        <div class="form-group">
          <label for="name">Nama Lengkap</label>
          <input type="text" id="name" v-model="formData.name" required placeholder="Masukkan nama Anda" />
        </div>

        <div class="form-group">
          <label for="phone">Nomor Telepon</label>
          <input type="tel" id="phone" v-model="formData.phone" placeholder="Contoh: 08123456789" />
        </div>

        <div class="form-divider">Kredensial Akun</div>

        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="formData.email" required placeholder="email@contoh.com" />
        </div>

        <div class="form-group">
          <label for="password">Password Baru (Opsional)</label>
          <input type="password" id="password" v-model="formData.password" placeholder="Kosongkan jika tidak ingin mengubah password" />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Konfirmasi Password Baru</label>
          <input type="password" id="confirmPassword" v-model="formData.confirmPassword" placeholder="Ulangi password baru" />
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="isLoading">
            <span v-if="isLoading">Menyimpan...</span>
            <span v-else>Simpan Perubahan</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px 0;
}

.profile-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}

.page-subtitle {
  color: #64748b;
  margin: 0;
  font-size: 15px;
}

.profile-content {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  font-weight: 500;
}

.alert.error {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.alert.success {
  background: #f0fdf4;
  color: #22c55e;
  border: 1px solid #bbf7d0;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.form-group input {
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  color: #0f172a;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.form-divider {
  margin: 12px 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.form-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #0ea5e9;
  color: #fff;
  box-shadow: 0 2px 4px rgba(14, 165, 233, 0.2);
}

.btn-primary:hover {
  background: #0284c7;
  box-shadow: 0 4px 6px rgba(14, 165, 233, 0.3);
}

.btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

@media (max-width: 640px) {
  .profile-content {
    padding: 24px 20px;
  }
}
</style>
