<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store'
import { UtensilsCrossed, Users, LayoutDashboard, User, Clock, AlertTriangle, Info } from 'lucide-vue-next'
import Dialog from 'primevue/dialog'

const router = useRouter()

const isWaiterSelectOpen = ref(false)
const isDebugPanelOpen = ref(false)
const isInfoDialogOpen = ref(false)

const setRole = (role) => {
  if (role === 'waiter') {
    isWaiterSelectOpen.value = true
    return
  }
  
  store.role = role
  store.activeTable = null
  store.activeWaiterId = null
  if (role === 'admin') router.push('/admin')
}

const loginAsWaiter = (waiterId) => {
  store.role = 'waiter'
  store.activeWaiterId = waiterId
  store.activeTable = null
  isWaiterSelectOpen.value = false
  router.push('/waiter')
}

onMounted(async () => {
  await store.loadTopology()
})

const advanceTime = async (minutes) => {
  if (!store.isLoaded) {
    await store.loadTopology()
  }
  
  const offsetMs = minutes * 60 * 1000
  
  store.rooms.forEach(room => {
    room.tables.forEach(table => {
      if (table.stateUpdatedAt) {
        table.stateUpdatedAt = table.stateUpdatedAt - offsetMs
      }
      if (table.lockedUntil) {
        table.lockedUntil = table.lockedUntil - offsetMs
      }
    })
  })
  
  await store.saveTopology()
  advancedMinutes.value = minutes
  isDebugPanelOpen.value = false
  isTimeAdvancedDialogOpen.value = true
}

const isTimeAdvancedDialogOpen = ref(false)
const advancedMinutes = ref(0)
</script>

