import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../config/supabase'

import RoleSelection from '../views/RoleSelection.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AdminEditor from '../views/AdminEditor.vue'
import AdminStaff from '../views/AdminStaff.vue'
import AdminOperation from '../views/AdminOperation.vue'
import AdminHistory from '../views/AdminHistory.vue'
import WaiterDashboard from '../views/WaiterDashboard.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'role-selection',
      component: RoleSelection,
      meta: { requiresGuest: true }
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true, role: 'Administrador' }
    },
    {
      path: '/admin/editor',
      name: 'admin-editor',
      component: AdminEditor,
      meta: { requiresAuth: true, role: 'Administrador' }
    },
    {
      path: '/admin/staff',
      name: 'admin-staff',
      component: AdminStaff,
      meta: { requiresAuth: true, role: 'Administrador' }
    },
    {
      path: '/admin/operation',
      name: 'admin-operation',
      component: AdminOperation,
      meta: { requiresAuth: true, role: 'Administrador' }
    },
    {
      path: '/admin/history',
      name: 'admin-history',
      component: AdminHistory,
      meta: { requiresAuth: true, role: 'Administrador' }
    },
    {
      path: '/waiter',
      name: 'waiter-dashboard',
      component: WaiterDashboard,
      meta: { requiresAuth: true, role: 'Camarero' }
    }
  ]
})

// === NAVIGATION GUARD DE SEGURIDAD ===
router.beforeEach(async (to, from, next) => {
  const { data: { user } } = await supabase.auth.getUser()

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)

  if (requiresAuth && !user) {
    return next({ name: 'role-selection' })
  }

  if (user) {
    const { data: perfilData } = await supabase
      .from('perfiles')
      .select('roles!inner(nombre)')
      .eq('id', user.id)
      .single()

    const userRole = perfilData?.roles?.nombre

    if (requiresGuest) {
      if (userRole === 'Administrador') return next('/admin')
      if (userRole === 'Camarero') return next('/waiter')
    }

    if (requiresAuth && to.meta.role) {
      if (to.meta.role === 'Administrador' && userRole !== 'Administrador') {
        return next('/waiter')
      }
      
      if (to.meta.role === 'Camarero' && userRole !== 'Camarero') {
        return next('/admin')
      }
    }
  }

  next()
})

export default router
