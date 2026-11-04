<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { parseWorkoutsCSV } from '@shared/csv.js'
import { filterRows } from '@shared/analysis.js'
import { formatDateRu, toISODate } from '@shared/date.js'
import { loadSavedFile, saveFile, forgetFile, loadPref, savePref } from './storage.js'
import ExerciseView from './views/ExerciseView.vue'
import WorkoutView from './views/WorkoutView.vue'
import ProblemsView from './views/ProblemsView.vue'

// ---------- Файл ----------

const rows = ref([]) // все подходы из файла
const file = ref(null) // { name, loadedAt }
const error = ref('')
const notSaved = ref(false) // не влез в localStorage — после перезагрузки придётся выбрать снова
const fileInput = ref(null)

function openText(name, text, loadedAt = new Date().toISOString()) {
  rows.value = parseWorkoutsCSV(text) // бросит ошибку, если файл не наш
  file.value = { name, loadedAt }
  error.value = ''
}

async function loadFile(f) {
  if (!f) return
  try {
    const text = await f.text()
    openText(f.name, text)
    notSaved.value = !saveFile(f.name, text)
  } catch (err) {
    error.value = `«${f.name}»: ${err.message}`
  }
}

function onFileChosen(event) {
  loadFile(event.target.files?.[0])
  event.target.value = ''
}

function closeFile() {
  forgetFile()
  rows.value = []
  file.value = null
}

// Перетаскивание файла в любое место окна.
const dragging = ref(false)
function onDragOver(e) {
  if (!e.dataTransfer?.types?.includes('Files')) return
  e.preventDefault() // без этого браузер не даст «бросить» файл
  dragging.value = true
}
function onDragLeave(e) {
  // relatedTarget == null — курсор ушёл за пределы окна.
  if (!e.relatedTarget) dragging.value = false
}
function onDrop(e) {
  e.preventDefault()
  dragging.value = false
  loadFile(e.dataTransfer.files?.[0])
}

onMounted(() => {
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
  const saved = loadSavedFile()
  if (saved) {
    try {
      openText(saved.name, saved.text, saved.loadedAt)
    } catch {
      forgetFile()
    }
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
})

// ---------- Фильтры ----------

const filters = ref(loadPref('filters', { dateFrom: '', dateTo: '', cycleFrom: null, cycleTo: null }))
watch(filters, (v) => savePref('filters', v), { deep: true })

// Пустое поле числа даёт '' — превращаем в null («без ограничения»).
const num = (v) => (v === '' || v == null ? null : Number(v))

const filtered = computed(() =>
  filterRows(rows.value, {
    dateFrom: filters.value.dateFrom || null,
    dateTo: filters.value.dateTo || null,
    cycleFrom: num(filters.value.cycleFrom),
    cycleTo: num(filters.value.cycleTo),
  }),
)

const hasFilters = computed(() => Object.values(filters.value).some((v) => v !== '' && v != null))

function resetFilters() {
  filters.value = { dateFrom: '', dateTo: '', cycleFrom: null, cycleTo: null }
}

const summary = computed(() => {
  const dates = rows.value.map((r) => r.date).sort()
  const cycles = rows.value.map((r) => r.cycle).filter((c) => c != null)
  return {
    sets: rows.value.length,
    from: dates[0],
    to: dates[dates.length - 1],
    maxCycle: cycles.length ? Math.max(...cycles) : null,
  }
})

// ---------- Вкладки ----------

const TABS = [
  { id: 'exercise', label: 'По упражнению' },
  { id: 'workout', label: 'По тренировке' },
  { id: 'problems', label: 'Сводка / проблемы' },
]
const tab = ref(loadPref('tab', 'exercise'))
watch(tab, (v) => savePref('tab', v))

// Выбранное упражнение живёт здесь, чтобы «Сводка» могла открыть его графики.
const exerciseId = ref(loadPref('exerciseId', ''))
const position = ref(loadPref('position', ''))
watch(exerciseId, (v) => savePref('exerciseId', v))
watch(position, (v) => savePref('position', v))

function openExercise(id, pos) {
  exerciseId.value = id
  position.value = pos
  tab.value = 'exercise'
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1 class="title">Тренировки — анализ</h1>
      <div v-if="file" class="file-info">
        <span>
          <b>{{ file.name }}</b>
          <span class="muted"> · загружен {{ formatDateRu(toISODate(new Date(file.loadedAt)), true) }} · {{ summary.sets }} подходов</span>
        </span>
        <button class="btn" @click="fileInput.click()">Загрузить новый</button>
        <button class="btn btn--ghost" title="Забыть файл" @click="closeFile">Закрыть</button>
      </div>
      <input ref="fileInput" type="file" accept=".csv,text/csv" hidden @change="onFileChosen" />
    </header>

    <p v-if="error" class="alert">{{ error }}</p>
    <p v-if="notSaved" class="alert alert--soft">
      Файл слишком большой, чтобы запомнить его в браузере, — после перезагрузки его нужно будет выбрать снова.
    </p>

    <!-- Нет файла: большая зона загрузки -->
    <section v-if="!file" class="dropzone" :class="{ 'dropzone--active': dragging }">
      <p class="dropzone__big">Перетащите сюда файл <b>workouts_….csv</b></p>
      <p class="muted">или</p>
      <button class="btn btn--primary" @click="fileInput.click()">Выбрать файл</button>
      <p class="muted small">Файл никуда не отправляется — всё считается прямо в браузере.</p>
    </section>

    <template v-else>
      <!-- Фильтры — одной строкой над всеми экранами -->
      <div class="filters">
        <label class="field field--inline">
          <span class="label">Даты</span>
          <input v-model="filters.dateFrom" type="date" class="select" :min="summary.from" :max="summary.to" />
          <span class="muted">—</span>
          <input v-model="filters.dateTo" type="date" class="select" :min="summary.from" :max="summary.to" />
        </label>
        <label class="field field--inline">
          <span class="label">Циклы</span>
          <input v-model.number="filters.cycleFrom" type="number" min="1" :max="summary.maxCycle" class="select select--narrow" placeholder="с" />
          <span class="muted">—</span>
          <input v-model.number="filters.cycleTo" type="number" min="1" :max="summary.maxCycle" class="select select--narrow" placeholder="по" />
        </label>
        <button v-if="hasFilters" class="btn btn--ghost" @click="resetFilters">Сбросить</button>
        <span class="muted small filters__info">
          {{ formatDateRu(summary.from, true) }} — {{ formatDateRu(summary.to, true) }}, циклов: {{ summary.maxCycle ?? '—' }}
          <template v-if="hasFilters"> · в фильтре {{ filtered.length }} подходов</template>
        </span>
      </div>

      <nav class="tabs">
        <button v-for="t in TABS" :key="t.id" class="tab" :class="{ 'tab--active': tab === t.id }" @click="tab = t.id">
          {{ t.label }}
        </button>
      </nav>

      <p v-if="filtered.length === 0" class="empty">В выбранном диапазоне нет подходов.</p>
      <ExerciseView v-else-if="tab === 'exercise'" v-model:exercise-id="exerciseId" v-model:position="position" :rows="filtered" />
      <WorkoutView v-else-if="tab === 'workout'" :rows="filtered" />
      <ProblemsView v-else :rows="filtered" @open-exercise="openExercise" />
    </template>

    <!-- Подсказка поверх страницы, когда файл тащат над окном -->
    <div v-if="dragging && file" class="drop-overlay">Отпустите, чтобы загрузить файл</div>
  </div>
</template>
