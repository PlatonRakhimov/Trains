<script setup>
// Экран «Сводка / проблемы»: застой и отсутствие роста веса.
import { computed, ref, watch } from 'vue'
import { findProblems } from '@shared/analysis.js'
import { loadPref, savePref } from '../storage.js'

const props = defineProps({ rows: { type: Array, required: true } })
const emit = defineEmits(['open-exercise'])

// За сколько циклов вес должен был вырасти.
const cycles = ref(loadPref('noGrowthCycles', 3))
watch(cycles, (v) => savePref('noGrowthCycles', v))

const problems = computed(() => findProblems(props.rows, { noGrowthCycles: Math.max(2, cycles.value || 2) }))

const open = (p) => emit('open-exercise', p.exerciseId, `${p.week}|${p.day}`)
</script>

<template>
  <section class="view">
    <div class="tiles">
      <div class="tile">
        <span class="tile__value">{{ problems.stalled.length }}</span>
        <span class="tile__label">застой: недобор повторов 2 цикла подряд</span>
      </div>
      <div class="tile">
        <span class="tile__value">{{ problems.noGrowth.length }}</span>
        <span class="tile__label">без роста веса за {{ cycles }} цикл(а/ов)</span>
      </div>
    </div>

    <h2 class="h2">Застой</h2>
    <p class="muted">
      Плановые повторы не выполнены в двух последних циклах подряд. Сравниваются только одинаковые тренировки (Н1Д1 с
      Н1Д1), потому что на разных неделях план разный.
    </p>
    <p v-if="problems.stalled.length === 0" class="empty">Застоев нет.</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Тренировка</th>
          <th>Упражнение</th>
          <th>Циклы</th>
          <th>Последний результат</th>
          <th class="num">План, повт.</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in problems.stalled" :key="p.code + p.exerciseId" class="clickable" @click="open(p)">
          <td>{{ p.code }}</td>
          <td><a href="#" @click.prevent>{{ p.exerciseName }}</a></td>
          <td>{{ p.cycles.join(', ') }}</td>
          <td class="mono"><span class="missed-mark">▼</span> {{ p.last }}</td>
          <td class="num">{{ p.plannedReps }}</td>
        </tr>
      </tbody>
    </table>

    <h2 class="h2">Нет роста веса</h2>
    <div class="toolbar">
      <label class="field field--inline">
        <span class="label">Циклов без роста</span>
        <input v-model.number="cycles" type="number" min="2" max="20" class="select select--narrow" />
      </label>
      <p class="muted">Рабочий вес в последних {{ cycles }} циклах не превысил вес первого из них.</p>
    </div>
    <p v-if="problems.noGrowth.length === 0" class="empty">Таких упражнений нет.</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Тренировка</th>
          <th>Упражнение</th>
          <th>Циклы</th>
          <th class="num">Вес, кг</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in problems.noGrowth" :key="p.code + p.exerciseId" class="clickable" @click="open(p)">
          <td>{{ p.code }}</td>
          <td><a href="#" @click.prevent>{{ p.exerciseName }}</a></td>
          <td>{{ p.cycles.join(', ') }}</td>
          <td class="num">{{ p.weight }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
