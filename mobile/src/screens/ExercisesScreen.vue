<script setup>
// Справочник упражнений: переименование, шаг веса, удаление.
// Переименование безопасно: программа ссылается на упражнение по id,
// а в журнале хранится снимок старого названия.
import { ref, computed } from 'vue'
import { state, usageInProgram, addExerciseToCatalog } from '../store.js'
import NumberStepper from '../components/NumberStepper.vue'

const emit = defineEmits(['back'])

const sorted = computed(() => [...state.exercises].sort((a, b) => a.name.localeCompare(b.name, 'ru')))

// Раскрытое упражнение (одно за раз, чтобы список был компактным).
const openId = ref(null)
const newName = ref('')

function toggle(id) {
  openId.value = openId.value === id ? null : id
}

function add() {
  const name = newName.value.trim()
  if (!name) return
  if (state.exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    alert('Такое упражнение уже есть')
    return
  }
  openId.value = addExerciseToCatalog(name).id
  newName.value = ''
}

// Пустое название не даём сохранить — вернём прежнее при уходе из поля.
function rename(exercise, value) {
  if (value.trim()) exercise.name = value.trim()
}

// Свой шаг веса: включаем/выключаем. null — используется общий шаг.
function toggleOwnStep(exercise) {
  exercise.weightStep = exercise.weightStep ? null : state.settings.weightStep
}

function remove(exercise) {
  const used = usageInProgram(exercise.id)
  if (used > 0) {
    alert(`«${exercise.name}» есть в программе (${used} раз). Сначала уберите его из тренировок.`)
    return
  }
  if (!confirm(`Удалить «${exercise.name}» из справочника? Записанная история сохранится.`)) return
  state.exercises.splice(state.exercises.indexOf(exercise), 1)
}
</script>

<template>
  <main class="screen">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title">Упражнения</h1>
    </header>

    <section class="card">
      <NumberStepper v-model="state.settings.weightStep" label="Шаг веса кнопками ± (по умолчанию), кг" :step="0.5" :min="0.5" small />
    </section>

    <section class="card">
      <template v-for="ex in sorted" :key="ex.id">
        <button class="list-item" @click="toggle(ex.id)">
          <span>{{ ex.name }}</span>
          <span class="muted small">
            <template v-if="ex.weightStep">шаг {{ ex.weightStep }} · </template>в плане: {{ usageInProgram(ex.id) }}
          </span>
        </button>

        <div v-if="openId === ex.id" class="editor-block">
          <input
            class="input"
            :value="ex.name"
            aria-label="Название"
            @change="rename(ex, $event.target.value)"
            @blur="$event.target.value = ex.name"
          />
          <label class="row">
            <input type="checkbox" class="checkbox" :checked="!!ex.weightStep" @change="toggleOwnStep(ex)" />
            Свой шаг веса (гантели, тренажёры)
          </label>
          <NumberStepper v-if="ex.weightStep" v-model="ex.weightStep" label="Шаг, кг" :step="0.5" :min="0.5" small />
          <button class="btn btn--danger" @click="remove(ex)">Удалить из справочника</button>
        </div>
      </template>
    </section>

    <section class="card">
      <div class="row">
        <input v-model="newName" class="input" placeholder="Новое упражнение" @keyup.enter="add" />
        <button class="btn" @click="add">Добавить</button>
      </div>
    </section>
  </main>
</template>
