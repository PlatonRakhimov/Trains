<script setup>
// Список упражнений одной тренировки.
import { ref, computed } from 'vue'
import { state, findWorkout, moveItem } from '../store.js'
import { createWorkoutItem, weekLabel, workoutCode } from '@shared/schema.js'
import ExercisePicker from '../components/ExercisePicker.vue'

const props = defineProps({ workoutId: { type: String, required: true } })
const emit = defineEmits(['back'])

const found = computed(() => findWorkout(props.workoutId))
const workout = computed(() => found.value?.workout)

const title = computed(() => {
  const { week, weekIndex, dayIndex } = found.value
  return `${workoutCode(weekIndex + 1, dayIndex + 1)} · ${weekLabel(week, weekIndex)}`
})

const exerciseName = (id) => state.exercises.find((e) => e.id === id)?.name ?? '(удалено из справочника)'

// ---------- Добавление ----------
const adding = ref(false)

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
  <main v-if="workout" class="screen">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title">{{ title }}</h1>
    </header>

    <label class="card field">
      <span class="label">Название тренировки (необязательно)</span>
      <input v-model="workout.name" class="input" :placeholder="`День ${found.dayIndex + 1}`" />
    </label>

    <section v-for="(item, i) in workout.items" :key="item.id" class="card">
      <div class="row row--top">
        <h2 class="card__title grow">{{ i + 1 }}. {{ exerciseName(item.exerciseId) }}</h2>
        <div class="order-btns">
          <button class="btn btn--mini" :disabled="i === 0" aria-label="Выше" @click="moveItem(workout.items, i, -1)">↑</button>
          <button
            class="btn btn--mini"
            :disabled="i === workout.items.length - 1"
            aria-label="Ниже"
            @click="moveItem(workout.items, i, 1)"
          >↓</button>
        </div>
        <button class="btn btn--icon" aria-label="Убрать упражнение" @click="removeItem(i)">✕</button>
      </div>
    </section>

    <p v-if="workout.items.length === 0" class="muted hint">В тренировке пока нет упражнений.</p>

    <ExercisePicker v-if="adding" @pick="addItem" @cancel="adding = false" />
    <button v-else class="btn btn--big" @click="adding = true">+ Упражнение</button>
  </main>
</template>
