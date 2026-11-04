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
  // Упражнение внутри тренировки: { exerciseId, exerciseName, planned, note, sets }
  item: { type: Object, required: true },
})
const emit = defineEmits(['remove'])

const step = computed(() => weightStepFor(props.item.exerciseId))

// ---------- План и прошлый раз ----------

const planText = computed(() => {
  const p = props.item.planned
  if (!p) return 'вне плана'
  return `${p.sets}×${p.reps}` + (p.weight ? ` · ${p.weight} кг` : '')
})

// Это же упражнение в этой же тренировке прошлого цикла.
const previous = computed(() => {
  const s = previousSameWorkout(state.sessions, props.session, props.session.id)
  const ex = s?.exercises.find((e) => e.exerciseId === props.item.exerciseId && e.sets.length > 0)
  return ex ? { session: s, exercise: ex } : null
})

const workCount = computed(() => props.item.sets.filter(isWorkSet).length)

// ---------- Ввод подхода ----------

// С какого веса предложить начать.
function suggestedWeight() {
  const own = props.item.sets.filter(isWorkSet)
  if (own.length) return own[own.length - 1].weight
  const prevWork = previous.value?.exercise.sets.filter(isWorkSet)
  if (prevWork?.length) return prevWork[0].weight
  const lastWork = lastSetsOfExercise(state.sessions, props.item.exerciseId, props.session.id)?.filter(isWorkSet)
  if (lastWork?.length) return lastWork[0].weight
  if (props.item.planned?.weight) return props.item.planned.weight
  return props.item.sets[props.item.sets.length - 1]?.weight ?? 0
}

function suggestedReps() {
  return props.item.planned?.reps ?? props.item.sets[props.item.sets.length - 1]?.reps ?? 10
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
  if (i !== -1) props.item.sets.splice(i, 1)
  editingId.value = null
}
</script>

<template>
  <section class="card exercise">
    <header class="exercise__head">
      <div>
        <h2 class="card__title">{{ item.exerciseName }}</h2>
        <p class="muted">
          План: {{ planText }}
          <template v-if="item.planned?.note"> · {{ item.planned.note }}</template>
        </p>
      </div>
      <span class="counter" :class="{ 'counter--done': item.planned && workCount >= item.planned.sets }">
        {{ workCount }}<template v-if="item.planned">/{{ item.planned.sets }}</template>
      </span>
    </header>

    <p class="previous">
      <template v-if="previous">
        Прошлый цикл ({{ previous.session.cycle }}, {{ formatDateRu(previous.session.date) }}):
        <strong>{{ formatSets(previous.exercise.sets) || '—' }}</strong>
        <template v-if="previous.exercise.note"> · {{ previous.exercise.note }}</template>
      </template>
      <template v-else>В прошлом цикле не делали</template>
    </p>

    <!-- Записанные подходы. Тап — редактировать. -->
    <div v-if="item.sets.length" class="sets">
      <button
        v-for="(set, i) in item.sets"
        :key="set.id"
        class="set"
        :class="{ 'set--warmup': set.warmup, 'set--editing': set.id === editingId }"
        @click="startEdit(set)"
      >
        <span class="set__no">{{ set.warmup ? 'Р' : i + 1 }}</span>
        {{ set.weight }}×{{ set.reps }}
        <span v-if="set.flag" class="set__flag" :class="set.flag === '+' ? 'flag--easy' : 'flag--hard'">{{ set.flag }}</span>
      </button>
    </div>

    <p v-if="editing" class="editing-hint">Правка подхода — изменения сохраняются сразу</p>

    <div class="input-grid">
      <NumberStepper v-model="target.weight" label="Вес, кг" :step="step" />
      <NumberStepper v-model="target.reps" label="Повторы" />
    </div>

    <div class="chips">
      <button class="chip" :class="{ 'chip--easy': target.flag === '+' }" @click="toggleFlag('+')">+ легко</button>
      <button class="chip" :class="{ 'chip--hard': target.flag === '!' }" @click="toggleFlag('!')">! тяжело</button>
      <button class="chip" :class="{ 'chip--active': target.warmup }" @click="target.warmup = !target.warmup">
        разминка
      </button>
    </div>

    <template v-if="editing">
      <input v-model="editing.note" class="input" placeholder="Заметка к подходу" />
      <div class="row">
        <button class="btn btn--danger" @click="deleteSet">Удалить подход</button>
        <button class="btn btn--primary" @click="editingId = null">Готово</button>
      </div>
    </template>
    <button v-else class="btn btn--primary btn--big" @click="addSet">+ Подход</button>

    <div class="row">
      <input v-model="item.note" class="input" placeholder="Заметка к упражнению" />
      <button class="btn btn--icon" aria-label="Убрать упражнение" title="Убрать упражнение" @click="emit('remove')">✕</button>
    </div>
  </section>
</template>
