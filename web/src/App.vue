<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { store } from './store'

onMounted(() => {
  store.loadStaff()
  store.loadHistory()
})
</script>

<template>
  <RouterView />
</template>
