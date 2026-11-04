<script setup>
// Экран «По тренировке»: циклы бок о бок. Строки — упражнения, столбцы — циклы.
import { ref, computed, watch } from 'vue'
import { workoutList, workoutComparison } from '@shared/analysis.js'
import { formatDateRu } from '@shared/date.js'
import { loadPref, savePref } from '../storage.js'

const props = defineProps({ rows: { type: Array, required: true } })

const workouts = computed(() => workoutList(props.rows))
const code = ref(loadPref('workoutCode', ''))

watch(
  workouts,
  (list) => {
    if (!list.some((w) => w.code === code.value)) code.value = list[0]?.code ?? ''
  },
  { immediate: true },
)
watch(code, (v) => savePref('workoutCode', v))

const selected = computed(() => workouts.value.find((w) => w.code === code.value))
const table = computed(() => (selected.value ? workoutComparison(props.rows, selected.value.week, selected.value.day) : null))

// Дата тренировки для заголовка столбца: берём из первой непустой ячейки цикла.
function cycleDate(index) {
  const cell = table.value.rows.map((r) => r.cells[index]).find(Boolean)
  return cell ? formatDateRu(cell.date) : ''
}
</script>

<template>
  <section class="view">
    <div class="toolbar">
      <label class="field">
        <span class="label">Тренировка</span>
        <select v-model="code" class="select">
          <option v-for="w in workouts" :key="w.code" :value="w.code">
            {{ w.code }}<template v-if="w.name"> · {{ w.name }}</template>
          </option>
        </select>
      </label>
      <p class="legend">
        Запись <span class="mono">80: 5/5/4</span> — вес и повторы по подходам.
      </p>
    </div>

    <p v-if="!table || table.rows.length === 0" class="empty">Нет данных по этой тренировке.</p>

    <div v-else class="table-scroll">
      <table class="table table--grid">
        <thead>
          <tr>
            <th class="sticky">Упражнение</th>
            <th v-for="(c, i) in table.cycles" :key="c" class="num">
              Цикл {{ c }}
              <div class="muted small">{{ cycleDate(i) }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in table.rows" :key="row.exerciseId">
            <th class="sticky">{{ row.exerciseName }}</th>
            <td
              v-for="(cell, i) in row.cells"
              :key="i"
              class="mono num"
              :title="cell ? formatDateRu(cell.date, true) : ''"
            >
              <template v-if="cell">
                {{ cell.text }}
              </template>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
