<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { store, stateConfig } from '../store'
import NavBar from '../components/NavBar.vue'
import { MapPin, Users, ZoomIn, ZoomOut, Maximize, Clock, CheckCircle2, XCircle, Trash2, Check, Lock, ChevronLeft, ShieldAlert, AlertTriangle } from 'lucide-vue-next'
import Dialog from 'primevue/dialog'
import { SesionesRegistroService } from '../service/sesiones_registro'
import { LimpiezasService } from '../service/limpiezas'
import { PedidosService } from '../service/pedidos'

const router = useRouter()
const canvasContainer = ref(null)
const zoomLevel = ref(1)

// Modal de administración
const isActionDialogOpen = ref(false)
const activeTableItem = ref(null)

// Tiempos y Alertas
const timeRemaining = ref({})
const elapsedTimes = ref({})
const limboTimers = ref({})
let timerInterval = null
let pollInterval = null

onMounted(async () => {
  if (store.role !== 'admin') {
    router.push('/')
    return
  }
  await store.loadTopology(true)
  if (!store.isStaffLoaded) await store.loadStaff()
  
  // Poll para mantener sincronización (cada 2 segundos)
  pollInterval = setInterval(async () => {
    await store.loadTopology(true)
  }, 2000)
  
  // Loop de comprobación de tiempos (solo lectura para visualización)
  timerInterval = setInterval(() => {
    const now = Date.now()
    
    store.rooms.forEach(room => {
      room.tables.forEach(table => {
        // Lógica visual de Asignación (60s)
        if (table.state === 'asignacion' && table.lockedUntil) {
          const secondsLeft = Math.ceil((table.lockedUntil - now) / 1000)
          timeRemaining.value[table.id] = Math.max(0, secondsLeft)
        } else if (table.state === 'limbo' && table.lockedUntil) {
          const secondsLeft = Math.ceil((table.lockedUntil - now) / 1000)
          timeRemaining.value[table.id] = Math.max(0, secondsLeft)
        } else {
          delete timeRemaining.value[table.id]
        }

        // Lógica visual de Tiempos y Alertas
        if ((table.state === 'ocupada' || table.state === 'sucia') && table.stateUpdatedAt) {
          const elapsedMinutes = Math.floor((now - table.stateUpdatedAt) / 60000)
          let isWarning = false
          
          if (table.state === 'ocupada' && elapsedMinutes >= 120) isWarning = true
          if (table.state === 'sucia' && elapsedMinutes >= 10) isWarning = true
          
          elapsedTimes.value[table.id] = { minutes: elapsedMinutes, isWarning }
        } else {
          delete elapsedTimes.value[table.id]
        }
      })
    })
  }, 1000)

  setTimeout(centerView, 50)
  setTimeout(centerView, 150)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (pollInterval) clearInterval(pollInterval)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', stopPan)
})

const getWaiterNameById = (id) => {
  const w = store.waiters.find(w => w.id === id)
  return w ? w.name : 'Camarero eliminado'
}

const activeRoom = computed(() => {
  return store.rooms.find(r => r.id === store.activeRoomId) || store.rooms[0]
})

const selectRoom = (roomId) => {
  store.activeRoomId = roomId
  centerView()
}

const centerView = () => {
  if (canvasContainer.value) {
    const targetX = 1500 - (canvasContainer.value.clientWidth / 2)
    const targetY = 1500 - (canvasContainer.value.clientHeight / 2)
    canvasContainer.value.scrollLeft = targetX
    canvasContainer.value.scrollTop = targetY
  }
}

const zoomIn = () => { zoomLevel.value = Math.min(zoomLevel.value + 0.1, 2) }
const zoomOut = () => { zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.5) }
const resetZoom = () => { zoomLevel.value = 1; centerView() }

// Click en mesa (Abre super-modal de Admin)
const handleTableClick = (table) => {
  activeTableItem.value = table
  isActionDialogOpen.value = true
}

