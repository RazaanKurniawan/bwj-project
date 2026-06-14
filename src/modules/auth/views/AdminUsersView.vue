<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue";
import { debounce } from "lodash-es";
import type { Profile, UserRole } from "../types";
import { fetchProfilesPaginated, upsertProfile, updateProfile, deleteProfile } from "../services/profileService";
import { signUpWithEmail } from "../services/authService";
import CustomSelect from "../../shared/components/CustomSelect.vue";

const profiles = ref<Profile[]>([]);
const loading = ref(true);
const errorMsg = ref("");
const successMsg = ref("");

// Create user modal
const showCreateModal = ref(false);
const createForm = reactive({ email: "", password: "", name: "", phone: "", role: "customer" as UserRole });
const creating = ref(false);

// Edit modal
const showEditModal = ref(false);
const editForm = reactive({ id: "", name: "", phone: "", role: "customer" as UserRole });
const saving = ref(false);

// Delete confirm
const showDeleteModal = ref(false);
const deleteTarget = ref<Profile | null>(null);
const deleting = ref(false);

const tableFilters = reactive({ name: "", email: "", phone: "", role: "all" });
const currentPage = ref(1);
const limit = ref(10);
const totalCount = ref(0);
const totalPages = ref(1);

const roleFilterOptions = [
  { label: "Semua Role", value: "all" },
  { label: "Customer", value: "customer" },
  { label: "Driver", value: "driver" },
  { label: "Admin", value: "admin" },
];

const roleSelectOptions = [
  { label: "Customer", value: "customer" },
  { label: "Driver", value: "driver" },
  { label: "Admin", value: "admin" },
];

const limitOptions = [
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
];

const loadProfiles = async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    const res = await fetchProfilesPaginated(currentPage.value, limit.value, {
      name: tableFilters.name || undefined,
      email: tableFilters.email || undefined,
      phone: tableFilters.phone || undefined,
      role: tableFilters.role !== "all" ? tableFilters.role : undefined,
    });
    profiles.value = res.data;
    totalCount.value = res.count;
    totalPages.value = Math.ceil(res.count / limit.value) || 1;
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal memuat data user.";
  } finally {
    loading.value = false;
  }
};

const debouncedFetch = debounce(() => {
  currentPage.value = 1;
  loadProfiles();
}, 500);

watch(tableFilters, () => debouncedFetch(), { deep: true });
watch(limit, () => { currentPage.value = 1; loadProfiles(); });

const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; loadProfiles(); } };
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; loadProfiles(); } };

const roleBadgeClass = (role: UserRole) => `role-${role}`;

const openCreate = () => {
  createForm.email = "";
  createForm.password = "";
  createForm.name = "";
  createForm.phone = "";
  createForm.role = "customer";
  errorMsg.value = "";
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!createForm.email || !createForm.password) {
    errorMsg.value = "Email dan password wajib diisi.";
    return;
  }
  creating.value = true;
  errorMsg.value = "";
  try {
    const { data, error } = await signUpWithEmail(createForm.email, createForm.password, {
      name: createForm.name || undefined,
      phone: createForm.phone || undefined,
      role: createForm.role,
    });
    if (error) throw error;
    showCreateModal.value = false;
    successMsg.value = "User berhasil dibuat.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadProfiles();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal membuat user.";
  } finally {
    creating.value = false;
  }
};

const openEdit = (p: Profile) => {
  editForm.id = p.id;
  editForm.name = p.name ?? "";
  editForm.phone = p.phone ?? "";
  editForm.role = p.role;
  errorMsg.value = "";
  showEditModal.value = true;
};

const handleEdit = async () => {
  saving.value = true;
  errorMsg.value = "";
  try {
    await updateProfile(editForm.id, {
      name: editForm.name || null,
      phone: editForm.phone || null,
      role: editForm.role,
    });
    showEditModal.value = false;
    successMsg.value = "Profil berhasil diperbarui.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadProfiles();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal update profil.";
  } finally {
    saving.value = false;
  }
};

