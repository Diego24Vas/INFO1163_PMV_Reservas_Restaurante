<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store'
import NavBar from '../components/NavBar.vue'
import { 
  Plus, ChevronLeft, Pencil, Trash2, Grid, Grip, Square, AlertCircle, 
  ZoomIn, ZoomOut, RotateCw, ArrowRightLeft, Focus, Move, Save, Copy
} from 'lucide-vue-next'
import Dialog from 'primevue/dialog'

const router = useRouter()

// Refs
const canvasContainer = ref(null)

// Dialog states
const isRoomDialogOpen = ref(false)
const newRoomName = ref('')
const isTableDialogOpen = ref(false)
const newTableCapacity = ref(4)

const isDeleteRoomDialogOpen = ref(false)
const roomToDeleteId = ref(null)

// Selection & Edit states
const selectedItemId = ref(null)
const selectedItemType = ref(null) // 'table' or 'element'

const isEditDialogOpen = ref(false)
const editTableData = ref({ number: 1, capacity: 4 })

// View & Zoom states
const zoomLevel = ref(1)

const zoomIn = () => { zoomLevel.value = Math.min(zoomLevel.value + 0.1, 2) }
const zoomOut = () => { zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.5) }
const resetZoom = () => { zoomLevel.value = 1 }

// Background settings
const bgModes = ['none', 'grid', 'dots']
const bgMode = ref('none')

const cycleBgMode = () => {
  const currentIndex = bgModes.indexOf(bgMode.value)
  bgMode.value = bgModes[(currentIndex + 1) % bgModes.length]
}

const bgStyle = computed(() => {
  if (bgMode.value === 'grid') {
    return {
      backgroundImage: 'linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)',
      backgroundSize: `${24 * zoomLevel.value}px ${24 * zoomLevel.value}px`
    }
  }
  if (bgMode.value === 'dots') {
    return {
      backgroundImage: `radial-gradient(#d4d4d4 ${1.5 * zoomLevel.value}px, transparent ${1.5 * zoomLevel.value}px)`,
      backgroundSize: `${24 * zoomLevel.value}px ${24 * zoomLevel.value}px`
    }
  }
  return {}
})

// Lifecycle
const centerView = () => {
  if (canvasContainer.value) {
    const targetX = 1500 - (canvasContainer.value.clientWidth / 2)
    const targetY = 1500 - (canvasContainer.value.clientHeight / 2)
    canvasContainer.value.scrollLeft = targetX
    canvasContainer.value.scrollTop = targetY
  }
}

const isDirty = ref(false)
const isSaving = ref(false)
let saveTimeout = null
let saveVersion = 0

// Watch changes to topology to auto-save
watch(() => store.rooms, () => {
  if (store.isLoaded) {
    saveVersion++
    isDirty.value = true
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      saveChanges()
    }, 1000)
  }
}, { deep: true })

const saveChanges = async () => {
  if (!isDirty.value) return
  const versionAtStart = saveVersion
  isSaving.value = true
  await store.saveTopology()
  if (saveVersion === versionAtStart) {
    isDirty.value = false
  }
  isSaving.value = false
}

onMounted(async () => {
  if (store.role !== 'admin') router.push('/')
  
  await store.loadTopology()
  // Reset dirty flag after initial load
  setTimeout(() => isDirty.value = false, 100)
  
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('mousemove', handleMouseMove)
  
  // Attempt to center immediately and slightly after to ensure DOM is sized
  setTimeout(centerView, 0)
  setTimeout(centerView, 50)
  setTimeout(centerView, 150)
})

onUnmounted(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  if (isDirty.value) {
    store.saveTopology()
  }
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mousemove', handleMouseMove)
})

const activeRoom = computed(() => {
  const room = store.rooms.find(r => r.id === store.activeRoomId)
  if (room && !room.elements) room.elements = []
  return room
})

const selectedItem = computed(() => {
  if (!activeRoom.value || !selectedItemId.value) return null
  if (selectedItemType.value === 'table') {
    return activeRoom.value.tables.find(t => t.id === selectedItemId.value)
  } else {
    return activeRoom.value.elements.find(e => e.id === selectedItemId.value)
  }
})

const selectRoom = (roomId) => {
  store.activeRoomId = roomId
  selectedItemId.value = null
  selectedItemType.value = null
  zoomLevel.value = 1
}

