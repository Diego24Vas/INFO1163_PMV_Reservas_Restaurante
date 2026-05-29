<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store'
import NavBar from '../components/NavBar.vue'
import { Map, Users, Settings2, History } from 'lucide-vue-next'

const router = useRouter()

onMounted(() => {
  if (store.role !== 'admin') router.push('/')
})

const goToEditor = () => router.push('/admin/editor')
const goToStaff = () => router.push('/admin/staff')
const goToOperation = () => router.push('/admin/operation')
const goToHistory = () => router.push('/admin/history')
</script>

<template>
  <div class="flex-1 flex flex-col w-full h-full min-h-screen bg-neutral-50">
    <NavBar roleName="Administrador" />
    <main class="flex-1 max-w-6xl w-full mx-auto p-8 flex flex-col animate-[fadeIn_0.2s_ease-out]">
      <header class="mb-10">
        <h1 class="text-3xl font-semibold tracking-tight text-neutral-900">Panel de Administración</h1>
        <p class="text-sm text-neutral-500 mt-2 font-medium">Gestiona la configuración global del restaurante.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Tarjeta: Editor de Topología -->
        <button @click="goToEditor" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col">
          <div class="h-10 w-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mb-4 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
            <Map :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Editor de Topología</h2>
          <p class="text-xs text-neutral-500 mt-1 leading-relaxed">Configura salas, añade mesas y diseña el mapa visual interactivo del local.</p>
        </button>

        <!-- Tarjeta: Gestión de Personal -->
        <button @click="goToStaff" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col">
          <div class="h-10 w-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mb-4 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
            <Users :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Gestión de Personal</h2>
          <p class="text-xs text-neutral-500 mt-1 leading-relaxed">Administra los accesos de los meseros al sistema y sus identificadores.</p>
        </button>

        <!-- Tarjeta: Operación y Supervisión -->
        <button @click="goToOperation" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col">
          <div class="h-10 w-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mb-4 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
            <Settings2 :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Supervisión Operativa</h2>
          <p class="text-xs text-neutral-500 mt-1 leading-relaxed">Monitoriza en tiempo real el estado de las mesas, reasigna camareros o fuerza estados.</p>
        </button>
        
        <!-- Tarjeta: Historial General -->
        <button @click="goToHistory" class="group text-left bg-white border border-neutral-200 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all cursor-pointer flex flex-col">
          <div class="h-10 w-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mb-4 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
            <History :stroke-width="1.5" class="w-5 h-5" />
          </div>
          <h2 class="text-lg font-semibold tracking-tight text-neutral-900">Historial Global</h2>
          <p class="text-xs text-neutral-500 mt-1 leading-relaxed">Revisa y filtra los registros de actividad de todos los camareros del restaurante.</p>
        </button>
      </div>
    </main>
  </div>
</template>
