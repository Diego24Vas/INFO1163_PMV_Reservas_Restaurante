<script setup>
import { useRouter } from 'vue-router'
import { store } from '../store'
import { UtensilsCrossed, LogOut } from 'lucide-vue-next'

const props = defineProps({
  roleName: {
    type: String,
    required: true
  }
})

const router = useRouter()

const logout = () => {
  store.role = null
  router.push('/')
}
</script>

<template>
  <nav class="border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-sm">
        <UtensilsCrossed :stroke-width="1.5" class="w-4 h-4" />
      </div>
      <span class="font-medium tracking-tight text-neutral-900">
        Reservas <span class="text-neutral-400 font-normal ml-1">/ {{ roleName }}</span>
      </span>
    </div>
    <button @click="logout" class="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2">
      <LogOut :stroke-width="1.5" class="w-4 h-4" />
      Salir
    </button>
  </nav>
</template>