const deselect = () => {
  selectedItemId.value = null
  selectedItemType.value = null
}

// Room Actions
const openRoomDialog = () => {
  newRoomName.value = ''
  isRoomDialogOpen.value = true
}

const confirmAddRoom = () => {
  if (newRoomName.value && newRoomName.value.trim() !== '') {
    const newId = crypto.randomUUID()
    store.rooms.push({ id: newId, name: newRoomName.value.trim(), tables: [], elements: [] })
    store.activeRoomId = newId
    isRoomDialogOpen.value = false
  }
}

const openDeleteRoomDialog = (roomId) => {
  roomToDeleteId.value = roomId
  isDeleteRoomDialogOpen.value = true
}

const confirmDeleteRoom = () => {
  if (roomToDeleteId.value) {
    store.rooms = store.rooms.filter(r => r.id !== roomToDeleteId.value)
    if (store.activeRoomId === roomToDeleteId.value) {
      store.activeRoomId = store.rooms.length > 0 ? store.rooms[0].id : null
      selectedItemId.value = null
      selectedItemType.value = null
    }
    isDeleteRoomDialogOpen.value = false
    roomToDeleteId.value = null
  }
}

// Item Creation Actions
const openTableDialog = () => {
  if (activeRoom.value) {
    newTableCapacity.value = 4
    isTableDialogOpen.value = true
  }
}

const confirmAddTable = () => {
  if (activeRoom.value && newTableCapacity.value > 0) {
    const centerX = canvasContainer.value ? (canvasContainer.value.scrollLeft + canvasContainer.value.clientWidth / 2) / zoomLevel.value : 1500
    const centerY = canvasContainer.value ? (canvasContainer.value.scrollTop + canvasContainer.value.clientHeight / 2) / zoomLevel.value : 1500
    
    activeRoom.value.tables.push({
      id: crypto.randomUUID(),
      number: store.tableCounter++,
      capacity: parseInt(newTableCapacity.value),
      state: 'disponible',
      x: Math.round(centerX - 40),
      y: Math.round(centerY - 40)
    })
    isTableDialogOpen.value = false
  }
}

const addElement = (type) => {
  if (activeRoom.value) {
    let w = 128, h = 16
    if (type === 'wall') { w = 256; h = 8 }
    else if (type === 'window') { w = 128; h = 12 }
    else if (type === 'door') { w = 64; h = 12 }

    const centerX = canvasContainer.value ? (canvasContainer.value.scrollLeft + canvasContainer.value.clientWidth / 2) / zoomLevel.value : 1500
    const centerY = canvasContainer.value ? (canvasContainer.value.scrollTop + canvasContainer.value.clientHeight / 2) / zoomLevel.value : 1500

    activeRoom.value.elements.push({
      id: crypto.randomUUID(),
      type: type, 
      x: Math.round(centerX - w/2),
      y: Math.round(centerY - h/2),
      width: w,
      height: h,
      rotation: 0
    })
  }
}

// Element Actions (Rotate / Resize)
const rotateElement = () => {
  if (selectedItem.value && selectedItemType.value === 'element') {
    selectedItem.value.rotation = (selectedItem.value.rotation + 90) % 360
  }
}

const expandElement = () => {
  if (selectedItem.value && selectedItemType.value === 'element') {
    const amount = 24
    selectedItem.value.width += amount
    
    // Compensate position to expand from the center regardless of rotation
    if (selectedItem.value.rotation % 180 !== 0) {
      selectedItem.value.x -= amount / 2
    } else {
      selectedItem.value.x -= amount / 2
    }
  }
}

const shrinkElement = () => {
  if (selectedItem.value && selectedItemType.value === 'element') {
    if (selectedItem.value.width <= 32) return // Prevent getting too small
    const amount = 24
    selectedItem.value.width -= amount
    
    // Compensate position to shrink towards the center regardless of rotation
    if (selectedItem.value.rotation % 180 !== 0) {
      selectedItem.value.x += amount / 2
    } else {
      selectedItem.value.x += amount / 2
    }
  }
}

// Table Edit Actions
const openEditDialog = () => {
  if (selectedItem.value && selectedItemType.value === 'table') {
    editTableData.value = {
      number: selectedItem.value.number,
      capacity: selectedItem.value.capacity
    }
    isEditDialogOpen.value = true
  }
}

