<script setup>
// Линейный график одной величины по датам (вес, 1ПМ или объём).
// Одна серия на график: величины разного масштаба не смешиваем на одной оси.
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Line } from 'vue-chartjs'
import { formatNumber as fmt } from '@shared/calc.js'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from 'chart.js'

// Chart.js собирается из частей — подключаем только то, что используем.
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

const props = defineProps({
  title: { type: String, required: true },
  unit: { type: String, default: '' },
  labels: { type: Array, required: true }, // подписи по оси X (даты)
  values: { type: Array, required: true }, // числа
  details: { type: Array, default: () => [] }, // доп. строка в подсказке для каждой точки
})

// Цвета берём из CSS-переменных, чтобы график совпадал с темой страницы.
// При переключении светлой/тёмной темы в системе — перечитываем.
const themeTick = ref(0)
let media
const onThemeChange = () => themeTick.value++
onMounted(() => {
  media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onThemeChange)
})
onBeforeUnmount(() => media?.removeEventListener('change', onThemeChange))

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const last = computed(() => (props.values.length ? props.values[props.values.length - 1] : null))

const chartData = computed(() => {
  themeTick.value // зависимость от темы
  const color = cssVar('--series-1')
  return {
    labels: props.labels,
    datasets: [
      {
        data: props.values,
        borderColor: color,
        borderWidth: 2,
        // Лёгкая заливка под линией (~10 % непрозрачности).
        backgroundColor: color + '1a',
        fill: 'origin',
        tension: 0,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        // Кольцо цвета фона вокруг точки — она читается и поверх линии.
        pointBorderColor: cssVar('--surface'),
        pointBorderWidth: 2,
        pointHitRadius: 14,
      },
    ],
  }
})

const options = computed(() => {
  themeTick.value
  const muted = cssVar('--text-muted')
  const grid = cssVar('--grid')
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    // Подсказка показывается для ближайшей по X точки — не нужно целиться точно в неё.
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar('--surface'),
        titleColor: cssVar('--text'),
        bodyColor: cssVar('--text-secondary'),
        borderColor: cssVar('--border'),
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (ctx) => `${fmt(ctx.parsed.y)} ${props.unit}`,
          afterLabel: (ctx) => props.details[ctx.dataIndex] ?? '',
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: cssVar('--axis') },
        ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
      },
      y: {
        // Не от нуля: так видно изменения веса на 2,5 кг.
        beginAtZero: false,
        grid: { color: grid, lineWidth: 1 },
        border: { display: false },
        ticks: { color: muted, maxTicksLimit: 6, callback: (v) => fmt(v) },
      },
    },
  }
})

// Вертикальная линия под курсором (перекрестие) — небольшой плагин прямо здесь.
const crosshair = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.()
    if (!active?.length) return
    const x = active[0].element.x
    const { top, bottom } = chart.chartArea
    const ctx = chart.ctx
    ctx.save()
    ctx.strokeStyle = cssVar('--axis')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.restore()
  },
}
</script>

<template>
  <figure class="chart">
    <figcaption class="chart__head">
      <span class="chart__title">{{ title }}</span>
      <span v-if="last != null" class="chart__last">последнее: <b>{{ fmt(last) }}</b> {{ unit }}</span>
    </figcaption>
    <div class="chart__plot">
      <Line :data="chartData" :options="options" :plugins="[crosshair]" />
    </div>
  </figure>
</template>
