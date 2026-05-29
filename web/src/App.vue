<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { store } from './store'

onMounted(() => {
  store.loadTopology()
  store.loadStaff()
  store.loadHistory()
})
</script>

<template>
  <RouterView />
</template>
