<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store, stateConfig } from '../store'
import NavBar from '../components/NavBar.vue'
import { ChevronLeft, History, Users, Clock, Trash2, CheckCircle2, Search, FilterX, Hash } from 'lucide-vue-next'

const router = useRouter()

const selectedWaiterFilter = ref('all')
const selectedTableFilter = ref('all')

onMounted(async () => {
  if (store.role !== 'admin') {
    router.push('/')
    return
  }
  if (!store.isStaffLoaded) await store.loadStaff()
  if (!store.isHistoryLoaded) await store.loadHistory()
})

const availableTables = computed(() => {
  const tables = new Set()
  store.history.forEach(evt => {
    if (evt.tableNumber) tables.add(evt.tableNumber)
  })
  return Array.from(tables).sort((a, b) => {
    const numA = parseInt(a)
    const numB = parseInt(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return String(a).localeCompare(String(b))
  })
})

const filteredHistory = computed(() => {
  return store.history.filter(evt => {
    const matchWaiter = selectedWaiterFilter.value === 'all' || evt.waiterId === selectedWaiterFilter.value
    const matchTable = selectedTableFilter.value === 'all' || String(evt.tableNumber) === String(selectedTableFilter.value)
    return matchWaiter && matchTable
  })
})

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="flex-1 flex flex-col w-full h-full min-h-screen bg-neutral-50">
    <NavBar roleName="Administrador" />
    
    <main class="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col animate-[fadeIn_0.2s_ease-out]">
      <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex items-center gap-4">
          <button @click="router.push('/admin')" class="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm shrink-0">
            <ChevronLeft :stroke-width="1.5" class="w-4 h-4" />
          </button>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">Historial Global</h1>
            <p class="text-sm text-neutral-500 mt-1 font-medium">Auditoría de todos los cambios de estado de mesas operados en el local.</p>
          </div>
        </div>
      </header>

      <!-- Filtros -->
      <div class="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div class="flex items-center gap-2 shrink-0">
          <div class="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
            <Search :stroke-width="1.5" class="w-4 h-4" />
          </div>
          <span class="text-sm font-semibold text-neutral-700">Filtros:</span>
        </div>
        
        <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <!-- Filtro Mesa -->
          <div class="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-lg group hover:border-neutral-300 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all overflow-hidden">
            <div class="pl-3 text-neutral-400 shrink-0">
              <Hash :stroke-width="1.5" class="w-4 h-4" />
            </div>
            <select v-model="selectedTableFilter" class="w-full pl-2 pr-4 py-2 bg-transparent text-sm text-neutral-900 focus:outline-none cursor-pointer appearance-none min-w-[140px]">
              <option value="all">Todas las mesas</option>
              <option v-for="table in availableTables" :key="table" :value="table">
                Mesa {{ table }}
              </option>
            </select>
          </div>

          <!-- Filtro Camarero -->
          <div class="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-lg group hover:border-neutral-300 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all overflow-hidden">
            <div class="pl-3 text-neutral-400 shrink-0">
              <Users :stroke-width="1.5" class="w-4 h-4" />
            </div>
            <select v-model="selectedWaiterFilter" class="w-full pl-2 pr-4 py-2 bg-transparent text-sm text-neutral-900 focus:outline-none cursor-pointer appearance-none min-w-[180px]">
              <option value="all">Todos los camareros</option>
              <option v-for="waiter in store.waiters" :key="waiter.id" :value="waiter.id">
                {{ waiter.name }}
              </option>
              <option value="admin">Administrador (Modo Dios)</option>
            </select>
          </div>

          <button v-if="selectedWaiterFilter !== 'all' || selectedTableFilter !== 'all'" @click="selectedWaiterFilter = 'all'; selectedTableFilter = 'all'" class="p-2 text-neutral-400 hover:text-rose-600 bg-white border border-neutral-200 hover:bg-rose-50 rounded-lg transition-colors shadow-sm shrink-0" title="Limpiar filtros">
            <FilterX :stroke-width="1.5" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Lista de Eventos -->
      <div class="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm flex-1">
        <div v-if="filteredHistory.length === 0" class="p-16 flex flex-col items-center justify-center text-center">
          <History :stroke-width="1.5" class="w-12 h-12 text-neutral-300 mb-4" />
          <h3 class="text-lg font-semibold text-neutral-900 tracking-tight">Historial vacío</h3>
          <p class="text-sm text-neutral-500 mt-1 max-w-sm">No se han registrado eventos para los filtros seleccionados o el historial está limpio.</p>
        </div>
        
        <div v-else class="divide-y divide-neutral-100">
          <div v-for="evt in filteredHistory" :key="evt.id" class="p-5 flex items-center justify-between hover:bg-neutral-50 transition-colors group">
            <div class="flex flex-col md:flex-row md:items-center gap-4 w-full">
              <!-- Icono Estado -->
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border" :class="stateConfig[evt.action]?.color?.split(' ').map(c => c.replace('bg-', 'bg-').replace('border-', 'border-').replace('text-', 'text-')).join(' ') || 'bg-neutral-100 border-neutral-200 text-neutral-500'">
                <CheckCircle2 v-if="evt.action === 'disponible'" :stroke-width="1.5" class="w-5 h-5" />
                <Clock v-else-if="evt.action === 'asignacion'" :stroke-width="1.5" class="w-5 h-5" />
                <Users v-else-if="evt.action === 'ocupada'" :stroke-width="1.5" class="w-5 h-5" />
                <Trash2 v-else-if="evt.action === 'sucia'" :stroke-width="1.5" class="w-5 h-5" />
                <History v-else :stroke-width="1.5" class="w-5 h-5" />
              </div>
              
              <!-- Info Principal -->
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-semibold tracking-tight text-neutral-900">Mesa {{ evt.tableNumber }}</span>
                  <span class="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">{{ evt.roomName }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-neutral-600 font-medium">Marcada como {{ stateConfig[evt.action]?.label || evt.action }}</span>
                  <span class="text-xs text-neutral-400">por</span>
                  <span :class="['text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border', evt.waiterId === 'admin' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200']">
                    {{ evt.waiterName }}
                  </span>
                </div>
              </div>

              <!-- Tiempo -->
              <div class="text-left md:text-right mt-2 md:mt-0">
                <p class="text-sm font-bold text-neutral-900">{{ formatTime(evt.timestamp) }}</p>
                <p class="text-xs font-medium text-neutral-400">{{ formatDate(evt.timestamp) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </main>
  </div>
</template>