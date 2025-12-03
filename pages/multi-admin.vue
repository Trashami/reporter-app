<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useFilterStore } from "~/stores/filters";
import { useUserStore } from "~/stores/user";
import { storeToRefs } from "pinia";

const userStore = useUserStore();
const { email } = storeToRefs(userStore); // if unused, feel free to delete this line

const filterStore = useFilterStore();

const selectedDepartment = computed<string | null>({
  get: () => (filterStore as any).selectedDepartment ?? null,
  set: (v: any) => ((filterStore as any).selectedDepartment = v),
});

// ---- Types ----

interface SiteOption {
  label: string;
  value: string;
}

interface DepartmentOption {
  label: string;
  value: string;
}

interface RoleOption {
  label: string;
  value: string;
}

interface SectionOption {
  label: string;
  value: string;
}

interface MultiSiteResultRow {
  site: string;
  siteLabel: string;
  exists: boolean;
  roles: string[];
  department: string;
  status: string;
  lastLogin: string;
}

interface DrupalRole {
  label?: string;
  value: string;
}

interface DrupalRolesResponse {
  roles?: DrupalRole[];
}

interface DrupalWorkbenchTerm {
  id: string;
  label?: string;
  value?: string;
}

interface DrupalWorkbenchResponse {
  terms?: DrupalWorkbenchTerm[];
  assigned?: string[];
}

interface DrupalDepartment {
  name: string;
  site: string;
}

// ---- State ----

const departmentOptions = ref<DepartmentOption[]>([]);

watch(
  () => filterStore.selectedSites,
  async (newSites: any[]) => {
    if (!newSites || !newSites.length) {
      departmentOptions.value = [];
      return;
    }

    const cleanSites = newSites.map((s: any) => s.value || s);
    const params = new URLSearchParams();

    // Add selected sites to params
    params.set("sites", JSON.stringify(cleanSites));

    if (selectedDepartment.value) {
      params.set("department", selectedDepartment.value);
    }

    const raw = await $fetch<DrupalDepartment[]>(
      `/api/drupal-departments?${params.toString()}`
    );

    departmentOptions.value = (raw || []).map((d) => ({
      label: `${d.name} (${d.site})`,
      value: d.name,
    }));
  },
  { deep: true }
);

onMounted(() => {
  // cast as any in case the store's selectedSites type is looser
  filterStore.selectedSites = [
    { label: "Main County (Training)", value: "county" },
  ] as any;
});

const siteOptions: SiteOption[] = [
  { label: "Main County (Training)", value: "county" },
  { label: "StepUpTC", value: "stepup" },
  { label: "Animal Services", value: "animal" },
  { label: "HHSA", value: "hhsa" },
];

const roleLabels: Record<string, string> = {
  administrator: "Administrator",
  content_admin: "Content Admin",
  editor: "Editor",
  reviewer: "Reviewer",
  authenticated: "Authenticated User",
  department_editor: "Department Editor",
  department_admin: "Department Admin",
  jsonapi_user: "JSON:API User",
  member: "Member",
  coroner_editor: "Coroner Editor",
};

const loading = ref(false);
const results = ref<MultiSiteResultRow[]>([]);
const drawer = ref(false);
const selectedRow = ref<MultiSiteResultRow | null>(null);
const selectedRoles = ref<string[]>([]);
const selectedSections = ref<string[]>([]);
const saving = ref(false);
const saveError = ref("");
const roleOptions = ref<RoleOption[]>([]);
const roleCache = ref<Record<string, RoleOption[]>>({});
const rolesLoading = ref(false);
const sectionOptions = ref<SectionOption[]>([]);
const sectionsLoading = ref(false);

// ---- Functions ----
async function applyFilters(): Promise<void> {
  loading.value = true;
  try {
    const cleanSites = filterStore.selectedSites.map((s: any) => s.value || s);
    const params = new URLSearchParams({
      sites: JSON.stringify(cleanSites),
      user: (filterStore.selectedUserEmail || "").trim(),
      department: (selectedDepartment.value || "").trim(),
    });

    const data = await $fetch<MultiSiteResultRow[]>(
      `/api/multi-fetch?${params.toString()}`
    );

    results.value = data || [];
  } catch (err) {
    console.error("Failed to load multi-site data", err);
    results.value = [];
  } finally {
    loading.value = false;
  }
}

async function openRoleManager(row: MultiSiteResultRow): Promise<void> {
  console.log("MANAGE CLICKED", row);
  selectedRow.value = row;
  selectedRoles.value = [...row.roles];
  selectedSections.value = [];
  saveError.value = "";
  drawer.value = true;

  await Promise.all([
    loadRolesForSite(row.site),
    loadSectionsForSite(row.site),
  ]);
}

async function loadRolesForSite(site?: string): Promise<void> {
  if (!site) {
    roleOptions.value = [];
    return;
  }

  if (roleCache.value[site]) {
    roleOptions.value = roleCache.value[site];
    return;
  }

  rolesLoading.value = true;

  try {
    const response = await $fetch<DrupalRolesResponse>(
      `/api/drupal-roles?site=${site}`
    );

    const normalized: RoleOption[] = (response?.roles || []).map((role) => ({
      label: role.label || role.value,
      value: role.value,
    }));

    roleCache.value[site] = normalized;
    roleOptions.value = normalized;
  } catch (err) {
    console.error("Failed to load roles", site, err);
    roleOptions.value = [];
  } finally {
    rolesLoading.value = false;
  }
}