const openDelete = (p: Profile) => {
  deleteTarget.value = p;
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  errorMsg.value = "";
  try {
    await deleteProfile(deleteTarget.value.id);
    successMsg.value = "User berhasil dihapus.";
    setTimeout(() => (successMsg.value = ""), 3000);
    await loadProfiles();
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Gagal menghapus user.";
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
    deleteTarget.value = null;
  }
};

onMounted(loadProfiles);
</script>

<template>
  <div class="users-page">
    <header class="page-header">
      <div>
        <h2>Manajemen User</h2>
        <p>Buat, edit, dan hapus user.</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Tambah User</button>
    </header>

    <p v-if="successMsg" class="success">{{ successMsg }}</p>
    <p v-if="errorMsg && !showCreateModal && !showEditModal" class="error">{{ errorMsg }}</p>
    <p v-if="loading" class="info">Memuat data user...</p>

    <section v-else class="card">
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>No HP</th>
              <th>Role</th>
              <th>Aksi</th>
            </tr>
            <tr class="filter-row">
              <th><input type="text" v-model="tableFilters.name" placeholder="Cari Nama..." /></th>
              <th><input type="text" v-model="tableFilters.email" placeholder="Cari Email..." /></th>
              <th><input type="text" v-model="tableFilters.phone" placeholder="Cari HP..." /></th>
              <th>
                <CustomSelect v-model="tableFilters.role" :options="roleFilterOptions" class="filter-select" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="profiles.length === 0">
              <td colspan="5" class="empty-table-cell">Belum ada user.</td>
            </tr>
            <template v-else>
              <tr v-for="p in profiles" :key="p.id">
                <td class="cell-bold">{{ p.name ?? "-" }}</td>
                <td>{{ p.email ?? "-" }}</td>
                <td>{{ p.phone ?? "-" }}</td>
                <td><span class="role-badge" :class="roleBadgeClass(p.role)">{{ p.role }}</span></td>
                <td class="cell-actions">
                  <button class="btn-sm btn-outline" @click="openEdit(p)">Edit</button>
                  <button class="btn-sm btn-danger" @click="openDelete(p)">Hapus</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View -->
      <div class="mobile-only">
        <!-- Mobile Filters -->
        <div class="mobile-filters">
          <input type="text" v-model="tableFilters.name" placeholder="🔍 Cari nama..." class="mobile-filter-input" />
          <div class="mobile-filter-row">
            <input type="text" v-model="tableFilters.email" placeholder="Email..." class="mobile-filter-select" />
            <CustomSelect v-model="tableFilters.role" :options="roleFilterOptions" class="mobile-filter-select" />
          </div>
        </div>

        <div v-if="profiles.length === 0" class="mobile-empty">Belum ada user.</div>

        <div v-else class="mobile-cards">
          <div v-for="p in profiles" :key="p.id" class="mobile-user-card">
            <div class="muc-header">
              <div class="muc-info">
                <span class="muc-name">{{ p.name ?? '(Tanpa Nama)' }}</span>
                <span class="muc-email">{{ p.email ?? '-' }}</span>
              </div>
              <span class="role-badge" :class="roleBadgeClass(p.role)">{{ p.role }}</span>
            </div>
            <div class="muc-body" v-if="p.phone">
              <span class="muc-label">📱 No HP</span>
              <span class="muc-value">{{ p.phone }}</span>
            </div>
            <div class="muc-actions">
              <button class="btn-sm btn-outline" style="flex:1; justify-content:center" @click="openEdit(p)">✏️ Edit</button>
              <button class="btn-sm btn-danger" style="flex:1; justify-content:center" @click="openDelete(p)">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div class="pagination-footer" v-if="profiles.length > 0">
        <div class="row-count">Menampilkan {{ profiles.length }} dari {{ totalCount }} baris data.</div>
        <div class="pagination-controls">
          <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
          <button class="btn-page" :disabled="currentPage === 1" @click="prevPage">&laquo;</button>
          <button class="btn-page" :disabled="currentPage === totalPages" @click="nextPage">&raquo;</button>
          <CustomSelect v-model="limit" :options="limitOptions" class="page-select" :small="true" />
        </div>
      </div>
    </section>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-content">
        <h3>Tambah User Baru</h3>
        <form class="modal-form" @submit.prevent="handleCreate">
          <label class="field"><span>Email</span><input v-model="createForm.email" type="email" required /></label>
          <label class="field"><span>Password</span><input v-model="createForm.password" type="password" required /></label>
          <label class="field"><span>Nama</span><input v-model="createForm.name" type="text" /></label>
          <label class="field"><span>No HP</span><input v-model="createForm.phone" type="tel" /></label>
          <label class="field">
            <span>Role</span>
            <CustomSelect v-model="createForm.role" :options="roleSelectOptions" />
          </label>
          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-outline" @click="showCreateModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="creating">{{ creating ? "Menyimpan..." : "Simpan" }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-backdrop" @click.self="showEditModal = false">
      <div class="modal-content">
        <h3>Edit Profil</h3>
        <form class="modal-form" @submit.prevent="handleEdit">
          <label class="field"><span>Nama</span><input v-model="editForm.name" type="text" /></label>
          <label class="field"><span>No HP</span><input v-model="editForm.phone" type="tel" /></label>
          <label class="field">
            <span>Role</span>
            <CustomSelect v-model="editForm.role" :options="roleSelectOptions" />
          </label>
          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-outline" @click="showEditModal = false">Batal</button>
            <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? "Menyimpan..." : "Simpan" }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal = false">
      <div class="modal-content">
        <div class="modal-icon-row">
          <div class="danger-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </div>
          <h3>Hapus User</h3>
        </div>
        <p class="modal-body-text">Yakin ingin menghapus user <strong>{{ deleteTarget?.name ?? deleteTarget?.id }}</strong>? Tindakan ini tidak bisa dibatalkan.</p>
        <div class="modal-actions">
          <button class="btn-outline" @click="showDeleteModal = false">Batal</button>
          <button class="btn-danger" :disabled="deleting" @click="handleDelete">{{ deleting ? "Menghapus..." : "Hapus" }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.users-page { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.page-header h2 { margin: 0; font-size: 22px; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 12px 28px rgba(15,23,42,.08); }
.table-responsive { width: 100%; overflow-x: auto; border-radius: 8px; background: #fff; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
.data-table th { background: #ffffff; color: #1e293b; font-weight: 700; padding: 16px 16px; border-bottom: 2px solid #f1f5f9; font-size: 13px; white-space: nowrap; }
.data-table td { padding: 16px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; background: #ffffff; white-space: nowrap; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #f8fafc; }
.filter-row th { padding: 8px 16px; border-bottom: 2px solid #f1f5f9; }
.filter-row input, .filter-select { width: 100%; min-width: 140px; padding: 8px 12px; font-size: 12px; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; transition: border-color .2s; }
.filter-row input:focus, .filter-select:focus { border-color: #4f46e5; }

/* Pagination styling */
.pagination-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; margin-top: 8px; flex-wrap: wrap; gap: 12px; }
.pagination-controls { display: flex; align-items: center; gap: 12px; }
.btn-page { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; cursor: pointer; color: #0f172a; font-weight: 600; transition: all .2s; }
.btn-page:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
.page-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; outline: none; cursor: pointer; }

.cell-bold { font-weight: 600; color: #4f46e5; }
.cell-actions { display: flex; gap: 6px; }
.role-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.role-customer { background: #dbeafe; color: #1d4ed8; }
.role-driver { background: #bbf7d0; color: #166534; }
.role-admin { background: #fde68a; color: #854d0e; }
.btn-primary { border: none; border-radius: 8px; padding: 8px 16px; font-weight: 600; background: #0f172a; color: #fff; cursor: pointer; font-size: 13px; transition: background .2s; }
.btn-primary:hover { background: #1e293b; }
.btn-primary:disabled { opacity: .7; cursor: wait; }
.btn-outline { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-weight: 600; color: #0f172a; cursor: pointer; font-size: 13px; transition: all .2s; }
.btn-outline:hover { background: #f8fafc; }
.btn-danger { border: none; border-radius: 8px; padding: 8px 12px; font-weight: 600; background: #dc2626; color: #fff; cursor: pointer; font-size: 13px; transition: background .2s; }
.btn-danger:hover { background: #b91c1c; }
.btn-danger:disabled { opacity: .7; cursor: wait; }
.btn-sm { padding: 6px 10px; font-size: 12px; }
.empty { color: #64748b; padding: 20px 0; }
.error { color: #dc2626; margin: 4px 0; }
.success { color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; }
.info { color: #64748b; }
/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn .2s ease-out; }
.modal-content { background: #fff; border-radius: 16px; width: min(480px, 90%); padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1); animation: slideUp .25s cubic-bezier(.16,1,.3,1); }
.modal-content h3 { margin: 0 0 16px; font-size: 18px; font-weight: 700; }
.modal-form { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.field input, .field select { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; transition: border-color .2s; }
.field input:focus, .field select:focus { border-color: #0f172a; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.modal-icon-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.danger-icon-wrapper { background: #fee2e2; color: #dc2626; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-body-text { color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(12px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

.empty-table-cell {
  text-align: center;
  padding: 48px 16px !important;
  color: #64748b;
  font-style: italic;
  background: #ffffff !important;
}

/* ─── Mobile responsive ─── */
@media (max-width: 768px) {
  .users-page { gap: 14px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header h2 { font-size: 20px; }
  .btn-primary { width: 100%; text-align: center; justify-content: center; padding: 12px 16px; font-size: 14px; border-radius: 12px; }
  .card { padding: 12px; border-radius: 14px; }
  .desktop-only { display: none !important; }
  .mobile-only { display: block !important; }
  .pagination-footer { flex-direction: column; align-items: center; gap: 10px; text-align: center; }
  .pagination-controls { flex-wrap: wrap; justify-content: center; }
  .modal-content { width: min(360px, 92%); padding: 20px; border-radius: 20px; }
  .modal-actions { flex-direction: column-reverse; }
  .modal-actions button { width: 100%; padding: 12px; font-size: 14px; border-radius: 12px; text-align: center; justify-content: center; }
}

/* ─── Desktop/Mobile helpers ─── */
.desktop-only { display: block; }
.mobile-only { display: none; }

/* ─── Mobile Filters ─── */
.mobile-filters { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.mobile-filter-input { width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 14px; box-sizing: border-box; outline: none; background: #f8fafc; }
.mobile-filter-input:focus { border-color: #4f46e5; background: #fff; }
.mobile-filter-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
.mobile-filter-select { padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; width: 100%; box-sizing: border-box; }

/* ─── Mobile Empty ─── */
.mobile-empty { text-align: center; padding: 48px 16px; color: #64748b; font-style: italic; }

/* ─── Mobile Cards ─── */
.mobile-cards { display: flex; flex-direction: column; gap: 12px; }

.mobile-user-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15,23,42,0.06);
}

.muc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
  gap: 12px;
}

.muc-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.muc-name { font-size: 15px; font-weight: 700; color: #0f172a; }
.muc-email { font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.muc-body { padding: 12px 16px; display: flex; gap: 6px; align-items: center; border-bottom: 1px dashed #e2e8f0; }
.muc-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
.muc-value { font-size: 14px; color: #334155; font-weight: 500; }

.muc-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
}
</style>
