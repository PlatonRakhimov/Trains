<script setup>
// План одной тренировки: упражнения, подходы, повторы, вес, заметка.
import { ref, computed } from 'vue'
import { state, findWorkout, moveItem, weightStepFor } from '../store.js'
import { createPlanItem, weekLabel, workoutCode } from '@shared/schema.js'
import NumberStepper from '../components/NumberStepper.vue'
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
  // Новое упражнение получает подходы и повторы как у предыдущего — обычно они похожи.
  const last = workout.value.items[workout.value.items.length - 1]
  workout.value.items.push(
    createPlanItem(exercise.id, last ? { sets: last.sets, reps: last.reps } : undefined),
  )
  adding.value = false
}

function removeItem(index) {
  if (confirm(`Убрать «${exerciseName(workout.value.items[index].exerciseId)}» из плана?`)) {
    workout.value.items.splice(index, 1)
  }
}

// ---------- Плановый вес ----------
// Вес необязательный: пустое поле = null («вес не задан»).

function weightText(item) {
  return item.weight == null ? '' : String(item.weight)
}

function setWeight(item, text) {
  const s = text.trim().replace(',', '.')
  if (s === '') {
    item.weight = null
    return
  }
  const n = Number(s)
  if (Number.isFinite(n) && n >= 0) item.weight = n
}

function stepWeight(item, delta) {
  const next = Math.round(((item.weight ?? 0) + delta) * 100) / 100
  item.weight = next > 0 ? next : null
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

      <div class="input-grid">
        <NumberStepper v-model="item.sets" label="Подходы" :min="1" small />
        <NumberStepper v-model="item.reps" label="Повторы" :min="1" small />
      </div>

      <!-- Вес — отдельно: он может быть пустым, а степпер всегда показывает число. -->
      <div class="stepper stepper--small">
        <span class="stepper__label">Плановый вес, кг (необязательно)</span>
        <div class="stepper__row">
          <button type="button" class="stepper__btn" aria-label="Меньше" @click="stepWeight(item, -weightStepFor(item.exerciseId))">−</button>
          <input
            class="stepper__input stepper__input--wide"
            type="text"
            inputmode="decimal"
            placeholder="—"
            :value="weightText(item)"
            @input="setWeight(item, $event.target.value)"
            @blur="$event.target.value = weightText(item)"
          />
          <button type="button" class="stepper__btn" aria-label="Больше" @click="stepWeight(item, weightStepFor(item.exerciseId))">+</button>
        </div>
      </div>

      <input v-model="item.note" class="input" placeholder="Заметка (например, «пауза внизу»)" />
    </section>

    <p v-if="workout.items.length === 0" class="muted hint">В тренировке пока нет упражнений.</p>

    <ExercisePicker v-if="adding" @pick="addItem" @cancel="adding = false" />
    <button v-else class="btn btn--big" @click="adding = true">+ Упражнение</button>
  </main>
</template>