async function loadSectionsForSite(site?: string): Promise<void> {
  if (!site) return;
  const email = (filterStore.selectedUserEmail || "").trim();
  if (!email) return;

  sectionsLoading.value = true;

  try {
    const response = await $fetch<DrupalWorkbenchResponse>(
      `/api/drupal-workbench?site=${site}&email=${encodeURIComponent(email)}`
    );

    sectionOptions.value = (response?.terms || []).map((term) => ({
      label: term.label || term.value || "",
      value: term.id,
    }));

    selectedSections.value = [...(response?.assigned || [])];
  } catch (err) {
    console.error("Failed to load workbench terms", err);
    sectionOptions.value = [];
  } finally {
    sectionsLoading.value = false;
  }
}

async function saveRoleChanges(): Promise<void> {
  if (!selectedRow.value) {
    saveError.value = "Select a site to manage before saving.";
    return;
  }

  const email = (filterStore.selectedUserEmail || "").trim();
  const cleanSites = filterStore.selectedSites.map((s: any) => s.value || s);
  const targetSites = selectedRow.value.site
    ? [selectedRow.value.site]
    : cleanSites;

  saving.value = true;
  saveError.value = "";

  try {
    await $fetch("/api/multi-update-roles", {
      method: "POST",
      body: {
        email,
        sites: targetSites,
        roles: [...selectedRoles.value],
        sections: [...selectedSections.value],
      },
    });

    drawer.value = false;
    await applyFilters();
  } catch (err: any) {
    saveError.value = err?.data?.error || err?.message || "Unknown error";
  } finally {
    saving.value = false;
  }
}

function exportCsv(): void {
  const header = [
    "Site",
    "User",
    "Roles",
    "Department",
    "Status",
    "Last Login",
  ];

  const rows = results.value.map((r) => [
    r.siteLabel,
    filterStore.selectedUserEmail,
    r.roles.join("; "),
    r.department,
    r.status,
    r.lastLogin,
  ]);

  const csv = header.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "user-sites-report.csv";
  link.click();
}
</script>

<template>
  <v-container class="py-8">
    <v-select
      v-model="filterStore.selectedSites"
      :items="siteOptions"
      item-title="label"
      item-value="value"
      chips
      multiple
    />
    <v-select
      v-model="selectedDepartment"
      :items="departmentOptions"
      item-title="label"
      item-value="value"
      label="Filter by Department"
      clearable
      class="mb-4"
    />

    <v-text-field
      v-model="filterStore.selectedUserEmail"
      label="Search User (email)"
      clearable
      class="mb-4"
    />

    <v-btn color="#124216" class="text-white mb-6" @click="applyFilters">
      Apply Filters
    </v-btn>

    <v-btn color="blue" class="text-white mb-6" @click="exportCsv">
      Export CSV
    </v-btn>

    <v-progress-linear
      v-if="loading"
      indeterminate
      color="#124216"
      class="mb-3"
    />

    <v-data-table
      v-if="results.length"
      :headers="[
        { title: 'Site', key: 'siteLabel' },
        { title: 'User Exists', key: 'exists' },
        { title: 'Roles', key: 'roles' },
        { title: 'Department', key: 'department' },
        { title: 'Status', key: 'status' },
        { title: 'Last Login', key: 'lastLogin' },
        { title: 'Actions', key: 'actions' },
      ]"
      :items="results"
    >
      <template #item.roles="{ item }">
        <span v-if="item.roles.length === 0">—</span>
        <v-chip
          v-for="r in item.roles"
          :key="r"
          size="small"
          color="#124216"
          variant="flat"
          class="ma-1"
          text-color="white"
        >
          {{ roleLabels[r] || r }}
        </v-chip>
      </template>

      <template #item.actions="{ item }">
        <v-btn
          size="small"
          variant="text"
          color="#124216"
          @click="openRoleManager(item)"
        >
          Manage
        </v-btn>
      </template>
    </v-data-table>

    <!-- ⚡ MANAGEMENT DRAWER -->
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      temporary
      width="420"
    >
      <v-container>
        <h3 class="text-h6 font-weight-bold mb-4">
          Manage User — {{ filterStore.selectedUserEmail }}
        </h3>

        <v-select
          v-model="selectedRoles"
          :items="roleOptions"
          item-title="label"
          item-value="value"
          label="Roles"
          multiple
          chips
          clearable
          :loading="rolesLoading"
          class="mb-4"
        />

        <v-select
          v-model="selectedSections"
          :items="sectionOptions"
          item-title="label"
          item-value="value"
          label="Workbench Sections"
          multiple
          clearable
          :loading="sectionsLoading"
          class="mb-4"
        />

        <v-btn
          color="#124216"
          class="text-white"
          :loading="saving"
          block
          @click="saveRoleChanges"
        >
          Save Changes
        </v-btn>

        <p v-if="saveError" class="text-red mt-2">{{ saveError }}</p>
      </v-container>
    </v-navigation-drawer>
  </v-container>
</template>