// Funciones Dios (Admin)
const forceChangeState = async (newState) => {
  if (!activeTableItem.value) return
  
  const table = activeTableItem.value
  const previousAssignee = table.assignedTo || table.lockedBy
  const previousState = table.state

  // Validación: si admin fuerza ocupada → disponible, verificar pedidos primero
  if (newState === 'disponible' && previousState === 'ocupada') {
    try {
      const sesionActiva = await SesionesRegistroService.getActivaByMesaId(table.id)
      if (sesionActiva) {
        const pedidos = await PedidosService.getBySesionId(sesionActiva.id)
        if (pedidos && pedidos.length > 0) {
          alert('No se puede forzar la liberación: la mesa tiene pedidos registrados. Debe pasar por limpieza.')
          return
        }
      }
    } catch (e) {
      console.error('Error al verificar pedidos desde Admin:', e)
      return
    }
  }
  
  table.state = newState
  table.stateUpdatedAt = Date.now()
  
  if (newState === 'asignacion') {
    table.lockedAt = Date.now()
  }
  
  // Limpiar locks o asigaciones si el admin fuerza a disponible
  if (newState === 'disponible') {
    table.lockedAt = null
    table.lockedUntil = null
    table.lockedBy = null
    table.assignedTo = null
    table.guests = null
    table.mergeGroup = null
  }
  
  // ================================================================
  // PERSISTENCIA EN BD: sesiones_registro y limpiezas
  // ================================================================
  try {
    if (newState === 'ocupada') {
      await SesionesRegistroService.create({
        mesa_id: table.id,
        camarero_id: store.activeWaiterId || previousAssignee,
        estado: 'Activa',
        comensales_reales: table.guests || 0
      })
    }

    if (newState === 'sucia') {
      const sesionActiva = await SesionesRegistroService.getActivaByMesaId(table.id)
      if (sesionActiva) {
        await SesionesRegistroService.update(sesionActiva.id, {
          estado: 'Finalizada',
          fin_ocupacion: new Date().toISOString()
        })
      }
      await LimpiezasService.create({
        mesa_id: table.id,
        estado: 'Pendiente'
      })
    }

    if (newState === 'disponible' && previousState === 'sucia') {
      const limpiezaPendiente = await LimpiezasService.getPendienteByMesaId(table.id)
      if (limpiezaPendiente) {
        await LimpiezasService.update(limpiezaPendiente.id, {
          estado: 'Finalizada',
          completado_en: new Date().toISOString()
        })
      }
    }

    if (newState === 'disponible' && previousState === 'ocupada') {
      const sesionActiva = await SesionesRegistroService.getActivaByMesaId(table.id)
      if (sesionActiva) {
        await SesionesRegistroService.update(sesionActiva.id, {
          estado: 'Cancelada',
          fin_ocupacion: new Date().toISOString()
        })
      }
    }
  } catch (e) {
    console.error('Error al persistir sesion/limpieza desde Admin:', e)
  }
  
  await store.saveTopology()
  
  await store.logEvent(
    'admin',
    'Administrador',
    table.number,
    activeRoom.value.name,
    newState,
    previousAssignee
  )
}

const unassignWaiter = async () => {
  if (!activeTableItem.value) return
  
  const table = activeTableItem.value
  table.assignedTo = null
  table.lockedBy = null
  table.lockedUntil = null
  table.lockedAt = null

  // Si estaba en asignación o limbo, se devuelve a disponible porque perdió el camarero que le daba curso
  if (table.state === 'asignacion' || table.state === 'limbo') {
    table.state = 'disponible'
    table.stateUpdatedAt = Date.now()
  }
  
  await store.saveTopology()
}

// Variables para Panning (Scroll con arrastre)
let isPanning = false
let panStartX, panStartY, scrollLeftStart, scrollTopStart

const startPan = (e) => {
  if (e.button !== 0) return
  isPanning = true
  panStartX = e.clientX
  panStartY = e.clientY
  if (canvasContainer.value) {
    scrollLeftStart = canvasContainer.value.scrollLeft
    scrollTopStart = canvasContainer.value.scrollTop
  }
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', stopPan)
}

const handleMouseMove = (e) => {
  if (isPanning && canvasContainer.value) {
    const dx = e.clientX - panStartX
    const dy = e.clientY - panStartY
    canvasContainer.value.scrollLeft = scrollLeftStart - dx
    canvasContainer.value.scrollTop = scrollTopStart - dy
  }
}

const stopPan = () => {
  isPanning = false
  document.body.style.userSelect = 'auto'
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', stopPan)
}
</script>

