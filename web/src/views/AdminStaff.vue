<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store'
import NavBar from '../components/NavBar.vue'
import { Plus, ChevronLeft, Trash2, Pencil, User } from 'lucide-vue-next'
import Dialog from 'primevue/dialog'

import { PerfilesService } from '../service/perfiles'
import { AuthService } from '../service/auth'

const router = useRouter()

const isAddWaiterDialogOpen = ref(false)
const isEditWaiterDialogOpen = ref(false)
const editingWaiter = ref(null)
const isSaving = ref(false)
const isLoadingData = ref(true)

const waitersList = ref([])

const form = reactive({
  nombre: '',
  apellidos: '',
  email: '',
  password: ''
})

const editForm = reactive({
  nombre: '',
  apellidos: '',
  email: '',
  password: ''
})

const fetchWaiters = async () => {
  try {
    isLoadingData.value = true
    waitersList.value = await PerfilesService.getWaiters()
  } catch (error) {
    console.error('Error al obtener la lista de camareros:', error)
  } finally {
    isLoadingData.value = false
  }
}

onMounted(async () => {
  if (store.role !== 'admin') router.push('/')
  await fetchWaiters()
})

const openAddDialog = () => {
  form.nombre = ''
  form.apellidos = ''
  form.email = ''
  form.password = ''
  isAddWaiterDialogOpen.value = true
}

const openEditDialog = (waiter) => {
  editingWaiter.value = waiter
  editForm.nombre = waiter.nombre || ''
  editForm.apellidos = waiter.apellidos || ''
  editForm.email = waiter.email || ''
  editForm.password = ''
  isEditWaiterDialogOpen.value = true
}

const isFormValid = computed(() => {
  return form.nombre.trim() && form.apellidos.trim() && form.email.trim() && form.password.trim()
})

const isEditFormValid = computed(() => {
  return editForm.nombre.trim() && editForm.apellidos.trim() && editForm.email.trim()
})

const confirmEditWaiter = async () => {
  if (!isEditFormValid.value || !editingWaiter.value) return

  try {
    isSaving.value = true

    const updates = {
      nombre: editForm.nombre.trim(),
      apellidos: editForm.apellidos.trim(),
      email: editForm.email.trim()
    }

    await PerfilesService.update(editingWaiter.value.id, updates)

    if (editForm.password.trim()) {
      await AuthService.updateStaffPassword(editingWaiter.value.id, editForm.password.trim())
    }

    await fetchWaiters()
    isEditWaiterDialogOpen.value = false
    editingWaiter.value = null
  } catch (error) {
    console.error('Error al actualizar el camarero:', error)
    alert(error.message || 'Ocurrió un error al actualizar el camarero.')
  } finally {
    isSaving.value = false
  }
}

const confirmAddWaiter = async () => {
  if (!isFormValid.value) return

  try {
    isSaving.value = true

    const rolCamareroId = await PerfilesService.getRolCamareroId()

    await AuthService.createStaffMember({
      email: form.email.trim(),
      password: form.password.trim(),
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      rol_id: rolCamareroId
    })

    await fetchWaiters()
    isAddWaiterDialogOpen.value = false

  } catch (error) {
    console.error('Error durante la creación del camarero:', error)
    alert(error.message || 'Ocurrió un error al crear el camarero.')
  } finally {
    isSaving.value = false
  }
}

const removeWaiter = async (id) => {
  if(confirm("¿Estás seguro de que deseas eliminar este perfil?")) {
    try {
      await PerfilesService.delete(id)
      await fetchWaiters()
    } catch(error) {
      console.error('Error eliminando perfil:', error)
      alert('Error al intentar borrar el perfil.')
    }
  }
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
        <div v-if="isLoadingData" class="p-12 flex flex-col items-center justify-center text-neutral-400">
           <svg class="animate-spin h-8 w-8 text-neutral-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           <p class="text-sm font-medium">Cargando personal...</p>
        </div>

        <ul v-else-if="waitersList.length > 0" class="divide-y divide-neutral-100">
          <li v-for="waiter in waitersList" :key="waiter.id" class="flex items-center justify-between p-5 hover:bg-neutral-50 transition-colors group">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                <User :stroke-width="1.5" class="w-5 h-5" />
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-semibold tracking-tight text-neutral-900">{{ waiter.nombre }} {{ waiter.apellidos }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button @click="openEditDialog(waiter)" class="p-2 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Editar">
                <Pencil :stroke-width="1.5" class="w-4 h-4" />
              </button>
              <button @click="removeWaiter(waiter.id)" class="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Eliminar">
                <Trash2 :stroke-width="1.5" class="w-4 h-4" />
              </button>
            </div>
          </li>
        </ul>
        
        <div v-else class="p-12 flex flex-col items-center justify-center text-neutral-400">
          <User :stroke-width="1.5" class="w-12 h-12 mb-4 opacity-50" />
          <p class="text-sm font-medium">No hay meseros registrados.</p>
        </div>
      </div>
    </main>

    <Dialog v-model:visible="isAddWaiterDialogOpen" modal header="Añadir Mesero" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4 mt-2">
        
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-neutral-700">Nombre</label>
            <input v-model="form.nombre" type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Ej. Carlos" autofocus />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-neutral-700">Apellidos</label>
            <input v-model="form.apellidos" type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Ej. Pérez" />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Correo Electrónico</label>
          <input v-model="form.email" type="email" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="carlos@ejemplo.com" />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Contraseña</label>
          <input v-model="form.password" @keyup.enter="confirmAddWaiter" type="password" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Mínimo 6 caracteres" />
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <button @click="isAddWaiterDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
          
          <button @click="confirmAddWaiter" :disabled="!isFormValid || isSaving" class="px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm flex items-center gap-2">
            <svg v-if="isSaving" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isSaving ? 'Guardando...' : 'Añadir' }}
          </button>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="isEditWaiterDialogOpen" modal header="Editar Mesero" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4 mt-2">
        
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-neutral-700">Nombre</label>
            <input v-model="editForm.nombre" type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Ej. Carlos" autofocus />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-neutral-700">Apellidos</label>
            <input v-model="editForm.apellidos" type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Ej. Pérez" />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Correo Electrónico</label>
          <input v-model="editForm.email" type="email" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="carlos@ejemplo.com" />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Nueva Contraseña <span class="text-neutral-400 font-normal">(opcional)</span></label>
          <input v-model="editForm.password" @keyup.enter="confirmEditWaiter" type="password" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Dejar en blanco para mantener actual" />
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <button @click="isEditWaiterDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
          
          <button @click="confirmEditWaiter" :disabled="!isEditFormValid || isSaving" class="px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm flex items-center gap-2">
            <svg v-if="isSaving" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
