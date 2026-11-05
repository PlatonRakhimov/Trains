<script setup>
// Редактор программы: недели и тренировки в них.
// Изменения сразу сохраняются и НЕ трогают уже записанные тренировки:
// в журнале хранится снимок упражнений на момент записи.
import { computed, ref } from 'vue'
import { state, moveItem } from '../store.js'
import { createWeek, createWorkout, newId, weekLabel, workoutLabel } from '@shared/schema.js'

const emit = defineEmits(['back', 'edit-workout', 'exercises'])

const menuWeekId = ref(null)
const programMenuOpen = ref(false)

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

// Короткое описание тренировки: первые упражнения через запятую.
function workoutSummary(workout) {
  if (workout.items.length === 0) return 'пусто'
  const names = workout.items.slice(0, 3).map((item) => exerciseName(item.exerciseId))
  const more = workout.items.length > 3 ? ` и ещё ${workout.items.length - 3}` : ''
  return names.join(', ') + more
}
</script>

<template>
  <main class="screen" @click="menuWeekId = null; programMenuOpen = false" @keydown.esc="menuWeekId = null; programMenuOpen = false">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title grow">Программа</h1>
      <div class="workout-menu" @click.stop>
        <button class="workout-menu__toggle" aria-label="Действия с программой" :aria-expanded="programMenuOpen" aria-controls="program-actions" @click="programMenuOpen = !programMenuOpen; menuWeekId = null">⋮</button>
        <div v-if="programMenuOpen" id="program-actions" class="workout-menu__panel">
          <button class="workout-menu__action" @click="addWeek(); programMenuOpen = false">Добавить неделю</button>
        </div>
      </div>
    </header>

    <p class="muted hint">
      Цикл из {{ weeks.length }} нед. повторяется по кругу. Изменения сохраняются сразу и не меняют записанные
      тренировки.
    </p>

    <section v-for="(week, w) in weeks" :key="week.id" class="program-week">
      <div class="row">
        <input v-model="week.name" class="program-week__name" :placeholder="`Неделя ${w + 1}`" aria-label="Название недели" />
        <div class="workout-menu" @click.stop>
          <button class="workout-menu__toggle" :aria-label="`Действия с неделей ${w + 1}`" :aria-expanded="menuWeekId === week.id" :aria-controls="`week-actions-${week.id}`" @click="menuWeekId = menuWeekId === week.id ? null : week.id; programMenuOpen = false">⋮</button>
          <div v-if="menuWeekId === week.id" :id="`week-actions-${week.id}`" class="workout-menu__panel">
            <button class="workout-menu__action" @click="menuWeekId = null; addWorkout(week)">Добавить тренировку</button>
            <button class="workout-menu__action" :disabled="w === 0" @click="moveItem(weeks, w, -1); menuWeekId = null">Переместить выше</button>
            <button class="workout-menu__action" :disabled="w === weeks.length - 1" @click="moveItem(weeks, w, 1); menuWeekId = null">Переместить ниже</button>
            <button class="workout-menu__action" @click="duplicateWeek(w); menuWeekId = null">Копировать неделю</button>
            <button class="workout-menu__action workout-menu__action--danger" @click="removeWeek(w); menuWeekId = null">Удалить неделю</button>
          </div>
        </div>
      </div>

      <div
        v-for="(workout, d) in week.workouts"
        :key="workout.id"
        class="row program-week__day"
        :class="{ 'program-week__day--no-divider': w < weeks.length - 1 && d === week.workouts.length - 1 }"
      >
        <button class="list-item list-item--grow" @click="emit('edit-workout', workout.id)">
          <span>
            <strong>{{ workoutLabel(workout, d) }}</strong>
            <br />
            <span class="muted small">{{ workoutSummary(workout) }}</span>
          </span>
          <span class="muted">›</span>
        </button>
      </div>

    </section>

    <button class="btn btn--primary program-exercises" @click="emit('exercises')">Справочник упражнений</button>
  </main>
</template>
