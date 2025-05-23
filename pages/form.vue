<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="6">
        <v-card elevation="2" class="pa-6" rounded="0">
          <h2 class="text-h5 text-center font-weight-bold mb-6">
            Reporter Form
          </h2>

          <v-form v-model="formValid" @submit.prevent="submitForm">
            <v-select
              v-model="form.condition"
              :items="['Pothole', 'Sinkhole', 'Crack', 'Other']"
              label="Hazard Type"
              :rules="[v => !!v || 'Select a condition']"
              required
              rounded="0"
            />

            <v-text-field
              v-model="form.location"
              label="Location"
              :rules="[v => !!v || 'Location is required']"
              required
              rounded="0"
            />

            <v-textarea
              v-model="form.notes"
              label="Description"
              rows="3"
              rounded="0"
            />

            <v-file-input
              v-model="form.photo"
              label="Upload a Photo (optional)"
              accept="image/*"
              show-size
              rounded="0"
            />

            <v-btn
              type="submit"
              color="green-darken-4"
              class="mt-6 float-right"
              :disabled="!formValid"
              rounded="0"
            >
              Submit Report
            </v-btn>
          </v-form>

          <v-alert v-if="responseMessage" type="success" class="mt-4" rounded="0">
            {{ responseMessage }}
          </v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const formValid = ref(false)

const form = ref({
  name: '',
  location: '',
  condition: '',
  notes: '',
  photo: null,
})

const responseMessage = ref('')

const submitForm = async () => {
  const payload = {
    ...form.value,
    photo: form.value.photo?.name || null,
  }

  try {
    const res = await axios.post('/api/submit', payload)
    responseMessage.value = 'Thank you! Your report has been submitted.'
    console.log('Fake API response:', res.data)
  } catch (error) {
    console.error('Submission failed:', error)
    responseMessage.value = 'Submission failed. Please try again.'
  }
}
</script>
