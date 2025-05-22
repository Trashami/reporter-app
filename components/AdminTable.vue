<template>
  <v-container>
    <h2 class="text-h5 font-weight-bold mb-4 text-[#124216]">Submitted Reports</h2>

    <!-- Table -->
    <v-data-table :headers="headers" :items="items" item-value="id" class="elevation-2 rounded border"
      :items-per-page="5" hide-default-footer @click:row="(_, row) => handleRowClick(row.item)" />

    <v-dialog v-model="showModal" max-width="600px">
      <v-card class="pa-4" style="border-radius: 0;">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="mb-6 text-h6">Report Details</span>
          <v-btn variant="flat" class="close-btn" @click="showModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <!-- Form Fields -->
        <v-card-text v-if="selectedItem" class="pt-0">
          <v-text-field label="Report Title" v-model="selectedItem.name" />
          <v-text-field label="Type" v-model="selectedItem.type" />
          <v-text-field label="Submitted By" v-model="selectedItem.submittedBy" />
          <v-text-field label="Date" v-model="selectedItem.date" />
        </v-card-text>

        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn @click="showModal = false" color="#124216" variant="flat" class="text-white px-6 no-rounded"
            style="border-radius: 0; text-transform: uppercase;" rounded="0">
            Close
          </v-btn>

        </v-card-actions>
      </v-card>
    </v-dialog>


  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import data from '@/data/sample-data.json'

const headers = [
  { title: 'Id', key: 'id' },
  { title: 'Name', key: 'name' },
  { title: 'Type', key: 'type' },
  { title: 'Submitted By', key: 'submittedBy' },
  { title: 'Date', key: 'date' }
]


const items = ref([])
const showModal = ref(false)
const selectedItem = ref(null)

onMounted(() => {
  items.value = data
})

const handleRowClick = (item) => {
  console.log('Selected Item:', item)
  selectedItem.value = { ...item }
  showModal.value = true
}



</script>
<style scoped>
.admin-table {
  font-size: 0.85rem;
  border: 1px solid #ddd;
  background-color: #fff;
}

.admin-table thead {
  background-color: #f9f9f9;
}

::v-deep(.v-data-table .v-data-table__tr:hover) {
  background-color: #f0fdf4 !important;
  cursor: pointer;
}

.close-btn {
  min-width: 48px;
  padding: 4px;
  border-radius: 0 !important;
  background-color: transparent !important;
  color: #124216 !important;
  box-shadow: none !important;
}

.close-btn:hover {
  background-color: #f0f0f0 !important;
}

.close-icon-btn {
  margin-top: -8px;
  margin-right: -8px;
}
</style>