const confirmEditTable = () => {
  if (selectedItem.value && selectedItemType.value === 'table' && editTableData.value.capacity > 0 && editTableData.value.number > 0) {
    selectedItem.value.number = parseInt(editTableData.value.number)
    selectedItem.value.capacity = parseInt(editTableData.value.capacity)
    isEditDialogOpen.value = false
  }
}

const duplicateItem = () => {
  if (activeRoom.value && selectedItem.value) {
    if (selectedItemType.value === 'table') {
      const newItem = {
        ...selectedItem.value,
        id: crypto.randomUUID(),
        number: store.tableCounter++,
        x: selectedItem.value.x + 40,
        y: selectedItem.value.y + 40
      }
      activeRoom.value.tables.push(newItem)
      selectedItemId.value = newItem.id
    } else {
      const newItem = {
        ...selectedItem.value,
        id: crypto.randomUUID(),
        x: selectedItem.value.x + 40,
        y: selectedItem.value.y + 40
      }
      activeRoom.value.elements.push(newItem)
      selectedItemId.value = newItem.id
    }
  }
}

const deleteItem = () => {
  if (activeRoom.value && selectedItemId.value) {
    if (selectedItemType.value === 'table') {
      activeRoom.value.tables = activeRoom.value.tables.filter(t => t.id !== selectedItemId.value)
    } else {
      activeRoom.value.elements = activeRoom.value.elements.filter(e => e.id !== selectedItemId.value)
    }
    selectedItemId.value = null
    selectedItemType.value = null
  }
}

// Drag & Drop (Items) & Panning (Map) Logic
let isDragging = false
let startX, startY, initialX, initialY

let isPanning = false
let panStartX, panStartY, scrollLeftStart, scrollTopStart

const startDrag = (e, item, type) => {
  if (e.type === 'mousedown' && e.button !== 0) return
  isDragging = true
  selectedItemId.value = item.id
  selectedItemType.value = type
  
  startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
  startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
  initialX = item.x
  initialY = item.y
  
  document.body.style.userSelect = 'none'
  if (e.type === 'touchstart') {
    window.addEventListener('touchmove', handleMouseMove, { passive: false })
    window.addEventListener('touchend', handleMouseUp)
  }
}

const startPan = (e) => {
  if (e.type === 'mousedown' && e.button !== 0) return
  isPanning = true
  panStartX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
  panStartY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
  if (canvasContainer.value) {
    scrollLeftStart = canvasContainer.value.scrollLeft
    scrollTopStart = canvasContainer.value.scrollTop
  }
  deselect()
  document.body.style.userSelect = 'none'
  if (e.type === 'touchstart') {
    window.addEventListener('touchmove', handleMouseMove, { passive: false })
    window.addEventListener('touchend', handleMouseUp)
  }
}

const handleMouseMove = (e) => {
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY

  if (isDragging && selectedItem.value) {
    if (e.cancelable) e.preventDefault()
    const dx = (clientX - startX) / zoomLevel.value
    const dy = (clientY - startY) / zoomLevel.value
    
    selectedItem.value.x = Math.max(0, initialX + dx)
    selectedItem.value.y = Math.max(0, initialY + dy)
  } else if (isPanning && canvasContainer.value) {
    const dx = clientX - panStartX
    const dy = clientY - panStartY
    
    canvasContainer.value.scrollLeft = scrollLeftStart - dx
    canvasContainer.value.scrollTop = scrollTopStart - dy
  }
}

const handleMouseUp = () => {
  if (isDragging) isDragging = false
  if (isPanning) isPanning = false
  document.body.style.userSelect = 'auto'
  window.removeEventListener('touchmove', handleMouseMove)
  window.removeEventListener('touchend', handleMouseUp)
}

</script>

