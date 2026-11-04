<script setup>
// Выбор упражнения из справочника с поиском. Если такого нет — можно сразу создать.
import { ref, computed } from 'vue'
import { state, addExerciseToCatalog } from '../store.js'

const props = defineProps({
  title: { type: String, default: 'Добавить упражнение' },
  // id упражнений, которые не показывать (например, уже добавленные в тренировку)
  exclude: { type: Array, default: () => [] },
})
const emit = defineEmits(['pick', 'cancel'])

const query = ref('')

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  const hidden = new Set(props.exclude)
  return state.exercises
    .filter((e) => !hidden.has(e.id) && e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

// Кнопку «Создать» показываем, только если точно такого названия ещё нет.
const canCreate = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q && !state.exercises.some((e) => e.name.toLowerCase() === q)
})

function create() {
  emit('pick', addExerciseToCatalog(query.value))
  query.value = ''
}

function pick(exercise) {
  emit('pick', exercise)
  query.value = ''
}
</script>

<template>
  <section class="card">
    <h2 class="card__title">{{ title }}</h2>
    <input v-model="query" class="input" placeholder="Найти или ввести новое" autofocus />
    <button v-if="canCreate" class="list-item" @click="create">
      <strong>+ Создать «{{ query.trim() }}»</strong>
    </button>
    <div class="picker__list">
      <button v-for="ex in matches" :key="ex.id" class="list-item" @click="pick(ex)">
        {{ ex.name }}
      </button>
    </div>
    <button class="btn" @click="emit('cancel')">Отмена</button>
  </section>
</template>