<template>
  <main class="flex-1 flex flex-col items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out] min-h-screen">
    <div class="max-w-2xl w-full">
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white mb-6 shadow-sm">
          <UtensilsCrossed :stroke-width="1.5" class="w-6 h-6" />
        </div>
        <h1 class="text-3xl font-semibold tracking-tight text-neutral-900 mb-2">Sistema de Reservas</h1>
        <p class="text-neutral-500 text-sm font-medium">Selecciona tu rol operativo para continuar</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Tarjeta Camarero -->
        <button @click="setRole('waiter')" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col">
          <div class="h-10 w-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center mb-4 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
            <Users :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Camarero</h2>
          <p class="text-sm text-neutral-500 mt-1 leading-relaxed">Gestión de mesas en salón, confirmación y alertas de limpieza.</p>
        </button>

        <!-- Tarjeta Administrador -->
        <button @click="setRole('admin')" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col">
          <div class="h-10 w-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center mb-4 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
            <LayoutDashboard :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Administrador</h2>
          <p class="text-sm text-neutral-500 mt-1 leading-relaxed">Configuración interactiva de salas, topología y mesas.</p>
        </button>
      </div>
    </div>

    <!-- Botones de Herramientas e Información -->
    <div class="mt-8 flex gap-3">
      <button @click="isDebugPanelOpen = true" class="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-400 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200">
        <Clock :stroke-width="1.5" class="w-3 h-3" />
        Herramientas de Prueba
      </button>
      <button @click="isInfoDialogOpen = true" class="flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200">
        <AlertTriangle :stroke-width="1.5" class="w-3 h-3" />
        Limitaciones del Sistema
      </button>
    </div>

    <!-- Modal Seleccionar Mesero -->
    <Dialog v-model:visible="isWaiterSelectOpen" modal header="Identificación" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4 mt-2">
        <p class="text-sm font-medium text-neutral-500 mb-2">Selecciona tu perfil de mesero para iniciar el turno.</p>
        
        <div v-if="store.waiters.length > 0" class="grid grid-cols-1 gap-2">
          <button v-for="waiter in store.waiters" :key="waiter.id" @click="loginAsWaiter(waiter.id)" class="flex items-center gap-3 p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 rounded-xl transition-all text-left">
            <div class="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 shrink-0">
              <User :stroke-width="1.5" class="w-4 h-4" />
            </div>
            <span class="text-sm font-semibold tracking-tight text-neutral-900">{{ waiter.name }}</span>
          </button>
        </div>
        <div v-else class="text-center p-6 bg-neutral-50 border border-neutral-200 rounded-xl border-dashed">
          <p class="text-sm font-medium text-neutral-500">No hay meseros registrados.</p>
          <p class="text-xs text-neutral-400 mt-1">Solicita a un administrador que te añada al sistema.</p>
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <button @click="isWaiterSelectOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Volver</button>
        </div>
      </div>
    </Dialog>

    <!-- Debug Panel -->
    <Dialog v-model:visible="isDebugPanelOpen" modal header="Herramientas de Prueba" :style="{ width: '24rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-5 pb-0' }, title: { class: 'text-lg font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-5' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-5">
        <div class="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock :stroke-width="1.5" class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p class="text-sm font-semibold text-amber-900">Simulación de Tiempo</p>
            <p class="text-xs text-amber-700 mt-1">Avanza el tiempo del sistema para probar alertas de limpieza (>10 min) e inactividad (>120 min).</p>
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-2">
          <button @click="advanceTime(10)" class="px-3 py-3 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 flex flex-col items-center gap-1">
            <span class="text-lg font-bold">10</span>
            <span class="text-xs">min</span>
          </button>
          <button @click="advanceTime(30)" class="px-3 py-3 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 flex flex-col items-center gap-1">
            <span class="text-lg font-bold">30</span>
            <span class="text-xs">min</span>
          </button>
          <button @click="advanceTime(60)" class="px-3 py-3 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 flex flex-col items-center gap-1">
            <span class="text-lg font-bold">1</span>
            <span class="text-xs">hora</span>
          </button>
          <button @click="advanceTime(120)" class="px-3 py-3 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 flex flex-col items-center gap-1">
            <span class="text-lg font-bold">2</span>
            <span class="text-xs">horas</span>
          </button>
          <button @click="advanceTime(180)" class="px-3 py-3 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 flex flex-col items-center gap-1">
            <span class="text-lg font-bold">3</span>
            <span class="text-xs">horas</span>
          </button>
          <button @click="advanceTime(240)" class="px-3 py-3 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 flex flex-col items-center gap-1">
            <span class="text-lg font-bold">4</span>
            <span class="text-xs">horas</span>
          </button>
        </div>
      </div>
    </Dialog>

    <!-- Time Advanced Confirmation -->
    <Dialog v-model:visible="isTimeAdvancedDialogOpen" modal :closable="false" :style="{ width: '20rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'hidden' }, content: { class: 'p-0' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="p-6 flex flex-col items-center text-center">
        <div class="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Clock :stroke-width="1.5" class="w-7 h-7 text-emerald-600" />
        </div>
        <h3 class="text-lg font-semibold tracking-tight text-neutral-900 mb-2">Tiempo Simulado</h3>
        <p class="text-sm text-neutral-500 mb-4">El tiempo del sistema ha avanzado <strong class="text-neutral-900">{{ advancedMinutes }} minutos</strong>. Las alertas de limpieza e inactividad deberían aparecer ahora.</p>
        <button @click="isTimeAdvancedDialogOpen = false" class="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
          Entendido
        </button>
      </div>
    </Dialog>

    <!-- Info Dialog: Limitaciones del Sistema -->
    <Dialog v-model:visible="isInfoDialogOpen" modal header="Limitaciones del Sistema" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-5 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2' }, content: { class: 'p-5' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4">
        <div class="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle :stroke-width="1.5" class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p class="text-sm font-semibold text-amber-900"> PMN - Producto Minimo Navegable</p>
            <p class="text-xs text-amber-700 mt-1">Este sistema es un prototipo funcional con limitaciones técnicas.</p>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">1</span>
              Bloqueo de Mesas
            </p>
            <p class="text-xs text-neutral-500 pl-7">Al haber múltiples camareros sin una base de datos centralizada, el sistema no puede garantizar bloqueo instantáneo. Dos camareros podrían intentar tomar la misma mesa simultáneamente.</p>
          </div>

          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold">2</span>
              Sin Base de Datos
            </p>
            <p class="text-xs text-neutral-500 pl-7">Los datos se guardan en archivos JSON locales. Si recargas la página en diferentes dispositivos, los datos no se sincronizarán entre ellos.</p>
          </div>

          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">3</span>
              Hosting no implementado
            </p>
            <p class="text-xs text-neutral-500 pl-7"> Para implementar el hosting, aun falta por integrar una base de datos real para resolver estas limitaciones.</p>
          </div>
        </div>

        <div class="pt-3 border-t border-neutral-100">
          <button @click="isInfoDialogOpen = false" class="w-full px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm">
            Entendido
          </button>
        </div>
      </div>
    </Dialog>
  </main>
</template>