<template>
  <div class="flex-1 flex flex-col w-full h-full min-h-screen bg-neutral-50">
    <NavBar roleName="Administrador" />
    
    <main class="flex-1 max-w-6xl w-full mx-auto p-8 flex flex-col animate-[fadeIn_0.2s_ease-out]">
      <header class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex items-center gap-4">
          <button @click="router.push('/admin')" class="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm">
            <ChevronLeft :stroke-width="1.5" class="w-4 h-4" />
          </button>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-neutral-900">Supervisión Operativa</h1>
            <p class="text-sm text-neutral-500 mt-2 font-medium">Control absoluto del estado de las mesas y resoluciones de conflictos.</p>
          </div>
        </div>
      </header>

      <!-- Pestañas de Salas -->
      <div v-if="store.rooms.length > 0" class="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar shrink-0">
        <button 
          v-for="room in store.rooms" :key="room.id"
          @click="selectRoom(room.id)"
          :class="['px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border whitespace-nowrap flex items-center gap-2 shadow-sm', 
            store.activeRoomId === room.id 
              ? 'bg-neutral-900 text-white border-neutral-900' 
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
          ]">
          <MapPin :stroke-width="1.5" class="w-4 h-4" :class="store.activeRoomId === room.id ? 'text-neutral-300' : 'text-neutral-400'" />
          {{ room.name }}
        </button>
      </div>

      <!-- Visor de Topología -->
      <div class="flex-1 relative bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm min-h-[500px]">
        <template v-if="activeRoom">
          <!-- Controles de Zoom Flotantes -->
          <div class="absolute right-6 bottom-6 z-30 flex flex-col gap-2 bg-white p-1 rounded-xl shadow-lg border border-neutral-200">
            <button @click="zoomIn" class="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
              <ZoomIn :stroke-width="1.5" class="w-4 h-4" />
            </button>
            <div class="w-full h-px bg-neutral-100 my-0.5"></div>
            <button @click="resetZoom" class="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors" title="Centrar Vista">
              <Maximize :stroke-width="1.5" class="w-4 h-4" />
            </button>
            <div class="w-full h-px bg-neutral-100 my-0.5"></div>
            <button @click="zoomOut" class="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
              <ZoomOut :stroke-width="1.5" class="w-4 h-4" />
            </button>
          </div>

          <!-- Lienzo de Navegación -->
          <div ref="canvasContainer" class="absolute inset-0 overflow-auto bg-neutral-50/50 hide-scrollbar">
            <div 
              class="absolute transition-transform duration-200 origin-top-left cursor-grab active:cursor-grabbing" 
              :style="{ transform: `scale(${zoomLevel})`, width: '3000px', height: '3000px' }" 
              @mousedown.self="startPan">
              
              <!-- Elementos Arquitectónicos (Solo lectura) -->
              <div 
                v-for="el in activeRoom.elements" :key="el.id"
                :class="[
                  'absolute rounded-sm flex items-center justify-center origin-center shadow-sm select-none pointer-events-none',
                  el.type === 'wall' ? 'bg-neutral-800' : 
                  el.type === 'window' ? 'bg-sky-100/80 border-2 border-sky-300 backdrop-blur-sm' : 
                  'bg-amber-600 border border-amber-800'
                ]"
                :style="{ 
                  left: el.x + 'px', top: el.y + 'px', 
                  width: el.width + 'px', height: el.height + 'px',
                  transform: `rotate(${el.rotation}deg)` 
                }">
              </div>

                <!-- Mesas (Interactivas) -->
                <button 
                  v-for="table in activeRoom.tables" :key="table.id"
                  @click="handleTableClick(table)"
                  :class="[
                    'absolute flex flex-col items-center justify-center w-20 h-20 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-4 group',
                    stateConfig[table.state || 'disponible'].color,
                    (elapsedTimes[table.id]?.isWarning) ? 'ring-2 ring-rose-500 animate-pulse' : 'focus:ring-sky-500/50',
                    table.mergeGroup ? 'ring-2 ring-indigo-300' : ''
                  ]"
                  :style="{ left: table.x + 'px', top: table.y + 'px' }">
                  <span class="text-lg font-bold tracking-tight">{{ table.number }}</span>
                  <span class="text-[10px] font-semibold uppercase tracking-widest opacity-75 mt-0.5 flex items-center gap-1">
                    <Users :stroke-width="2" class="w-3 h-3" /> {{ table.guests ? `${table.guests}/${table.capacity}` : table.capacity }}
                  </span>

                  <!-- Avatar visual para mesa asignada/bloqueada -->
                  <div v-if="table.assignedTo || table.lockedBy" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-10 flex items-center gap-1 border border-neutral-700">
                     {{ getWaiterNameById(table.assignedTo || table.lockedBy).substring(0,6) }}
                  </div>
                
                <!-- Indicador de Tiempo (Asignación y Limbo) -->
                <div v-if="(table.state === 'asignacion' || table.state === 'limbo') && timeRemaining[table.id] !== undefined" 
                  :class="['absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-10 flex items-center gap-1',
                    table.state === 'limbo' ? 'bg-violet-500 text-white' : 'bg-amber-500 text-white']">
                  <ShieldAlert v-if="table.state === 'limbo'" :stroke-width="2" class="w-3 h-3" />
                  <Clock v-else :stroke-width="2" class="w-3 h-3" />
                  {{ timeRemaining[table.id] }}s
                </div>

                <!-- Indicador de Tiempo (Ocupada/Sucia) -->
                <div v-if="elapsedTimes[table.id]" :class="['absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-10 flex items-center gap-1 transition-colors', elapsedTimes[table.id].isWarning ? 'bg-rose-500 text-white' : 'bg-neutral-800 text-white']">
                  <AlertTriangle v-if="elapsedTimes[table.id].isWarning" :stroke-width="2" class="w-3 h-3" />
                  <Clock v-else :stroke-width="2" class="w-3 h-3" />
                  {{ elapsedTimes[table.id].minutes }}m
                </div>

                <!-- Indicador de Estado Visual -->
                <div class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white bg-current opacity-80 group-hover:scale-110 transition-transform"></div>
              </button>
              
            </div>
          </div>

        </template>
        <template v-else>
          <div class="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
            <MapPin :stroke-width="1.5" class="w-12 h-12 mb-3 opacity-50" />
            <p class="text-sm font-medium">No hay salas disponibles.</p>
          </div>
        </template>
      </div>

    </main>

    <!-- Modal Supervisor de Administrador -->
    <Dialog v-model:visible="isActionDialogOpen" modal :header="activeTableItem ? `Modo Dios: Mesa ${activeTableItem.number}` : ''" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div v-if="activeTableItem" class="flex flex-col gap-6 mt-2">
        
        <!-- Estado de la Mesa -->
        <div class="flex items-center justify-between p-4 rounded-xl border bg-neutral-50 border-neutral-200">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border" :class="stateConfig[activeTableItem.state || 'disponible'].color.split(' ').map(c => c.replace('bg-', 'bg-').replace('border-', 'border-').replace('text-', 'text-')).join(' ')">
              <CheckCircle2 v-if="activeTableItem.state === 'disponible'" :stroke-width="1.5" class="w-5 h-5" />
              <Clock v-else-if="activeTableItem.state === 'asignacion'" :stroke-width="1.5" class="w-5 h-5" />
              <ShieldAlert v-else-if="activeTableItem.state === 'limbo'" :stroke-width="1.5" class="w-5 h-5" />
              <Users v-else-if="activeTableItem.state === 'ocupada'" :stroke-width="1.5" class="w-5 h-5" />
              <Trash2 v-else :stroke-width="1.5" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-xs uppercase tracking-widest font-semibold text-neutral-400">Estado Actual</p>
              <p class="text-base font-semibold tracking-tight text-neutral-900">
                {{ stateConfig[activeTableItem.state || 'disponible'].label }}
                <span v-if="activeTableItem.guests" class="text-sm font-normal text-neutral-500 ml-1">({{ activeTableItem.guests }} comensales)</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Propiedad de la mesa -->
        <div v-if="activeTableItem.assignedTo || activeTableItem.lockedBy" class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-neutral-900">Personal a cargo</p>
          <div class="flex items-center justify-between p-3 rounded-lg border border-sky-200 bg-sky-50">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sky-600 shadow-sm border border-sky-100">
                <Users :stroke-width="1.5" class="w-4 h-4" />
              </div>
              <span class="text-sm font-semibold text-sky-900">{{ getWaiterNameById(activeTableItem.assignedTo || activeTableItem.lockedBy) }}</span>
            </div>
            <button @click="unassignWaiter" class="text-xs font-bold bg-white text-sky-700 px-3 py-1.5 rounded-md hover:bg-sky-100 border border-sky-200 transition-colors shadow-sm">
              Desvincular
            </button>
          </div>
        </div>

        <!-- Selector forzado de estados -->
        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <ShieldAlert :stroke-width="1.5" class="w-4 h-4 text-amber-500" />
            Forzar cambio de estado
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button @click="forceChangeState('disponible')" :disabled="activeTableItem.state === 'disponible'" class="p-3 text-sm font-medium rounded-lg border border-neutral-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <CheckCircle2 :stroke-width="1.5" class="w-4 h-4" /> Disponible
            </button>
            <button @click="forceChangeState('asignacion')" :disabled="activeTableItem.state === 'asignacion' || activeTableItem.state === 'ocupada' || activeTableItem.state === 'sucia'" class="p-3 text-sm font-medium rounded-lg border border-neutral-200 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Clock :stroke-width="1.5" class="w-4 h-4" /> Asignación
            </button>
            <button @click="forceChangeState('ocupada')" :disabled="activeTableItem.state === 'ocupada'" class="p-3 text-sm font-medium rounded-lg border border-neutral-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors disabled:opacity-50 flex items-center gap-2">
              <Users :stroke-width="1.5" class="w-4 h-4" /> Ocupada
            </button>
            <button @click="forceChangeState('sucia')" :disabled="activeTableItem.state === 'sucia'" class="p-3 text-sm font-medium rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              <Trash2 :stroke-width="1.5" class="w-4 h-4" /> Sucia
            </button>
          </div>
        </div>

        <div class="flex justify-end pt-2 mt-2 border-t border-neutral-100">
          <button @click="isActionDialogOpen = false" class="px-5 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm">
            Cerrar Panel
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>