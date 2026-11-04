<script setup>
import { ref, onMounted } from 'vue'
import { state, loadState, findSession, findWorkout, removeIfEmpty } from './store.js'
import HomeScreen from './screens/HomeScreen.vue'
import WorkoutScreen from './screens/WorkoutScreen.vue'
import ProgramScreen from './screens/ProgramScreen.vue'
import WorkoutEditorScreen from './screens/WorkoutEditorScreen.vue'
import ExercisesScreen from './screens/ExercisesScreen.vue'
import DataScreen from './screens/DataScreen.vue'

// Простая «навигация» без библиотек. Текущий экран — обычный объект:
//   { name: 'home' }
//   { name: 'workout', sessionId }        — запись тренировки в зале
//   { name: 'program' }                   — редактор программы
//   { name: 'workoutEditor', workoutId }  — план одной тренировки
//   { name: 'exercises' }                 — справочник упражнений
//   { name: 'data' }                      — экспорт и восстановление
const HOME = { name: 'home' }
const screen = ref(HOME)
const loadError = ref('')

// Каждый переход добавляем в историю браузера.
// Тогда системная кнопка «Назад» на Android возвращает на предыдущий экран, а не закрывает приложение.
function go(next) {
  screen.value = next
  history.pushState({ screen: next }, '')
}

function back() {
  history.back() // дальше сработает обработчик popstate
}

window.addEventListener('popstate', (event) => {
  if (screen.value.name === 'workout') removeIfEmpty(screen.value.sessionId)
  screen.value = validScreen(event.state?.screen)
})

// Экран из истории может ссылаться на то, чего уже нет (тренировку удалили) — тогда на главный.
function validScreen(s) {
  if (!s) return HOME
  if (s.name === 'workout' && !findSession(s.sessionId)) return HOME
  if (s.name === 'workoutEditor' && !findWorkout(s.workoutId)) return { name: 'program' }
  return s
}

onMounted(async () => {
  try {
    await loadState()
  } catch (err) {
    loadError.value = 'Не удалось открыть хранилище: ' + (err?.message || err)
    return
  }
  // Страницу перезагрузили — возвращаемся на тот же экран.
  screen.value = validScreen(history.state?.screen)
})
</script>

<template>
  <p v-if="loadError" class="banner banner--error">{{ loadError }}</p>
  <p v-else-if="!state.loaded" class="loading">Загрузка…</p>
  <template v-else>
    <p v-if="state.saveError" class="banner banner--error">{{ state.saveError }}</p>

    <WorkoutScreen v-if="screen.name === 'workout'" :session-id="screen.sessionId" @back="back" />
    <ProgramScreen
      v-else-if="screen.name === 'program'"
      @back="back"
      @edit-workout="(workoutId) => go({ name: 'workoutEditor', workoutId })"
      @exercises="go({ name: 'exercises' })"
    />
    <WorkoutEditorScreen v-else-if="screen.name === 'workoutEditor'" :workout-id="screen.workoutId" @back="back" />
    <ExercisesScreen v-else-if="screen.name === 'exercises'" @back="back" />
    <DataScreen v-else-if="screen.name === 'data'" @back="back" />
    <HomeScreen
      v-else
      @open="(sessionId) => go({ name: 'workout', sessionId })"
      @program="go({ name: 'program' })"
      @data="go({ name: 'data' })"
    />
  </template>
</template>
