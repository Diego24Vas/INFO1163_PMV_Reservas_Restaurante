<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { store, stateConfig } from '../store'
import NavBar from '../components/NavBar.vue'
import { MapPin, Users, ZoomIn, ZoomOut, Maximize, Clock, CheckCircle2, XCircle, Trash2, Check, Lock, AlertTriangle, LayoutGrid, BellRing, ChevronLeft, ArrowRight, History, Combine } from 'lucide-vue-next'
import Dialog from 'primevue/dialog'
import { SesionesRegistroService } from '../service/sesiones_registro'
import { LimpiezasService } from '../service/limpiezas'

const router = useRouter()
const canvasContainer = ref(null)
const zoomLevel = ref(1)

const currentView = ref('menu') // 'menu', 'map', 'alerts', 'history'

// Modal de acciones y Timer
const isActionDialogOpen = ref(false)
const activeTableItem = ref(null)
const localTableState = ref(null) // Para evitar glitch visual al cerrar modal
const timeRemaining = ref({})
const elapsedTimes = ref({}) // Para medir tiempo en ocupada/sucia
let timerInterval = null

// Alertas activas
const activeAlerts = computed(() => {
  const alerts = []
  const now = Date.now()
  store.rooms.forEach(room => {
    room.tables.forEach(table => {
      // Regla de Negocio: Las alertas solo deben aparecerle al camarero dueño de la mesa
      if (!table.assignedTo || table.assignedTo !== store.activeWaiterId) return
      
      if (!table.stateUpdatedAt) return
      const elapsedMinutes = Math.floor((now - table.stateUpdatedAt) / 60000)
      
      if (table.state === 'sucia' && elapsedMinutes >= 10) {
        alerts.push({ id: table.id + '_cleaning', table, room, type: 'cleaning', priority: 1, minutes: elapsedMinutes, message: `Limpieza pendiente excedida (>${elapsedMinutes}m)` })
      }
      if (table.state === 'ocupada' && elapsedMinutes >= 120) {
        alerts.push({ id: table.id + '_inactivity', table, room, type: 'inactivity', priority: 2, minutes: elapsedMinutes, message: `Inactividad prolongada (>${elapsedMinutes}m)` })
      }
    })
  })
  // Ordenar: prioridad 1 (limpieza) primero, luego por minutos
  return alerts.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return b.minutes - a.minutes
  })
})

const cleaningAlertsCount = computed(() => {
  return activeAlerts.value.filter(a => a.type === 'cleaning').length
})

let pollInterval = null

