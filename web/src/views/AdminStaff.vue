<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store'
import NavBar from '../components/NavBar.vue'
import { Plus, ChevronLeft, Trash2, User } from 'lucide-vue-next'
import Dialog from 'primevue/dialog'

const router = useRouter()

const isAddWaiterDialogOpen = ref(false)
const newWaiterName = ref('')
const isSaving = ref(false)

onMounted(async () => {
  if (store.role !== 'admin') router.push('/')
  if (!store.isStaffLoaded) await store.loadStaff()
})

const openAddDialog = () => {
  newWaiterName.value = ''
  isAddWaiterDialogOpen.value = true
}

const confirmAddWaiter = async () => {
  if (newWaiterName.value && newWaiterName.value.trim() !== '') {
    isSaving.value = true
    store.waiters.push({
      id: 'w_' + Date.now(),
      name: newWaiterName.value.trim()
    })
    await store.saveStaff()
    isSaving.value = false
    isAddWaiterDialogOpen.value = false
  }
}

const removeWaiter = async (id) => {
  store.waiters = store.waiters.filter(w => w.id !== id)
  await store.saveStaff()
}

</script>

<template>
  <div class="flex-1 flex flex-col w-full h-full min-h-screen bg-neutral-50">
    <NavBar roleName="Administrador" />
    <main class="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col animate-[fadeIn_0.2s_ease-out]">
      <header class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="router.push('/admin')" class="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm">
            <ChevronLeft :stroke-width="1.5" class="w-4 h-4" />
          </button>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">Gestión de Personal</h1>
            <p class="text-sm text-neutral-500 mt-1 font-medium">Administra los accesos de los meseros al sistema.</p>
          </div>
        </div>
        <button @click="openAddDialog" class="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors shadow-sm">
          <Plus :stroke-width="1.5" class="w-4 h-4" /> Añadir Mesero
        </button>
      </header>

      <div class="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <ul v-if="store.waiters.length > 0" class="divide-y divide-neutral-100">
          <li v-for="waiter in store.waiters" :key="waiter.id" class="flex items-center justify-between p-5 hover:bg-neutral-50 transition-colors group">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                <User :stroke-width="1.5" class="w-5 h-5" />
              </div>
              <span class="text-sm font-semibold tracking-tight text-neutral-900">{{ waiter.name }}</span>
            </div>
            <button @click="removeWaiter(waiter.id)" class="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Eliminar">
              <Trash2 :stroke-width="1.5" class="w-4 h-4" />
            </button>
          </li>
        </ul>
        <div v-else class="p-12 flex flex-col items-center justify-center text-neutral-400">
          <User :stroke-width="1.5" class="w-12 h-12 mb-4 opacity-50" />
          <p class="text-sm font-medium">No hay meseros registrados.</p>
        </div>
      </div>
    </main>

    <!-- Modal Añadir Mesero -->
    <Dialog v-model:visible="isAddWaiterDialogOpen" modal header="Añadir Mesero" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Nombre del Mesero</label>
          <input v-model="newWaiterName" @keyup.enter="confirmAddWaiter" type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Ej. Carlos" autofocus />
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="isAddWaiterDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
          <button @click="confirmAddWaiter" :disabled="!newWaiterName.trim() || isSaving" class="px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm flex items-center gap-2">
            <svg v-if="isSaving" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isSaving ? 'Guardando...' : 'Añadir' }}
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>