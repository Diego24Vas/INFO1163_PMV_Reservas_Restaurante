<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store'
import { AuthService } from '../service/auth'
import { UtensilsCrossed, User, Lock, Check, Shield, AlertCircle } from 'lucide-vue-next'

const router = useRouter()
const identifier = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const email = identifier.value.trim()

    const { sessionData, roleName, perfil } = await AuthService.login(email, password.value)

    if (sessionData.user) {
      store.activeTable = null
      
      if (roleName === 'Administrador') {
        store.role = 'admin'
        store.activeWaiterId = null
        router.push('/admin')
      } 
      else if (roleName === 'Camarero') {
        store.role = 'waiter'
        store.activeWaiterId = sessionData.user.id
        store.activeWaiterName = `${perfil.nombre} ${perfil.apellidos}` 
        
        router.push('/waiter')
      } 
      else {
        await AuthService.logout()
        errorMessage.value = 'Tu rol no tiene acceso a esta aplicación.'
      }
    }

  } catch (error) {
    console.error('Error de autenticación:', error.message)
    errorMessage.value = error.message || 'Credenciales inválidas. Por favor, intente nuevamente.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="flex-1 flex flex-col items-center justify-center p-4 min-h-screen animate-[fadeIn_0.3s_ease-out]">
    <div class="w-full max-w-[380px] bg-white border border-neutral-200 rounded-2xl p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
      
      <div class="flex flex-col items-center mb-8">
        <div class="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center mb-5 shadow-sm">
          <UtensilsCrossed :stroke-width="1.5" class="w-6 h-6" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">Acceso al Sistema</h1>
        <p class="text-sm text-neutral-500 mt-2 text-center">Ingresa tus credenciales operativas</p>
      </div>

      <div v-if="errorMessage" class="mb-6 p-3 flex items-start gap-2.5 text-rose-600 bg-rose-50 border border-rose-100 rounded-lg animate-[fadeIn_0.2s_ease-out]">
        <AlertCircle :stroke-width="1.5" class="w-4 h-4 shrink-0 mt-0.5" />
        <p class="text-sm font-medium">{{ errorMessage }}</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        
        <div class="space-y-1.5">
          <label for="identifier" class="block text-sm font-medium text-neutral-700">Correo Electrónico</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <User :stroke-width="1.5" class="w-4 h-4" />
            </div>
            <input v-model="identifier" type="email" id="identifier" name="identifier" placeholder="example@correo.com" required class="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed" :disabled="isLoading">
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="password" class="block text-sm font-medium text-neutral-700">Contraseña</label>
          </div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Lock :stroke-width="1.5" class="w-4 h-4" />
            </div>
            <input v-model="password" type="password" id="password" name="password" placeholder="••••••••" required class="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed" :disabled="isLoading">
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 pb-2">
          <label class="flex items-center gap-2 cursor-pointer group">
            <div class="relative flex items-center justify-center">
              <input v-model="rememberMe" type="checkbox" class="peer appearance-none w-4 h-4 border border-neutral-300 rounded bg-white checked:bg-neutral-900 checked:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" :disabled="isLoading">
              <Check :stroke-width="3" class="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
            <span class="text-sm font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors">Recordar acceso</span>
          </label>
          <a href="#" class="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">¿Olvidó su clave?</a>
        </div>

        <button type="submit" class="w-full flex justify-center items-center py-2.5 px-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed" :disabled="isLoading">
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? 'Verificando...' : 'Iniciar sesión' }}
        </button>
      </form>

      <div class="mt-8 pt-5 border-t border-neutral-100">
        <div class="flex items-start gap-2.5 text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
          <Shield :stroke-width="1.5" class="w-4 h-4 shrink-0 mt-0.5 text-neutral-400" />
          <p class="text-xs font-medium leading-relaxed">
            Sistema de uso exclusivo para el personal autorizado. El sistema registrará los intentos de acceso.
          </p>
        </div>
      </div>
    </div>
  </main>
</template>