onMounted(async () => {
  if (store.role !== 'waiter' || !store.activeWaiterId) {
    router.push('/')
    return
  }
  await store.loadTopology(true)
  
  // Poll para mantener sincronización entre camareros (cada 2 segundos)
  pollInterval = setInterval(async () => {
    await store.loadTopology(true)
  }, 2000)
  
  // Loop de comprobación de locks y alertas (cada segundo)
  timerInterval = setInterval(() => {
    let needsSave = false
    const now = Date.now()
    
    store.rooms.forEach(room => {
      room.tables.forEach(table => {
        // Lógica de Lock en Asignación (60s)
        if (table.state === 'asignacion' && table.lockedUntil) {
          const secondsLeft = Math.ceil((table.lockedUntil - now) / 1000)
          if (secondsLeft <= 0) {
            table.state = 'disponible'
            table.lockedUntil = null
            table.lockedBy = null
            table.stateUpdatedAt = now
            needsSave = true
            
            if (activeTableItem.value && activeTableItem.value.id === table.id) {
              isActionDialogOpen.value = false
            }
          } else {
            timeRemaining.value[table.id] = secondsLeft
          }
        }

        // Lógica de Alertas de Tiempo (Ocupada y Sucia)
        if (table.state === 'ocupada' || table.state === 'sucia') {
          if (!table.stateUpdatedAt) {
            table.stateUpdatedAt = now
            needsSave = true
          }
          
          const elapsedMinutes = Math.floor((now - table.stateUpdatedAt) / 60000)
          let isWarning = false
          
          // Umbrales de alerta según Reglas de Negocio (RN07 y RN08)
          // RN07: Alerta de Inactividad (>120 min)
          if (table.state === 'ocupada' && elapsedMinutes >= 120) isWarning = true
          // RN08: Tiempo Máximo de Limpieza (>10 min)
          if (table.state === 'sucia' && elapsedMinutes >= 10) isWarning = true
          
          elapsedTimes.value[table.id] = { minutes: elapsedMinutes, isWarning }
        } else {
          delete elapsedTimes.value[table.id]
        }
      })
    })
    
    if (needsSave) store.saveTopology()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (pollInterval) clearInterval(pollInterval)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', stopPan)
})

const totalMergeCapacity = computed(() => {
  return selectedForMerge.value.reduce((sum, table) => sum + table.capacity, 0)
})

const waiterName = computed(() => {
  return store.activeWaiterName || 'Camarero'
})

const getWaiterNameById = (id) => {
  const w = store.waiters.find(w => w.id === id)
  return w ? w.name : 'Otro camarero'
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

const openMapView = () => {
  currentView.value = 'map'
  setTimeout(centerView, 50)
  setTimeout(centerView, 150)
}

const openAlertsView = () => {
  currentView.value = 'alerts'
}

const openHistoryView = () => {
  currentView.value = 'history'
}

const selectedTableFilter = ref('all')

const waiterHistory = computed(() => {
  return store.history.filter(h => h.waiterId === store.activeWaiterId || h.affectedWaiterId === store.activeWaiterId)
})

const availableHistoryTables = computed(() => {
  const tables = new Set()
  waiterHistory.value.forEach(evt => {
    if (evt.tableNumber) tables.add(evt.tableNumber)
  })
  return Array.from(tables).sort((a, b) => {
    const numA = parseInt(a)
    const numB = parseInt(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return String(a).localeCompare(String(b))
  })
})

const filteredWaiterHistory = computed(() => {
  return waiterHistory.value.filter(evt => {
    return selectedTableFilter.value === 'all' || String(evt.tableNumber) === String(selectedTableFilter.value)
  })
})

const goBackToMenu = () => {
  currentView.value = 'menu'
}

const goToTable = (roomId, tableId) => {
  store.activeRoomId = roomId
  currentView.value = 'map'
  setTimeout(centerView, 50)
}

const zoomIn = () => { zoomLevel.value = Math.min(zoomLevel.value + 0.1, 2) }
const zoomOut = () => { zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.5) }
const resetZoom = () => { zoomLevel.value = 1; centerView() }

// Modo Fusión de Mesas
const isMergeMode = ref(false)
const selectedForMerge = ref([])
const isMergeDialogOpen = ref(false)

const toggleMergeMode = () => {
  isMergeMode.value = !isMergeMode.value
  selectedForMerge.value = []
}

// Modificar Lógica de click en Mesa
const handleTableClick = (table) => {
  // Buscar la mesa en el store actual (resistente al polling que reemplaza objetos)
  const currentTables = activeRoom.value?.tables
  if (!currentTables) return
  
  const latestTable = currentTables.find(t => t.id === table.id)
  if (!latestTable) return
  
  if (isMergeMode.value) {
    if (latestTable.state !== 'disponible') return
    const index = selectedForMerge.value.findIndex(t => t.id === latestTable.id)
    if (index > -1) {
      selectedForMerge.value.splice(index, 1)
    } else {
      selectedForMerge.value.push(latestTable)
    }
    return
  }
  
  // Si está bloqueada por otro camarero, mostrar modal de solo lectura
  if (latestTable.state === 'asignacion' && latestTable.lockedBy && latestTable.lockedBy !== store.activeWaiterId) {
    const secondsLeft = Math.ceil((latestTable.lockedUntil - Date.now()) / 1000)
    if (secondsLeft > 0) {
      activeTableItem.value = latestTable
      localTableState.value = latestTable.state
      isActionDialogOpen.value = true
      return
    }
  }
  
  activeTableItem.value = latestTable
  localTableState.value = latestTable.state || 'disponible'
  isActionDialogOpen.value = true
}

const openMergeConfirm = () => {
  if (selectedForMerge.value.length < 2) return
  isMergeDialogOpen.value = true
}

const cancelMerge = () => {
  isMergeDialogOpen.value = false
  selectedForMerge.value = []
}

const confirmMerge = async (guests) => {
  if (selectedForMerge.value.length < 2) return
  
  const now = Date.now()
  const groupId = 'merge_' + Math.random().toString(36).substring(2, 9)
  
  // Obtener referencias actuales desde el store (resistente al polling)
  const currentTables = activeRoom.value?.tables
  if (!currentTables) return
  
  const selectedIds = selectedForMerge.value.map(t => t.id)
  const freshTables = currentTables.filter(t => selectedIds.includes(t.id))
  if (freshTables.length < 2) return
  
  // Procesamos la asignación de todas las mesas seleccionadas juntas
  for (const table of freshTables) {
    table.state = 'asignacion'
    table.stateUpdatedAt = now
    table.lockedUntil = now + 60000
    table.lockedBy = store.activeWaiterId
    table.mergeGroup = groupId
    table.guests = null
    timeRemaining.value[table.id] = 60
  }
  
  // Asignamos todos los comensales a la primera mesa del grupo
  freshTables[0].guests = guests
  
  await store.saveTopology()
  
  // Guardamos evento de historial
  const tableNumbers = freshTables.map(t => t.number).join('+')
  await store.logEvent(
    store.activeWaiterId,
    waiterName.value,
    tableNumbers,
    activeRoom.value.name,
    'asignacion'
  )
  
  isMergeDialogOpen.value = false
  isMergeMode.value = false
  selectedForMerge.value = []
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// Extender estadía de mesa ocupada
const canExtendStay = computed(() => {
  if (!activeTableItem.value || activeTableItem.value.state !== 'ocupada') return false
  if (activeTableItem.value.assignedTo !== store.activeWaiterId) return false
  if (activeTableItem.value.stateUpdatedAt) {
    const elapsedMinutes = Math.floor((Date.now() - activeTableItem.value.stateUpdatedAt) / 60000)
    return elapsedMinutes >= 120 // Más de 2 horas
  }
  return false
})

const extendStay = async () => {
  if (!activeTableItem.value) return
  const table = activeTableItem.value
  // Agregar 30 minutos al tiempo actual
  table.stateUpdatedAt = Date.now() - (30 * 60 * 1000) // Simular que pasaron 30 minutos menos (equivalente a agregar tiempo)
  // Opcional: 也可以只是 actualizar el timestamp sin cambiar el cálculo, lo cual extiende la estadía visualmente
  // Mejor enfoque: simplemente no hacer nada especial, el cálculo de tiempo es dinámico
  // Pero para "extender" realmente, podemos resetear el contador diciendo "se acaba de ocupar de nuevo"
  // Sin embargo, la idea es que el sistema no alerte por 30 minutos más
  // La forma correcta es AGREGAR tiempo al stateUpdatedAt (hacerlo más antiguo)
  // Para sumar 30 min al tiempo passado: restamos 30 min del timestamp actual (haciendo parecer que empezó antes)
  table.stateUpdatedAt = table.stateUpdatedAt - (30 * 60 * 1000)
  
  await store.saveTopology()
}

// Lógica de Máquina de Estados
const changeTableState = async (newState, guests = null) => {
  if (!activeTableItem.value) return
  
  // VALIDACIÓN CRÍTICA: Verificar estado actual desde el store (sincronizado)
  const currentTable = activeRoom.value?.tables.find(t => t.id === activeTableItem.value.id)
  if (!currentTable) return
  
  // Si vamos a iniciar asignación, verificar que no esté bloqueada por otro
  if (newState === 'asignacion') {
    if (currentTable.state === 'asignacion' && currentTable.lockedBy && currentTable.lockedBy !== store.activeWaiterId) {
      alert('Esta mesa fue bloqueada por otro camarero. Por favor espera a que se libere.')
      await store.loadTopology(true)
      isActionDialogOpen.value = false
      return
    }
  }
  
  // Si vamos a confirmar ocupación, verificar que el lock sea nuestro
  if (newState === 'ocupada') {
    if (currentTable.state === 'asignacion' && currentTable.lockedBy && currentTable.lockedBy !== store.activeWaiterId) {
      alert('El tiempo de asignación expiró o fue tomada por otro camarero.')
      await store.loadTopology(true)
      isActionDialogOpen.value = false
      return
    }
  }
  
  const table = currentTable
  const previousState = table.state
  
  const getAffectedTables = () => {
    if (table.mergeGroup) {
      return activeRoom.value.tables.filter(t => t.mergeGroup === table.mergeGroup)
    }
    return [table]
  }
  
  // Lógica especial para confirmar mesa fusionada
  if (newState === 'ocupada' && table.mergeGroup) {
    activeRoom.value.tables.forEach(t => {
      if (t.mergeGroup === table.mergeGroup) {
        t.state = 'ocupada'
        t.stateUpdatedAt = Date.now()
        t.lockedUntil = null
        t.lockedBy = null
        t.assignedTo = store.activeWaiterId
      }
    })
  }
  
  // Lógica especial para marcar mesa fusionada para limpieza
  if (newState === 'sucia' && table.mergeGroup) {
    activeRoom.value.tables.forEach(t => {
      if (t.mergeGroup === table.mergeGroup) {
        t.state = 'sucia'
        t.stateUpdatedAt = Date.now()
        t.lockedUntil = null
        t.lockedBy = null
      }
    })
  }
  
  // Lógica especial para liberar mesa fusionada (sucia -> disponible)
  if (newState === 'disponible' && table.mergeGroup) {
    activeRoom.value.tables.forEach(t => {
      if (t.mergeGroup === table.mergeGroup) {
        t.state = 'disponible'
        t.stateUpdatedAt = Date.now()
        t.lockedUntil = null
        t.lockedBy = null
        t.assignedTo = null
        t.guests = null
        t.mergeGroup = null
      }
    })
  }
  
  if (newState === 'asignacion') {
    localTableState.value = 'asignacion'
  } else {
    isActionDialogOpen.value = false
  }

  table.state = newState
  table.stateUpdatedAt = Date.now()
  
  if (newState === 'asignacion') {
    table.lockedUntil = Date.now() + 60000
    table.lockedBy = store.activeWaiterId
    timeRemaining.value[table.id] = 60
    if (guests !== null) {
      table.guests = guests
    }
  } else {
    table.lockedUntil = null
    table.lockedBy = null
    
    if (newState === 'ocupada') {
      table.assignedTo = store.activeWaiterId
    } else if (newState === 'disponible') {
      table.assignedTo = null
      table.guests = null
      table.mergeGroup = null
    }
  }

  // ================================================================
  // PERSISTENCIA EN BD: sesiones_registro y limpiezas
  // ================================================================
  try {
    const affectedTables = getAffectedTables()

    if (newState === 'ocupada') {
      for (const t of affectedTables) {
        await SesionesRegistroService.create({
          mesa_id: t.id,
          camarero_id: store.activeWaiterId,
          estado: 'Activa',
          comensales_reales: t.guests || guests || 0
        })
      }
    }

    if (newState === 'sucia') {
      for (const t of affectedTables) {
        const sesionActiva = await SesionesRegistroService.getActivaByMesaId(t.id)
        if (sesionActiva) {
          await SesionesRegistroService.update(sesionActiva.id, {
            estado: 'Finalizada',
            fin_ocupacion: new Date().toISOString()
          })
        }
        await LimpiezasService.create({
          mesa_id: t.id,
          estado: 'Pendiente'
        })
      }
    }

    if (newState === 'disponible' && previousState === 'sucia') {
      for (const t of affectedTables) {
        const limpiezaPendiente = await LimpiezasService.getPendienteByMesaId(t.id)
        if (limpiezaPendiente) {
          await LimpiezasService.update(limpiezaPendiente.id, {
            estado: 'Finalizada',
            completado_en: new Date().toISOString()
          })
        }
      }
    }
  } catch (e) {
    console.error('Error al persistir sesion/limpieza en BD:', e)
  }
  
  await store.saveTopology()
  
  await store.logEvent(
    store.activeWaiterId,
    waiterName.value,
    table.number,
    activeRoom.value.name,
    newState
  )
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
    <NavBar roleName="Camarero" />
    
    <main class="flex-1 max-w-6xl w-full mx-auto p-8 flex flex-col animate-[fadeIn_0.2s_ease-out]">
      <header class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex items-center gap-4">
          <button v-if="currentView !== 'menu'" @click="goBackToMenu" class="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm">
            <ChevronLeft :stroke-width="1.5" class="w-4 h-4" />
          </button>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-neutral-900">
              <template v-if="currentView === 'menu'">Bienvenido, {{ waiterName }}</template>
              <template v-else-if="currentView === 'map'">Gestión de Mesas</template>
              <template v-else-if="currentView === 'alerts'">Centro de Alertas</template>
              <template v-else-if="currentView === 'history'">Historial de Actividad</template>
            </h1>
            <p class="text-sm text-neutral-500 mt-2 font-medium">
              <template v-if="currentView === 'menu'">Selecciona un módulo operativo para continuar tu turno.</template>
              <template v-else-if="currentView === 'map'">Visualiza las salas y gestiona el estado de las mesas.</template>
              <template v-else-if="currentView === 'alerts'">Monitoriza los tiempos de inactividad y limpieza.</template>
              <template v-else-if="currentView === 'history'">Revisa los cambios de estado de mesas realizados hoy.</template>
            </p>
          </div>
        </div>
      </header>

      <!-- MENÚ PRINCIPAL -->
      <div v-if="currentView === 'menu'" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <button @click="openMapView" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col relative overflow-hidden">
          <div class="h-12 w-12 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mb-5 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
            <LayoutGrid :stroke-width="1.5" class="w-6 h-6" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Mapa de Mesas</h2>
          <p class="text-xs text-neutral-500 mt-2 leading-relaxed">Asigna clientes, confirma ocupaciones y marca mesas para limpieza interactuando con el plano del local.</p>
        </button>

        <button @click="openAlertsView" class="group text-left bg-white border rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col relative overflow-hidden" :class="cleaningAlertsCount > 0 ? 'border-rose-300 ring-2 ring-rose-100' : 'border-neutral-200'">
          <div class="h-12 w-12 rounded-xl flex items-center justify-center mb-5 transition-colors relative" :class="cleaningAlertsCount > 0 ? 'bg-rose-500 text-white group-hover:bg-rose-600' : 'bg-neutral-100 text-neutral-600 group-hover:bg-rose-600 group-hover:text-white'">
            <BellRing :stroke-width="1.5" class="w-6 h-6" />
            <span v-if="activeAlerts.length > 0" class="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="cleaningAlertsCount > 0 ? 'bg-rose-200' : 'bg-rose-400'"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 border-2 border-white" :class="cleaningAlertsCount > 0 ? 'bg-rose-600' : 'bg-rose-500'"></span>
            </span>
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900 flex items-center gap-3">
            Alertas Activas
            <span v-if="activeAlerts.length > 0" class="px-2 py-0.5 rounded-md text-xs font-bold" :class="cleaningAlertsCount > 0 ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'">
              {{ activeAlerts.length }}
            </span>
          </h2>
          <p class="text-xs text-neutral-500 mt-2 leading-relaxed">
            <span v-if="cleaningAlertsCount > 0" class="text-rose-600 font-medium">{{ cleaningAlertsCount }} alerta{{ cleaningAlertsCount > 1 ? 's' : '' }} de limpieza </span>
            <span v-else>Revisa los retrasos en limpieza y mesas con inactividad prolongada</span>
          </p>
        </button>
        
        <button @click="openHistoryView" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col relative overflow-hidden">
          <div class="h-12 w-12 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors relative">
            <History :stroke-width="1.5" class="w-6 h-6" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Historial</h2>
          <p class="text-xs text-neutral-500 mt-2 leading-relaxed">Consulta el registro de las mesas que has atendido o liberado durante tu turno.</p>
        </button>
      </div>

      <!-- VISTA DE ALERTAS -->
      <div v-else-if="currentView === 'alerts'" class="flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]">
        
        <!-- Alertas de Limpieza Prioritarias -->
        <div v-if="cleaningAlertsCount > 0" class="bg-gradient-to-r from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg">
          <div class="flex items-center gap-3 mb-2">
            <Trash2 :stroke-width="1.5" class="w-6 h-6" />
            <h3 class="text-lg font-semibold tracking-tight">Atención: Limpieza Pendiente</h3>
          </div>
          <p class="text-sm text-rose-100 mb-3">Tienes <strong>{{ cleaningAlertsCount }}</strong> mesa{{ cleaningAlertsCount > 1 ? 's' : '' }} excediendo el tiempo de limpieza (>10 min).</p>
          <button @click="goToTable(store.activeRoomId, null)" class="text-xs font-medium bg-white text-rose-600 px-4 py-2 rounded-lg hover:bg-rose-50 transition-colors">
            Ir a limpiar ahora
          </button>
        </div>

        <div v-if="activeAlerts.length === 0" class="bg-white border border-neutral-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <CheckCircle2 :stroke-width="1.5" class="w-12 h-12 text-emerald-500 mb-4 opacity-80" />
          <h3 class="text-lg font-semibold text-neutral-900 tracking-tight">Todo en orden</h3>
          <p class="text-sm text-neutral-500 mt-1">No hay alertas activas en este momento.</p>
        </div>
        <div v-else class="grid grid-cols-1 gap-3">
          <div v-for="alert in activeAlerts" :key="alert.id" 
            :class="['rounded-xl p-5 flex items-center justify-between shadow-sm hover:border-neutral-300 transition-colors border', 
              alert.type === 'cleaning' ? 'bg-rose-50 border-rose-200' : 'bg-white border-neutral-200']">
            <div class="flex items-center gap-4">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0', alert.type === 'cleaning' ? 'bg-rose-500 text-white' : 'bg-rose-50']">
                <Trash2 v-if="alert.type === 'cleaning'" :stroke-width="1.5" class="w-5 h-5" />
                <AlertTriangle v-else :stroke-width="1.5" class="w-5 h-5" :class="alert.type === 'cleaning' ? 'text-white' : 'text-rose-600'" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-semibold tracking-tight text-neutral-900">Mesa {{ alert.table.number }}</h3>
                  <span class="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">{{ alert.room.name }}</span>
                  <span v-if="alert.type === 'cleaning'" class="text-[10px] font-bold uppercase tracking-widest text-rose-700 bg-rose-200 border border-rose-300 px-2 py-0.5 rounded-md">
                    LIMPIEZA
                  </span>
                  <span v-else class="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
                    INACTIVIDAD
                  </span>
                </div>
                <p :class="['text-sm font-medium mt-0.5', alert.type === 'cleaning' ? 'text-rose-700' : 'text-rose-600']">{{ alert.message }}</p>
                <p class="text-xs text-neutral-500 mt-1">Tiempo transcurrido: <strong class="text-neutral-900">{{ alert.minutes }} minutos</strong></p>
              </div>
            </div>
            <button @click="goToTable(alert.room.id, alert.table.id)" class="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors">
              Ver Mesa <ArrowRight :stroke-width="1.5" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- VISTA DE HISTORIAL -->
      <div v-else-if="currentView === 'history'" class="flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]">
        
        <!-- Filtro -->
        <div v-if="waiterHistory.length > 0" class="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <span class="text-sm font-semibold text-neutral-700">Filtrar por mesa:</span>
          <select v-model="selectedTableFilter" class="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all cursor-pointer min-w-[140px]">
            <option value="all">Todas las mesas</option>
            <option v-for="table in availableHistoryTables" :key="table" :value="table">
              Mesa {{ table }}
            </option>
          </select>
        </div>

        <div v-if="filteredWaiterHistory.length === 0" class="bg-white border border-neutral-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <History :stroke-width="1.5" class="w-12 h-12 text-neutral-300 mb-4" />
          <h3 class="text-lg font-semibold text-neutral-900 tracking-tight">Sin historial</h3>
          <p class="text-sm text-neutral-500 mt-1">No hay registros para mostrar con los filtros actuales.</p>
        </div>
        <div v-else class="grid grid-cols-1 gap-3">
          <div v-for="evt in filteredWaiterHistory" :key="evt.id" class="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:border-neutral-300 transition-colors">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border" :class="stateConfig[evt.action].color.split(' ').map(c => c.replace('bg-', 'bg-').replace('border-', 'border-').replace('text-', 'text-')).join(' ')">
                <CheckCircle2 v-if="evt.action === 'disponible'" :stroke-width="1.5" class="w-5 h-5" />
                <Clock v-else-if="evt.action === 'asignacion'" :stroke-width="1.5" class="w-5 h-5" />
                <Users v-else-if="evt.action === 'ocupada'" :stroke-width="1.5" class="w-5 h-5" />
                <Trash2 v-else :stroke-width="1.5" class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-semibold tracking-tight text-neutral-900">Mesa {{ evt.tableNumber }}</h3>
                  <span class="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">{{ evt.roomName }}</span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <p class="text-sm text-neutral-600 font-medium">Marcada como {{ stateConfig[evt.action].label }}</p>
                  <span v-if="evt.waiterId === 'admin'" class="text-[10px] font-bold uppercase tracking-widest text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                    Por Administrador
                  </span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-neutral-900">{{ formatTime(evt.timestamp) }}</p>
              <p class="text-xs font-medium text-neutral-400">{{ formatDate(evt.timestamp) }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- VISTA DE MAPA -->
      <div v-else-if="currentView === 'map'" class="flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out]">
        <!-- Pestañas de Salas -->
        <div class="flex items-center justify-between gap-4 mb-4 shrink-0">
          <div v-if="store.rooms.length > 0" class="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
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
          
          <!-- Botón de Fusión -->
          <div class="flex items-center gap-2 pb-2">
            <button v-if="isMergeMode" @click="openMergeConfirm" :disabled="selectedForMerge.length < 2" class="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border whitespace-nowrap flex items-center gap-2 shadow-sm bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <Combine :stroke-width="1.5" class="w-4 h-4" /> Fusionar ({{ selectedForMerge.length }})
            </button>
            <button @click="toggleMergeMode" :class="['px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border whitespace-nowrap flex items-center gap-2 shadow-sm', isMergeMode ? 'bg-neutral-100 text-neutral-800 border-neutral-300' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50']">
              <Combine v-if="!isMergeMode" :stroke-width="1.5" class="w-4 h-4" />
              <XCircle v-else :stroke-width="1.5" class="w-4 h-4" />
              {{ isMergeMode ? 'Cancelar Fusión' : 'Fusionar Mesas' }}
            </button>
          </div>
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
                  :disabled="isMergeMode && table.state !== 'disponible'"
                  :class="[
                    'absolute flex flex-col items-center justify-center w-20 h-20 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-neutral-200 group',
                    isMergeMode && table.state !== 'disponible' ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
                    isMergeMode && selectedForMerge.find(t => t.id === table.id) ? 'ring-4 ring-indigo-500 bg-indigo-50 border-2 border-indigo-500 text-indigo-900 scale-105' : stateConfig[table.state || 'disponible'].color,
                    (!isMergeMode && elapsedTimes[table.id]?.isWarning) ? 'ring-2 ring-rose-500 animate-pulse' : '',
                    table.mergeGroup ? 'ring-2 ring-indigo-300' : ''
                  ]"
                  :style="{ left: table.x + 'px', top: table.y + 'px' }">
                  <span class="text-lg font-bold tracking-tight">{{ table.number }}</span>
                  <span class="text-[10px] font-semibold uppercase tracking-widest opacity-75 mt-0.5 flex items-center gap-1">
                    <Users :stroke-width="2" class="w-3 h-3" /> {{ table.guests ? `${table.guests}/${table.capacity}` : table.capacity }}
                  </span>
                  
                  <div v-if="table.mergeGroup" class="absolute -top-2 -left-2 w-5 h-5 bg-indigo-100 border border-indigo-300 text-indigo-700 rounded-full flex items-center justify-center z-10" title="Mesa Fusionada">
                    <Combine :stroke-width="1.5" class="w-3 h-3" />
                  </div>
                  
                  <!-- Indicador de Tiempo (Solo Asignación) -->
                  <div v-if="table.state === 'asignacion' && timeRemaining[table.id]" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-10 flex items-center gap-1">
                    <Clock :stroke-width="2" class="w-3 h-3" /> {{ timeRemaining[table.id] }}s
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
      </div>
    </main>

    <!-- Modal de Acciones de Mesa -->
    <Dialog v-model:visible="isActionDialogOpen" modal :header="activeTableItem ? `Mesa ${activeTableItem.number}` : ''" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div v-if="activeTableItem" class="flex flex-col gap-5 mt-2">
        
        <!-- Estado de la Mesa -->
        <div class="flex items-center gap-3 p-4 rounded-xl border" :class="stateConfig[localTableState || 'disponible'].color.split(' ').map(c => c.replace('bg-', 'bg-').replace('border-', 'border-').replace('text-', 'text-')).join(' ')">
          <div class="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center shrink-0">
            <CheckCircle2 v-if="localTableState === 'disponible'" :stroke-width="1.5" class="w-5 h-5" />
            <Clock v-else-if="localTableState === 'asignacion'" :stroke-width="1.5" class="w-5 h-5" />
            <Users v-else-if="localTableState === 'ocupada'" :stroke-width="1.5" class="w-5 h-5" />
            <Trash2 v-else :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <div>
            <p class="text-sm font-semibold tracking-tight">Estado actual: {{ stateConfig[localTableState || 'disponible'].label }}</p>
            <p class="text-xs opacity-80 font-medium">
              Capacidad: {{ activeTableItem.capacity }} personas
              <span v-if="activeTableItem.guests"> • Comensales: {{ activeTableItem.guests }}</span>
            </p>
          </div>
        </div>

        <!-- Acciones: DISPONIBLE -->
        <template v-if="localTableState === 'disponible'">
          <p class="text-sm text-neutral-500 font-medium">¿Cuántos comensales vas a asignar a esta mesa?</p>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <button 
              v-for="n in activeTableItem.capacity" :key="n"
              @click="changeTableState('asignacion', n)"
              class="flex flex-col items-center justify-center p-3 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 transition-colors bg-white shadow-sm"
            >
              <Users :stroke-width="1.5" class="w-5 h-5 text-neutral-600 mb-1" />
              <span class="text-sm font-medium text-neutral-900">{{ n }} {{ n === 1 ? 'persona' : 'personas' }}</span>
            </button>
          </div>

          <div class="flex justify-end mt-4">
            <button @click="isActionDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
          </div>
        </template>

        <!-- Acciones: EN ASIGNACION -->
        <template v-else-if="localTableState === 'asignacion'">
          <!-- Si la mesa fue bloqueada por OTRO camarero -->
          <template v-if="activeTableItem.lockedBy && activeTableItem.lockedBy !== store.activeWaiterId">
            <div class="flex flex-col items-center text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200 border-dashed">
              <Lock :stroke-width="1.5" class="w-8 h-8 text-neutral-400 mb-2" />
              <p class="text-sm font-semibold text-neutral-900">Mesa Bloqueada</p>
              <p class="text-xs text-neutral-500 mt-1">El camarero <b>{{ getWaiterNameById(activeTableItem.lockedBy) }}</b> está asignando esta mesa.</p>
            </div>
            <div class="flex justify-end mt-2">
              <button @click="isActionDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cerrar</button>
            </div>
          </template>
          
          <!-- Si la mesa fue bloqueada por EL MISMO camarero -->
          <template v-else>
            <div class="flex flex-col items-center justify-center p-4">
              <div class="text-4xl font-bold tracking-tighter text-amber-500 mb-1 font-mono">{{ timeRemaining[activeTableItem.id] || 0 }}s</div>
              <p class="text-xs font-medium text-neutral-500 uppercase tracking-widest">Para confirmar ocupación</p>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-2">
              <button @click="changeTableState('disponible')" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">
                <XCircle :stroke-width="1.5" class="w-4 h-4" /> Cancelar
              </button>
              <button @click="changeTableState('ocupada')" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm">
                <Check :stroke-width="1.5" class="w-4 h-4" /> Confirmar
              </button>
            </div>
          </template>
        </template>

        <!-- Acciones: OCUPADA -->
        <template v-else-if="localTableState === 'ocupada'">
          <template v-if="activeTableItem.assignedTo && activeTableItem.assignedTo !== store.activeWaiterId">
            <div class="flex flex-col items-center text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200 border-dashed">
              <Users :stroke-width="1.5" class="w-8 h-8 text-neutral-400 mb-2" />
              <p class="text-sm font-semibold text-neutral-900">Mesa Atendida</p>
              <p class="text-xs text-neutral-500 mt-1">El camarero <b>{{ getWaiterNameById(activeTableItem.assignedTo) }}</b> está a cargo de esta mesa.</p>
            </div>
            <div class="flex justify-end mt-2">
              <button @click="isActionDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cerrar</button>
            </div>
          </template>
          <template v-else>
            <!-- Alerta de inactividad -->
            <div v-if="canExtendStay" class="flex items-center gap-3 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle :stroke-width="1.5" class="w-5 h-5 text-amber-600 shrink-0" />
              <div class="flex-1">
                <p class="text-sm font-semibold text-amber-900">Mesa con estadía prolongada</p>
                <p class="text-xs text-amber-700">Los clientes llevan más de 2 horas. ¿Deseas extender su estadía?</p>
              </div>
              <button @click="extendStay" class="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shrink-0">
                +30 min
              </button>
            </div>
            <p class="text-sm text-neutral-500 font-medium">¿Los clientes se han retirado? Marca la mesa para que el personal de limpieza se encargue.</p>
            <div class="flex justify-end gap-3 mt-2">
              <button @click="isActionDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Volver</button>
              <button @click="changeTableState('sucia')" class="px-4 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm">Marcar para Limpieza</button>
            </div>
          </template>
        </template>

        <!-- Acciones: SUCIA -->
        <template v-else-if="localTableState === 'sucia'">
          <template v-if="activeTableItem.assignedTo && activeTableItem.assignedTo !== store.activeWaiterId">
            <div class="flex flex-col items-center text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200 border-dashed">
              <Trash2 :stroke-width="1.5" class="w-8 h-8 text-neutral-400 mb-2" />
              <p class="text-sm font-semibold text-neutral-900">Limpieza en Progreso</p>
              <p class="text-xs text-neutral-500 mt-1">El camarero <b>{{ getWaiterNameById(activeTableItem.assignedTo) }}</b> es responsable de habilitar esta mesa.</p>
            </div>
            <div class="flex justify-end mt-2">
              <button @click="isActionDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cerrar</button>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-neutral-500 font-medium">¿La mesa ya fue limpiada y está lista para recibir nuevos clientes?</p>
            <div class="flex justify-end gap-3 mt-2">
              <button @click="isActionDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Volver</button>
              <button @click="changeTableState('disponible')" class="px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm">Marcar como Disponible</button>
            </div>
          </template>
        </template>

      </div>
    </Dialog>

    <!-- Modal Confirmar Fusión -->
    <Dialog v-model:visible="isMergeDialogOpen" modal header="Confirmar Fusión de Mesas" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-5 mt-2">
        <div class="flex items-center gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50">
          <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-indigo-100 text-indigo-600">
            <Combine :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <div>
            <p class="text-sm font-semibold tracking-tight text-indigo-900">Fusionando {{ selectedForMerge.length }} mesas</p>
            <p class="text-xs text-indigo-700 font-medium">
              Mesas: {{ selectedForMerge.map(t => t.number).join(', ') }}
            </p>
          </div>
        </div>

        <p class="text-sm text-neutral-500 font-medium">¿Cuántos comensales vas a asignar a este grupo de mesas? (Capacidad total: {{ totalMergeCapacity }})</p>
        
        <div class="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto pr-2 hide-scrollbar">
          <button 
            v-for="n in totalMergeCapacity" :key="n"
            @click="confirmMerge(n)"
            class="flex flex-col items-center justify-center py-2 border border-neutral-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors bg-white shadow-sm"
          >
            <span class="text-sm font-bold">{{ n }}</span>
          </button>
        </div>

        <div class="flex justify-end mt-2">
          <button @click="cancelMerge" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
        </div>
      </div>
    </Dialog>
  </div>
</template>