<script setup>
import { ref, computed } from 'vue'
import { findSession, deleteSession } from '../store.js'
import { createSessionExercise, workoutCode } from '@shared/schema.js'
import NumberStepper from '../components/NumberStepper.vue'
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
const usedIds = computed(() => session.value.exercises.map((e) => e.exerciseId))

function addExercise(exercise) {
  // planned = null: упражнение вне плана.
  session.value.exercises.push(createSessionExercise(exercise, null))
  adding.value = false
}

function removeExercise(index) {
  const ex = session.value.exercises[index]
  if (ex.sets.length && !confirm(`Убрать «${ex.exerciseName}» вместе с подходами?`)) return
  session.value.exercises.splice(index, 1)
}

function removeSession() {
  if (!confirm('Удалить эту тренировку целиком?')) return
  deleteSession(props.sessionId)
  emit('back')
}
</script>

<template>
  <main v-if="session" class="screen">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title">{{ title }}</h1>
    </header>

    <div class="card row row--between">
      <label class="field">
        <span class="label">Дата</span>
        <input v-model="session.date" type="date" class="input" />
      </label>
      <NumberStepper v-model="session.cycle" label="Цикл" :min="1" small />
    </div>

    <ExerciseCard
      v-for="(item, i) in session.exercises"
      :key="item.id"
      :session="session"
      :item="item"
      @remove="removeExercise(i)"
    />

    <ExercisePicker
      v-if="adding"
      title="Упражнение вне плана"
      :exclude="usedIds"
      @pick="addExercise"
      @cancel="adding = false"
    />
    <button v-else class="btn btn--big" @click="adding = true">+ Упражнение вне плана</button>

    <button class="btn btn--danger" @click="removeSession">Удалить тренировку</button>
  </main>
</template>
