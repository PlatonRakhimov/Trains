<script setup>
// Список упражнений одной тренировки.
import { ref, computed } from 'vue'
import { state, findWorkout } from '../store.js'
import { createWorkoutItem, weekLabel, workoutLabel } from '@shared/schema.js'
import ExercisePicker from '../components/ExercisePicker.vue'

const props = defineProps({ workoutId: { type: String, required: true } })
const emit = defineEmits(['back'])

const found = computed(() => findWorkout(props.workoutId))
const workout = computed(() => found.value?.workout)

const title = computed(() => {
  const { week, weekIndex, dayIndex } = found.value
  return `${weekLabel(week, weekIndex)}, день ${dayIndex + 1}`
})

const exerciseName = (id) => state.exercises.find((e) => e.id === id)?.name ?? '(удалено из справочника)'

// ---------- Добавление ----------
const adding = ref(false)
const menuOpen = ref(false)
const renaming = ref(false)
const nameDraft = ref('')

function renameWorkout() {
  nameDraft.value = workout.value.name
  renaming.value = true
  menuOpen.value = false
}

function saveName() {
  workout.value.name = nameDraft.value.trim()
  renaming.value = false
}

function deleteWorkout() {
  menuOpen.value = false
  if (confirm(`Удалить «${workoutLabel(workout.value, found.value.dayIndex)}»? Записанная история не пострадает.`)) {
    const { week, dayIndex } = found.value
    week.workouts.splice(dayIndex, 1)
    emit('back')
  }
}

function addItem(exercise) {
  workout.value.items.push(createWorkoutItem(exercise.id))
  adding.value = false
}

function removeItem(index) {
  if (confirm(`Убрать «${exerciseName(workout.value.items[index].exerciseId)}» из тренировки?`)) {
    workout.value.items.splice(index, 1)
  }
}
</script>

<template>
  <main v-if="workout" class="screen" @click="menuOpen = false" @keydown.esc="menuOpen = false">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title grow">{{ title }}</h1>
      <div class="workout-menu" @click.stop>
        <button class="workout-menu__toggle" aria-label="Действия с днём" :aria-expanded="menuOpen" aria-controls="day-actions" @click="menuOpen = !menuOpen">⋮</button>
        <div v-if="menuOpen" id="day-actions" class="workout-menu__panel">
          <button class="workout-menu__action" @click="adding = true; menuOpen = false">Добавить упражнение</button>
          <button class="workout-menu__action" @click="renameWorkout">Изменить название дня</button>
          <button class="workout-menu__action workout-menu__action--danger" @click="deleteWorkout">Удалить день</button>
        </div>
      </div>
    </header>

    <form v-if="renaming" class="field day-editor__rename" @submit.prevent="saveName">
      <label class="label" for="day-name">Название дня</label>
      <input id="day-name" v-model="nameDraft" class="program-week__name" :placeholder="`День ${found.dayIndex + 1}`" />
      <div class="row">
        <button type="submit" class="btn btn--primary">Сохранить</button>
        <button type="button" class="btn" @click="renaming = false">Отмена</button>
      </div>
    </form>

    <section v-if="workout.items.length" class="exercise-list" aria-label="Упражнения дня">
      <div v-for="(item, i) in workout.items" :key="item.id" class="row day-editor__exercise">
        <span class="day-editor__number muted">{{ i + 1 }}</span>
        <h2 class="day-editor__name grow">{{ exerciseName(item.exerciseId) }}</h2>
        <button class="day-editor__remove" :aria-label="`Убрать ${exerciseName(item.exerciseId)}`" @click="removeItem(i)">✕</button>
      </div>
    </section>

    <p v-if="workout.items.length === 0" class="muted hint">В тренировке пока нет упражнений.</p>

    <ExercisePicker v-if="adding" @pick="addItem" @cancel="adding = false" />
  </main>
</template>
