<script setup>
// Редактор программы: недели и тренировки в них.
// Изменения сразу сохраняются и НЕ трогают уже записанные тренировки:
// в журнале хранится снимок упражнений на момент записи.
import { computed } from 'vue'
import { state, moveItem } from '../store.js'
import { createWeek, createWorkout, newId, weekLabel, workoutLabel, workoutCode } from '@shared/schema.js'

const emit = defineEmits(['back', 'edit-workout', 'exercises'])

const weeks = computed(() => state.program.weeks)

const exerciseName = (id) => state.exercises.find((e) => e.id === id)?.name ?? '(удалено)'

function addWeek() {
  weeks.value.push(createWeek(weeks.value.length))
}

// Копия недели с новыми id — удобно, когда недели содержат похожие упражнения.
function duplicateWeek(index) {
  const source = weeks.value[index]
  const copy = {
    ...createWeek(weeks.value.length),
    name: source.name ? `${source.name} (копия)` : '',
    workouts: source.workouts.map((wo) => ({
      ...wo,
      id: newId('wo'),
      items: wo.items.map((item) => ({ ...item, id: newId('it') })),
    })),
  }
  weeks.value.splice(index + 1, 0, copy)
}

function removeWeek(index) {
  const week = weeks.value[index]
  const text = week.workouts.length
    ? `Удалить «${weekLabel(week, index)}» и ${week.workouts.length} тренировок в ней? Записанная история не пострадает.`
    : `Удалить «${weekLabel(week, index)}»?`
  if (confirm(text)) weeks.value.splice(index, 1)
}

function addWorkout(week) {
  const workout = createWorkout()
  week.workouts.push(workout)
  emit('edit-workout', workout.id)
}

function removeWorkout(week, index) {
  if (confirm(`Удалить «${workoutLabel(week.workouts[index], index)}»? Записанная история не пострадает.`)) {
    week.workouts.splice(index, 1)
  }
}

// Короткое описание тренировки: первые упражнения через запятую.
function workoutSummary(workout) {
  if (workout.items.length === 0) return 'пусто'
  const names = workout.items.slice(0, 3).map((item) => exerciseName(item.exerciseId))
  const more = workout.items.length > 3 ? ` и ещё ${workout.items.length - 3}` : ''
  return names.join(', ') + more
}
</script>

<template>
  <main class="screen">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title">Программа</h1>
    </header>

    <p class="muted hint">
      Цикл из {{ weeks.length }} нед. повторяется по кругу. Изменения сохраняются сразу и не меняют записанные
      тренировки.
    </p>

    <section v-for="(week, w) in weeks" :key="week.id" class="card">
      <div class="row">
        <span class="badge">Н{{ w + 1 }}</span>
        <input v-model="week.name" class="input" :placeholder="`Неделя ${w + 1}`" aria-label="Название недели" />
      </div>

      <div v-for="(workout, d) in week.workouts" :key="workout.id" class="row">
        <button class="list-item list-item--grow" @click="emit('edit-workout', workout.id)">
          <span>
            <strong>{{ workoutCode(w + 1, d + 1) }} · {{ workoutLabel(workout, d) }}</strong>
            <br />
            <span class="muted small">{{ workoutSummary(workout) }}</span>
          </span>
          <span class="muted">›</span>
        </button>
        <div class="order-btns">
          <button class="btn btn--mini" :disabled="d === 0" aria-label="Выше" @click="moveItem(week.workouts, d, -1)">↑</button>
          <button
            class="btn btn--mini"
            :disabled="d === week.workouts.length - 1"
            aria-label="Ниже"
            @click="moveItem(week.workouts, d, 1)"
          >↓</button>
        </div>
        <button class="btn btn--icon" aria-label="Удалить тренировку" @click="removeWorkout(week, d)">✕</button>
      </div>

      <button class="btn" @click="addWorkout(week)">+ Тренировка</button>

      <div class="row toolbar">
        <button class="btn btn--small" :disabled="w === 0" @click="moveItem(weeks, w, -1)">↑ Неделю выше</button>
        <button class="btn btn--small" :disabled="w === weeks.length - 1" @click="moveItem(weeks, w, 1)">↓ Ниже</button>
        <button class="btn btn--small" @click="duplicateWeek(w)">Копия</button>
        <button class="btn btn--small btn--danger" @click="removeWeek(w)">Удалить</button>
      </div>
    </section>

    <button class="btn btn--big" @click="addWeek">+ Неделя</button>
    <button class="btn" @click="emit('exercises')">Справочник упражнений</button>
  </main>
</template>