<template>
  <div class="flex-1 flex flex-col w-full h-full min-h-screen bg-neutral-50 overflow-hidden">
    <NavBar roleName="Administrador" />
    <div class="flex-1 flex flex-col md:flex-row overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      
      <!-- Sidebar Salas -->
      <aside class="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-200 bg-white flex flex-col z-20 shrink-0 md:h-full max-h-[35vh] md:max-h-full">
        <div class="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 class="text-sm font-semibold tracking-tight text-neutral-900 uppercase">Salas</h2>
          <button @click="openRoomDialog" class="text-neutral-400 hover:text-neutral-900 transition-colors">
            <Plus :stroke-width="1.5" class="w-4 h-4" />
          </button>
        </div>
        <div class="p-4 flex-1 overflow-y-auto space-y-1">
          <div 
            v-for="room in store.rooms" :key="room.id"
            :class="['group relative flex items-center w-full rounded-lg text-sm font-medium transition-colors', room.id === store.activeRoomId ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100']">
            <button @click="selectRoom(room.id)" class="flex-1 text-left px-4 py-3 truncate pr-10">
              {{ room.name }}
            </button>
            <button @click.stop="openDeleteRoomDialog(room.id)" 
              class="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-rose-500/20 text-rose-400">
              <Trash2 :stroke-width="1.5" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      
      <!-- Area Principal Editor -->
      <main class="flex-1 flex flex-col bg-neutral-50/50 relative overflow-hidden">
        <template v-if="activeRoom">
          <header class="px-4 md:px-6 py-3 md:py-4 border-b border-neutral-200 bg-white flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 md:gap-0 z-20 shadow-sm shrink-0">
            <div class="flex items-center gap-3 md:gap-4 w-full md:w-auto">
              <button @click="router.push('/admin')" class="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm shrink-0">
                <ChevronLeft :stroke-width="1.5" class="w-4 h-4" />
              </button>
              <div class="flex-1 truncate">
                <h1 class="text-lg md:text-xl font-semibold tracking-tight text-neutral-900 truncate">{{ activeRoom.name }}</h1>
              </div>
            </div>
            
            <div class="flex items-center gap-3 md:gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
              <!-- Botones Elementos Arquitectónicos -->
              <div class="flex items-center gap-2 border-r border-neutral-200 pr-3 md:pr-4 shrink-0">
                <button @click="addElement('wall')" class="px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 shadow-sm flex items-center gap-1.5 shrink-0">
                  <div class="w-3 h-[3px] bg-neutral-800 rounded-sm"></div> Muro
                </button>
                <button @click="addElement('window')" class="px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 shadow-sm flex items-center gap-1.5 shrink-0">
                  <div class="w-3 h-1.5 bg-sky-200 border border-sky-400 rounded-sm"></div> Ventana
                </button>
                <button @click="addElement('door')" class="px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 shadow-sm flex items-center gap-1.5 shrink-0">
                  <div class="w-3 h-[3px] bg-amber-600 rounded-sm"></div> Puerta
                </button>
                
                <!-- Botón Ver Cuadrícula -->
                <button @click="cycleBgMode" class="px-3 py-2 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors shadow-sm flex items-center shrink-0" :title="`Fondo: ${bgMode}`">
                  <Square v-if="bgMode === 'none'" :stroke-width="1.5" class="w-4 h-4" />
                  <Grid v-else-if="bgMode === 'grid'" :stroke-width="1.5" class="w-4 h-4" />
                  <Grip v-else :stroke-width="1.5" class="w-4 h-4" />
                </button>
              </div>

              <!-- Añadir Mesa -->
              <button @click="openTableDialog" class="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm flex items-center gap-2 shrink-0">
                <Plus :stroke-width="1.5" class="w-4 h-4" /> Mesa
              </button>
            </div>
          </header>
          
          <!-- Controles de Zoom Flotantes -->
          <div class="absolute right-4 bottom-24 md:right-6 md:bottom-6 z-30 flex flex-col gap-2 bg-white p-1 rounded-xl shadow-lg border border-neutral-200">
            <button @click="zoomIn" class="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
              <ZoomIn :stroke-width="1.5" class="w-4 h-4" />
            </button>
            <div class="w-full h-px bg-neutral-100 my-0.5"></div>
            <button @click="resetZoom" class="w-8 h-8 flex items-center justify-center text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
              {{ Math.round(zoomLevel * 100) }}%
            </button>
            <div class="w-full h-px bg-neutral-100 my-0.5"></div>
            <button @click="zoomOut" class="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
              <ZoomOut :stroke-width="1.5" class="w-4 h-4" />
            </button>
          </div>

          <!-- Dropzone Container (Overflow Area for Panning) -->
          <div ref="canvasContainer" class="flex-1 relative w-full h-full overflow-auto bg-neutral-50/50 hide-scrollbar touch-none">
            
            <!-- Lienzo Escalable y Pandeable -->
            <div 
              class="absolute transition-transform duration-200 origin-top-left cursor-grab active:cursor-grabbing" 
              :style="[bgStyle, { transform: `scale(${zoomLevel})`, width: '3000px', height: '3000px' }]" 
              @mousedown.self="startPan"
              @touchstart.self="startPan">
              
              <!-- Elementos Arquitectónicos (Paredes, Ventanas, Puertas) -->
              <div 
                v-for="el in activeRoom.elements" :key="el.id"
                :class="[
                  'absolute cursor-move shadow-sm transition-shadow rounded-sm flex items-center justify-center origin-center',
                  selectedItemId === el.id ? 'ring-2 ring-blue-500 shadow-md ring-offset-2' : 'hover:ring-1 hover:ring-neutral-400 hover:shadow-md',
                  el.type === 'wall' ? 'bg-neutral-800' : 
                  el.type === 'window' ? 'bg-sky-100/80 border-2 border-sky-300 backdrop-blur-sm' : 
                  'bg-amber-600 border border-amber-800'
                ]"
                :style="{ 
                  left: el.x + 'px', top: el.y + 'px', 
                  width: el.width + 'px', height: el.height + 'px',
                  transform: `rotate(${el.rotation}deg)` 
                }" 
                @mousedown.stop="startDrag($event, el, 'element')"
                @touchstart.stop="startDrag($event, el, 'element')">
              </div>

              <!-- Mesas -->
              <div 
                v-for="table in activeRoom.tables" :key="table.id"
                :class="[
                  'absolute flex flex-col items-center justify-center w-20 h-20 bg-white rounded-xl cursor-move shadow-sm select-none transition-shadow',
                  selectedItemId === table.id && selectedItemType === 'table' ? 'ring-2 ring-blue-500 shadow-md border-transparent' : 'border border-neutral-300 hover:border-neutral-400 hover:shadow-md'
                ]"
                :style="{ left: table.x + 'px', top: table.y + 'px' }" 
                @mousedown.stop="startDrag($event, table, 'table')"
                @touchstart.stop="startDrag($event, table, 'table')">
                <span class="text-lg font-semibold tracking-tight text-neutral-800">{{ table.number }}</span>
                <span class="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{{ table.capacity }} pax</span>
              </div>
              
            </div>
          </div>

          <!-- Toolbar Flotante (Dinámico según Selección) -->
          <div v-if="selectedItem" class="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] md:w-auto bg-neutral-900 text-white p-1.5 rounded-2xl shadow-2xl flex flex-wrap justify-center md:flex-nowrap items-center gap-1 z-40 animate-[fadeIn_0.2s_ease-out]">
            <div class="px-2 md:px-4 py-2 text-xs md:text-sm font-medium text-neutral-300 capitalize shrink-0">
              {{ selectedItemType === 'table' ? `Mesa ${selectedItem.number}` : selectedItem.type === 'wall' ? 'Muro' : selectedItem.type === 'window' ? 'Ventana' : 'Puerta' }}
            </div>
            <div class="hidden md:block w-px h-5 bg-neutral-700 mx-1"></div>
            
            <!-- Controles Específicos para Elementos -->
            <template v-if="selectedItemType === 'element'">
              <button @click="rotateElement" class="px-2 md:px-3 py-2 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-white shrink-0" title="Rotar 90°">
                <RotateCw :stroke-width="1.5" class="w-4 h-4" /> <span class="hidden md:inline">Rotar</span>
              </button>
              <button @click="shrinkElement" class="px-2 md:px-3 py-2 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-white shrink-0" title="Acortar">
                <Focus :stroke-width="1.5" class="w-4 h-4" /> <span class="hidden md:inline">-</span>
              </button>
              <button @click="expandElement" class="px-2 md:px-3 py-2 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-white shrink-0" title="Alargar">
                <ArrowRightLeft :stroke-width="1.5" class="w-4 h-4" /> <span class="hidden md:inline">+</span>
              </button>
            </template>
            
            <!-- Controles Específicos para Mesas -->
            <template v-if="selectedItemType === 'table'">
              <button @click="openEditDialog" class="px-2 md:px-3 py-2 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-white shrink-0">
                <Pencil :stroke-width="1.5" class="w-4 h-4" /> <span class="hidden sm:inline">Editar</span>
              </button>
            </template>

            <div class="hidden md:block w-px h-5 bg-neutral-700 mx-1"></div>
            <button @click="duplicateItem" class="px-2 md:px-3 py-2 hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-white shrink-0" title="Duplicar">
              <Copy :stroke-width="1.5" class="w-4 h-4" /> <span class="hidden sm:inline">Duplicar</span>
            </button>
            <div class="hidden md:block w-px h-5 bg-neutral-700 mx-1"></div>
            <button @click="deleteItem" class="px-2 md:px-3 py-2 hover:bg-rose-500/20 rounded-xl transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium text-rose-400 hover:text-rose-300 shrink-0" title="Eliminar">
              <Trash2 :stroke-width="1.5" class="w-4 h-4" /> <span class="hidden sm:inline">Eliminar</span>
            </button>
          </div>

        </template>
        <template v-else>
          <div class="flex-1 flex items-center justify-center text-neutral-400 text-sm font-medium">
            Selecciona o crea una sala
          </div>
        </template>
      </main>
    </div>

    <!-- PrimeVue Dialog: Añadir Sala -->
    <Dialog v-model:visible="isRoomDialogOpen" modal header="Añadir Nueva Sala" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="flex flex-col gap-2">
          <label for="roomName" class="text-sm font-medium text-neutral-700">Nombre de la sala</label>
          <input id="roomName" v-model="newRoomName" @keyup.enter="confirmAddRoom" type="text" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all placeholder:text-neutral-400" placeholder="Ej. Terraza principal" autocomplete="off" />
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="isRoomDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
          <button @click="confirmAddRoom" :disabled="!newRoomName.trim()" class="px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">Crear Sala</button>
        </div>
      </div>
    </Dialog>

    <!-- PrimeVue Dialog: Confirmar Eliminar Sala -->
    <Dialog v-model:visible="isDeleteRoomDialogOpen" modal :closable="false" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden' }, header: { class: 'hidden' }, content: { class: 'p-0' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="p-6 flex gap-4">
        <div class="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          <AlertCircle :stroke-width="1.5" class="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h3 class="text-lg font-semibold tracking-tight text-neutral-900">Eliminar Sala</h3>
          <p class="text-sm text-neutral-500 mt-1 leading-relaxed">¿Estás seguro que deseas eliminar esta sala? Todas las mesas y elementos se borrarán permanentemente. Esta acción no se puede deshacer.</p>
        </div>
      </div>
      <div class="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
        <button @click="isDeleteRoomDialogOpen = false" class="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
        <button @click="confirmDeleteRoom" class="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm">Sí, eliminar</button>
      </div>
    </Dialog>

    <!-- PrimeVue Dialog: Añadir Mesa -->
    <Dialog v-model:visible="isTableDialogOpen" modal header="Configurar Nueva Mesa" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Capacidad de comensales</label>
          <input v-model="newTableCapacity" @keyup.enter="confirmAddTable" type="number" min="1" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" placeholder="Ej. 4" />
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="isTableDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
          <button @click="confirmAddTable" :disabled="!newTableCapacity || newTableCapacity < 1" class="px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">Añadir Mesa</button>
        </div>
      </div>
    </Dialog>

    <!-- PrimeVue Dialog: Editar Mesa -->
    <Dialog v-model:visible="isEditDialogOpen" modal header="Editar Mesa" :style="{ width: '28rem' }" :pt="{ root: { class: 'bg-white rounded-2xl shadow-xl border border-neutral-200' }, header: { class: 'p-6 pb-0' }, title: { class: 'text-xl font-semibold tracking-tight text-neutral-900' }, content: { class: 'p-6' }, mask: { class: 'bg-neutral-900/40 backdrop-blur-sm' } }">
      <div class="flex flex-col gap-4 mt-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Número de mesa</label>
          <input v-model="editTableData.number" type="number" min="1" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-neutral-700">Capacidad de comensales</label>
          <input v-model="editTableData.capacity" @keyup.enter="confirmEditTable" type="number" min="1" class="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all" />
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <button @click="isEditDialogOpen = false" class="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors">Cancelar</button>
          <button @click="confirmEditTable" :disabled="!editTableData.capacity || editTableData.capacity < 1 || !editTableData.number || editTableData.number < 1" class="px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">Guardar Cambios</button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
