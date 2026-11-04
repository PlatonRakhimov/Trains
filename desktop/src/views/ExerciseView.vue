<script setup>
// Экран «По упражнению»: графики веса, 1ПМ и объёма + таблица истории.
import { computed, watch } from 'vue'
import { exerciseList, exerciseHistory, groupEntries } from '@shared/analysis.js'
import { formatSets, round1, formatNumber } from '@shared/calc.js'
import { workoutCode } from '@shared/schema.js'
import { formatDateRu } from '@shared/date.js'
import LineChart from '../components/LineChart.vue'

const props = defineProps({ rows: { type: Array, required: true } })

// Выбор хранится в App (v-model), чтобы переход со «Сводки» мог открыть нужное упражнение.
const exerciseId = defineModel('exerciseId', { type: String, default: '' })
// '' — сквозь все тренировки, иначе код позиции вида "1|1" (неделя|день).
const position = defineModel('position', { type: String, default: '' })

const exercises = computed(() => exerciseList(props.rows))

// Если выбранного упражнения нет в данных (новый файл, фильтр) — берём первое.
watch(
  exercises,
  (list) => {
    if (!list.some((e) => e.id === exerciseId.value)) exerciseId.value = list[0]?.id ?? ''
  },
  { immediate: true },
)

// В каких тренировках программы встречалось упражнение.
const positions = computed(() => {
  const set = new Map()
  for (const e of groupEntries(props.rows)) {
    if (e.exerciseId !== exerciseId.value || e.week == null) continue
    set.set(`${e.week}|${e.day}`, { key: `${e.week}|${e.day}`, week: e.week, day: e.day })
  }
  return [...set.values()].sort((a, b) => a.week - b.week || a.day - b.day)
})

watch(positions, (list) => {
  if (position.value && !list.some((p) => p.key === position.value)) position.value = ''
})

const history = computed(() => {
  const pos = position.value ? { week: +position.value.split('|')[0], day: +position.value.split('|')[1] } : null
  return exerciseHistory(props.rows, exerciseId.value, pos)
})

const labels = computed(() => history.value.map((e) => formatDateRu(e.date)))
const details = computed(() =>
  history.value.map((e) => `${workoutCode(e.week, e.day)} · цикл ${e.cycle} · ${formatSets(e.sets)}`),
)
</script>

<template>
  <section class="view">
    <div class="toolbar">
      <label class="field">
        <span class="label">Упражнение</span>
        <select v-model="exerciseId" class="select">
          <option v-for="ex in exercises" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Тренировки</span>
        <select v-model="position" class="select">
          <option value="">Все тренировки</option>
          <option v-for="p in positions" :key="p.key" :value="p.key">Только {{ workoutCode(p.week, p.day) }}</option>
        </select>
      </label>
    </div>

    <p v-if="history.length === 0" class="empty">Нет рабочих подходов по этому упражнению в выбранном диапазоне.</p>

    <template v-else>
      <div class="charts">
        <LineChart title="Рабочий вес (максимум за тренировку)" unit="кг" :labels="labels" :values="history.map((e) => e.maxWeight)" :details="details" />
        <LineChart title="Расчётный 1ПМ (Эпли, лучший подход)" unit="кг" :labels="labels" :values="history.map((e) => round1(e.best1RM))" :details="details" />
        <LineChart title="Объём (вес × повторы)" unit="кг" :labels="labels" :values="history.map((e) => e.volume)" :details="details" />
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Тренировка</th>
            <th class="num">Цикл</th>
            <th>Подходы</th>
            <th class="num">Макс. вес</th>
            <th class="num">1ПМ</th>
            <th class="num">Объём</th>
          </tr>
        </thead>
        <tbody>
          <!-- Свежие сверху -->
          <tr v-for="e in [...history].reverse()" :key="e.date + e.week + e.day + e.cycle">
            <td>{{ formatDateRu(e.date, true) }}</td>
            <td>{{ workoutCode(e.week, e.day) }}<span v-if="e.workoutName" class="muted"> · {{ e.workoutName }}</span></td>
            <td class="num">{{ e.cycle }}</td>
            <td class="mono">{{ formatSets(e.sets) }}</td>
            <td class="num">{{ formatNumber(e.maxWeight) }}</td>
            <td class="num">{{ formatNumber(e.best1RM) }}</td>
            <td class="num">{{ formatNumber(e.volume) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>
