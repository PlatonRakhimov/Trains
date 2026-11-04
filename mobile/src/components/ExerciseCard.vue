<script setup>
import { ref, reactive, computed } from 'vue'
import { state, weightStepFor } from '../store.js'
import { createSet } from '@shared/schema.js'
import { formatSets, isWorkSet } from '@shared/calc.js'
import { previousSameWorkout, lastSetsOfExercise } from '@shared/order.js'
import { formatDateRu } from '@shared/date.js'
import NumberStepper from './NumberStepper.vue'

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
  // Упражнение внутри тренировки: { exerciseId, exerciseName, note, sets }
  item: { type: Object, required: true },
})
const emit = defineEmits(['remove', 'toggle', 'delete-set'])

const step = computed(() => weightStepFor(props.item.exerciseId))

// Это же упражнение в этой же тренировке прошлого цикла.
const previous = computed(() => {
  const s = previousSameWorkout(state.sessions, props.session, props.session.id)
  const ex = s?.exercises.find((e) => e.exerciseId === props.item.exerciseId && e.sets.length > 0)
  return ex ? { session: s, exercise: ex } : null
})

// ---------- Ввод подхода ----------

// С какого веса предложить начать.
function suggestedWeight() {
  const own = props.item.sets.filter(isWorkSet)
  if (own.length) return own[own.length - 1].weight
  const prevWork = previous.value?.exercise.sets.filter(isWorkSet)
  if (prevWork?.length) return prevWork[0].weight
  const lastWork = lastSetsOfExercise(state.sessions, props.item.exerciseId, props.session.id)?.filter(isWorkSet)
  if (lastWork?.length) return lastWork[0].weight
  return props.item.sets[props.item.sets.length - 1]?.weight ?? 0
}

function suggestedReps() {
  return props.item.sets[props.item.sets.length - 1]?.reps ?? previous.value?.exercise.sets.filter(isWorkSet)[0]?.reps ?? 10
}

// Черновик нового подхода. Отдельно от записанных подходов, пока не нажали «+ Подход».
const draft = reactive({ weight: suggestedWeight(), reps: suggestedReps(), flag: '', warmup: false, note: '' })

// id подхода, который сейчас редактируем (null — вводим новый).
const editingId = ref(null)
const editing = computed(() => props.item.sets.find((s) => s.id === editingId.value) ?? null)

// Степперы и кнопки привязаны либо к черновику, либо прямо к записанному подходу.
// Во втором случае изменения сохраняются мгновенно — как и всё остальное.
const target = computed(() => editing.value ?? draft)

function addSet() {
  props.item.sets.push(createSet({ ...draft }))
  // Вес и повторы оставляем — следующий подход обычно такой же. Пометку сбрасываем.
  draft.flag = ''
  draft.note = ''
  navigator.vibrate?.(30) // короткая вибрация: подход записан
}

function toggleFlag(flag) {
  target.value.flag = target.value.flag === flag ? '' : flag
}

function startEdit(set) {
  editingId.value = editingId.value === set.id ? null : set.id
}

function deleteSet() {
  const i = props.item.sets.findIndex((s) => s.id === editingId.value)
  if (i !== -1) emit('delete-set', props.item.sets[i].id)
  editingId.value = null
}
</script>

<template>
  <section class="exercise" :class="{ 'exercise--active': active, 'exercise--recorded': item.sets.length > 0 }">
    <header class="exercise__head">
      <h2 class="exercise__heading">
        <button
          class="exercise__toggle"
          :aria-expanded="active"
          :aria-controls="`exercise-body-${item.id}`"
          @click="emit('toggle')"
        >
          <span aria-hidden="true">{{ active ? '▾' : '▸' }}</span>
          <span class="exercise__name">{{ item.exerciseName }}</span>
          <span
            v-if="previous"
            class="exercise__previous"
            :title="`Прошлый цикл (${previous.session.cycle}, ${formatDateRu(previous.session.date)}): ${formatSets(previous.exercise.sets, '×') || '—'}`"
          >прошлый: {{ formatSets(previous.exercise.sets, '×') || '—' }}</span>
        </button>
      </h2>
    </header>

    <!-- Скрываем без размонтирования, чтобы сохранять незаписанный ввод. -->
    <div v-show="active" :id="`exercise-body-${item.id}`" class="exercise__body">
      <!-- Записанные подходы. Тап — редактировать. -->
      <div v-if="item.sets.length" class="sets">
        <button
          v-for="(set, i) in item.sets"
          :key="set.id"
          class="set"
          :class="{ 'set--warmup': set.warmup, 'set--editing': set.id === editingId }"
          :aria-label="`Подход ${i + 1}: ${set.weight} кг, ${set.reps} повторов${set.warmup ? ', разминка' : ''}`"
          :aria-pressed="set.id === editingId"
          @click="startEdit(set)"
        >
          <span v-if="set.warmup" class="set__no">Р</span>
          {{ set.weight }}×{{ set.reps }}
          <span v-if="set.flag" class="set__flag" :class="set.flag === '+' ? 'flag--easy' : 'flag--hard'">{{ set.flag }}</span>
        </button>
      </div>

      <p v-if="editing" class="editing-hint">Правка подхода — изменения сохраняются сразу</p>

      <div class="input-grid exercise-inputs">
        <NumberStepper v-model="target.weight" label="Вес, кг" :step="step" />
        <NumberStepper v-model="target.reps" label="Повторы" />
      </div>

      <details class="exercise-options">
        <summary class="exercise-options__toggle">Пометки и заметки</summary>
        <div class="exercise-options__body">
          <p v-if="previous?.exercise.note" class="muted small">Заметка прошлого цикла: {{ previous.exercise.note }}</p>
          <div class="chips">
            <button class="chip" :class="{ 'chip--easy': target.flag === '+' }" @click="toggleFlag('+')">+ легко</button>
            <button class="chip" :class="{ 'chip--hard': target.flag === '!' }" @click="toggleFlag('!')">! тяжело</button>
            <button class="chip" :class="{ 'chip--active': target.warmup }" @click="target.warmup = !target.warmup">
              разминка
            </button>
          </div>
          <label class="field">
            <span class="label">Заметка к подходу</span>
            <input v-model="target.note" class="input" placeholder="Заметка к подходу" />
          </label>
          <label class="field">
            <span class="label">Заметка к упражнению</span>
            <input v-model="item.note" class="input" placeholder="Заметка к упражнению" />
          </label>
          <button class="exercise-remove" @click="emit('remove')">Убрать упражнение</button>
        </div>
      </details>

      <template v-if="editing">
        <div class="row">
          <button class="btn btn--danger" @click="deleteSet">Удалить подход</button>
          <button class="btn btn--primary" @click="editingId = null">Готово</button>
        </div>
      </template>
      <button v-else class="add-set" @click="addSet">Подход</button>

    </div>
  </section>
</template>
