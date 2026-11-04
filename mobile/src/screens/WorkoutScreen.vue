<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { findSession, deleteSession } from '../store.js'
import { createSessionExercise, workoutCode } from '@shared/schema.js'
import ExerciseCard from '../components/ExerciseCard.vue'
import ExercisePicker from '../components/ExercisePicker.vue'

const props = defineProps({ sessionId: { type: String, required: true } })
const emit = defineEmits(['back'])

// Берём тренировку прямо из общего состояния: любые изменения в ней сразу сохраняются.
const session = computed(() => findSession(props.sessionId))

const title = computed(() => {
  const s = session.value
  return [workoutCode(s.weekNo, s.dayNo), s.weekName, s.workoutName].filter(Boolean).join(' · ')
})

// ---------- Разовое упражнение ----------
const adding = ref(false)
const menuOpen = ref(false)
// Одновременно раскрыто только выбранное упражнение.
const activeExerciseId = ref(null)
const usedIds = computed(() => session.value.exercises.map((e) => e.exerciseId))

function showExercisePicker() {
  menuOpen.value = false
  adding.value = true
}

function addExercise(exercise) {
  const item = createSessionExercise(exercise)
  session.value.exercises.push(item)
  activeExerciseId.value = item.id
  adding.value = false
}

function removeExercise(index) {
  const ex = session.value.exercises[index]
  if (ex.sets.length && !confirm(`Убрать «${ex.exerciseName}» вместе с подходами?`)) return
  session.value.exercises.splice(index, 1)
  if (activeExerciseId.value === ex.id) activeExerciseId.value = null
}

// Отмена доступна и после сворачивания упражнения. Быстрые удаления отменяем вместе.
const removedSets = ref([])
let undoTimer

function deleteSet(item, setId) {
  const index = item.sets.findIndex((set) => set.id === setId)
  if (index === -1) return
  const [set] = item.sets.splice(index, 1)
  removedSets.value.push({ exerciseId: item.id, index, set })
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => { removedSets.value = [] }, 2000)
}

function undoDelete() {
  clearTimeout(undoTimer)
  // Обратный порядок возвращает подходы на исходные позиции даже при нескольких удалениях.
  for (const removed of [...removedSets.value].reverse()) {
    const item = session.value?.exercises.find((ex) => ex.id === removed.exerciseId)
    if (item) item.sets.splice(removed.index, 0, removed.set)
  }
  removedSets.value = []
}

onBeforeUnmount(() => clearTimeout(undoTimer))

function removeSession() {
  menuOpen.value = false
  if (!confirm('Удалить данные о тренировке вместе со всеми записанными подходами?')) return
  deleteSession(props.sessionId)
  emit('back')
}
</script>

<template>
  <main v-if="session" class="screen" @click="menuOpen = false" @keydown.esc="menuOpen = false">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title grow">{{ title }}</h1>
      <div class="workout-menu" @click.stop>
        <button
          class="workout-menu__toggle"
          aria-label="Действия с тренировкой"
          :aria-expanded="menuOpen"
          aria-controls="workout-actions"
          @click="menuOpen = !menuOpen"
        >⋮</button>
        <div v-if="menuOpen" id="workout-actions" class="workout-menu__panel">
          <button class="workout-menu__action" @click="showExercisePicker">Добавить упражнение</button>
          <button class="workout-menu__action workout-menu__action--danger" @click="removeSession">Удалить данные о тренировке</button>
        </div>
      </div>
    </header>

    <div class="workout-meta row row--between">
      <label class="field">
        <span class="label">Дата</span>
        <input v-model="session.date" type="date" class="workout-date" />
      </label>
      <span class="muted">Цикл {{ session.cycle }}</span>
    </div>

    <div class="exercise-list">
      <ExerciseCard
        v-for="(item, i) in session.exercises"
        :key="item.id"
        :session="session"
        :item="item"
        :active="activeExerciseId === item.id"
        @toggle="activeExerciseId = activeExerciseId === item.id ? null : item.id"
        @remove="removeExercise(i)"
        @delete-set="(setId) => deleteSet(item, setId)"
      />
    </div>

    <ExercisePicker
      v-if="adding"
      title="Упражнение"
      :exclude="usedIds"
      @pick="addExercise"
      @cancel="adding = false"
    />

    <div v-if="removedSets.length" class="undo-toast">
      <span role="status">{{ removedSets.length === 1 ? 'Подход удалён' : 'Подходы удалены' }}</span>
      <button @click="undoDelete">Вернуть</button>
    </div>
  </main>
</template>
