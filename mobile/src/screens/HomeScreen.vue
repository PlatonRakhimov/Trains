<script setup>
import { ref, computed, watch } from 'vue'
import { state, startSession, exportReminderDue, daysSinceExport } from '../store.js'
import { suggestNext, cycleForManualPick } from '@shared/order.js'
import { weekLabel, workoutLabel } from '@shared/schema.js'
import { todayISO, formatDateRu } from '@shared/date.js'
import NumberStepper from '../components/NumberStepper.vue'

const emit = defineEmits(['open', 'program', 'data'])

const weeks = computed(() => state.program.weeks)
const next = computed(() => suggestNext(state.program, state.sessions))

// Выбранная тренировка. По умолчанию — следующая по порядку.
const selected = ref(next.value ? { weekIndex: next.value.weekIndex, dayIndex: next.value.dayIndex } : null)
const cycle = ref(1)

const isNext = computed(
  () =>
    next.value &&
    selected.value &&
    selected.value.weekIndex === next.value.weekIndex &&
    selected.value.dayIndex === next.value.dayIndex,
)

// При смене выбора пересчитываем номер цикла автоматически.
// Поправить вручную можно степпером — до следующей смены выбора.
watch(
  selected,
  (sel) => {
    if (!sel || sel.dayIndex == null) return
    cycle.value = isNext.value
      ? next.value.cycle
      : cycleForManualPick(state.program, state.sessions, sel.weekIndex, sel.dayIndex)
  },
  { immediate: true },
)

function selectWeek(weekIndex) {
  const count = weeks.value[weekIndex].workouts.length
  // В «следующей» неделе сразу встаём на следующий день, в остальных — на первый.
  let dayIndex = next.value?.weekIndex === weekIndex ? next.value.dayIndex : 0
  if (count === 0) dayIndex = null
  selected.value = { weekIndex, dayIndex }
}

function selectDay(dayIndex) {
  selected.value = { weekIndex: selected.value.weekIndex, dayIndex }
}

const selectedWeek = computed(() => (selected.value ? weeks.value[selected.value.weekIndex] : null))
const selectedWorkout = computed(() =>
  selected.value?.dayIndex != null ? selectedWeek.value.workouts[selected.value.dayIndex] : null,
)

function start() {
  const { weekIndex, dayIndex } = selected.value
  emit('open', startSession(weekIndex, dayIndex, cycle.value))
}

// Тренировка, начатая сегодня, — её удобно продолжить одним тапом.
const todaySession = computed(() => {
  const last = state.sessions[state.sessions.length - 1]
  return last && last.date === todayISO() ? last : null
})

// Последние записи, свежие сверху.
const recent = computed(() => state.sessions.slice(-20).reverse())

const setCount = (session) => session.exercises.reduce((n, e) => n + e.sets.length, 0)
const sessionTitle = (s) => {
  const day = `день ${s.dayNo}`
  const week = s.weekName || `Неделя ${s.weekNo}`
  const name = s.workoutName?.trim()
  const prefix = name && name.toLowerCase() !== day ? `${name} · ` : ''
  return `${prefix}${week}, ${day}`
}
const setPlural = new Intl.PluralRules('ru')
function setsLabel(session) {
  const count = setCount(session)
  const word = { one: 'подход', few: 'подхода', many: 'подходов', other: 'подхода' }[setPlural.select(count)]
  return `${count} ${word}`
}
</script>

<template>
  <main class="screen">
    <div class="row row--between">
      <h1 class="screen__title">Тренировки</h1>
      <div class="row">
        <button class="btn btn--small" @click="emit('program')">Программа</button>
        <button class="btn btn--small" @click="emit('data')">Данные</button>
      </div>
    </div>

    <!-- Мягкое напоминание о бэкапе: данные живут только на телефоне. -->
    <button v-if="exportReminderDue()" class="card card--warn" @click="emit('data')">
      <strong>Пора сделать экспорт</strong>
      <span class="small">
        {{ daysSinceExport() == null ? 'Экспорта ещё не было.' : `Последний — ${daysSinceExport()} дн. назад.` }}
        Данные хранятся только на этом телефоне.
      </span>
    </button>

    <button v-if="todaySession" class="card card--action" @click="emit('open', todaySession.id)">
      <span class="muted">Продолжить сегодняшнюю</span>
      <strong>{{ sessionTitle(todaySession) }}</strong>
      <span class="muted">Цикл {{ todaySession.cycle }} · подходов: {{ setCount(todaySession) }}</span>
    </button>

    <section v-if="weeks.length === 0" class="card">
      <p>Программа пустая. Добавьте недели и тренировки в редакторе.</p>
      <button class="btn btn--primary" @click="emit('program')">Открыть программу</button>
    </section>

    <section v-else class="card">
      <h2 class="card__title">Новая тренировка</h2>

      <p class="label">Неделя</p>
      <div class="segments" role="group" aria-label="Неделя">
        <button
          v-for="(week, w) in weeks"
          :key="week.id"
          class="segment"
          :class="{ 'segment--active': selected?.weekIndex === w }"
          :aria-pressed="selected?.weekIndex === w"
          @click="selectWeek(w)"
        >
          {{ w + 1 }}. {{ weekLabel(week, w) }}
        </button>
      </div>

      <template v-if="selectedWeek">
        <p class="label">День</p>
        <p v-if="selectedWeek.workouts.length === 0" class="muted">В этой неделе нет тренировок.</p>
        <div class="segments" role="group" aria-label="День">
          <button
            v-for="(workout, d) in selectedWeek.workouts"
            :key="workout.id"
            class="segment"
            :class="{ 'segment--active': selected.dayIndex === d }"
            :aria-pressed="selected.dayIndex === d"
            @click="selectDay(d)"
          >
            {{ workoutLabel(workout, d) }}
          </button>
        </div>
      </template>

      <template v-if="selectedWorkout">
        <div class="row row--between">
          <span v-if="isNext" class="muted small">Следующая по порядку</span>
          <NumberStepper v-model="cycle" class="cycle-picker" label="Цикл" :min="1" small />
        </div>
        <button class="btn btn--primary btn--big btn--soft-border" @click="start">Начать</button>
      </template>
    </section>

    <section v-if="recent.length" class="journal">
      <h2 class="card__title">Журнал</h2>
      <button v-for="s in recent" :key="s.id" class="list-item journal__item" @click="emit('open', s.id)">
        <span class="journal__text">
          <strong class="journal__name">{{ sessionTitle(s) }}</strong>
          <span class="muted small">{{ formatDateRu(s.date, true) }} · цикл {{ s.cycle }} · {{ setsLabel(s) }}</span>
        </span>
        <span class="muted" aria-hidden="true">›</span>
      </button>
    </section>
  </main>
</template>
