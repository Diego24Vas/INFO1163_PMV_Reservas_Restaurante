import { createRouter, createWebHistory } from 'vue-router'
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
      component: RoleSelection
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboard
    },
    {
      path: '/admin/editor',
      name: 'admin-editor',
      component: AdminEditor
    },
    {
      path: '/admin/staff',
      name: 'admin-staff',
      component: AdminStaff
    },
    {
      path: '/admin/operation',
      name: 'admin-operation',
      component: AdminOperation
    },
    {
      path: '/admin/history',
      name: 'admin-history',
      component: AdminHistory
    },
    {
      path: '/waiter',
      name: 'waiter-dashboard',
      component: WaiterDashboard
    }
  ]
})

export default router
