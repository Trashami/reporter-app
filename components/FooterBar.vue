<template>
  <v-footer class="pa-6 text-[#FBBC34]" style="
    position: relative;
    overflow: hidden;
    background-image: url('https://tc-web.widen.net/content/uzssta9red/jpeg/footer-image.jpeg');
    background-size: cover;
    background-position: center;
    min-height: 100px;
  ">

    <v-container class="position-relative">
      <v-row>
        <v-col cols="12" md="6" class="d-flex flex-wrap ga-4 align-center">
          <a href="#" class="footer-link">Accessibility</a>
          <span>|</span>
          <a href="#" class="footer-link">Compliance</a>
          <span>|</span>
          <a href="#" class="footer-link">Privacy Policy</a>
        </v-col>
        <v-col cols="12" md="6" class="d-flex justify-end align-center">
          <a href="/" class="footer-link me-4">Home</a>
        </v-col>
      </v-row>

      <img
        src="http://county.dev-tcweb.acsitefactory.com/sites/g/files/lwldkp151/files/2025-03/county-of-tulare-footer-illustration_0.png"
        alt="County of Tulare Seal" style="
          position: absolute;
          bottom: -175px;
          right: -50px;
          max-width: 320px;
          height: auto;
          z-index: 0;
        " class="d-none d-md-block" />
    </v-container>
  </v-footer>
</template>

<style scoped>
.footer-link {
  color: #fbbc34;
  text-decoration: none;
  font-size: 0.9rem;
  z-index: 1;
  position: relative;
}

.footer-link:hover {
  text-decoration: underline;
}
</style>
