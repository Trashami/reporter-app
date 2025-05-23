<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(async () => {
  const [{ default: esriConfig }, { default: Map }, { default: MapView }] = await Promise.all([
    import('@arcgis/core/config'),
    import('@arcgis/core/Map'),
    import('@arcgis/core/views/MapView')
  ])

  esriConfig.assetsPath = '/arcgis/assets'

  const map = new Map({
    basemap: 'topo-vector'
  })

  new MapView({
    container: 'map-container', 
    map,
    center: [-119.7, 36.3],
    zoom: 9
  })
})
</script>

<template>
    <div id="map-container" />
</template>

<style scoped>
@import "@arcgis/core/assets/esri/themes/dark/main.css";

#map-container {
  height: 90vh;
  width: 90vw;
}
</style>
