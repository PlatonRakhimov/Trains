<script setup>
// Экспорт (он же бэкап) и восстановление из бэкапа.
import { ref, computed, onMounted } from 'vue'
import { state, daysSinceExport, exportReminderDue, replaceAllData } from '../store.js'
import { exportAll } from '../exportFiles.js'
import { parseBackup, backupSummary } from '@shared/backup.js'
import { formatDateRu, toISODate } from '@shared/date.js'

const emit = defineEmits(['back'])

const message = ref('')
const error = ref('')
const busy = ref(false)
const persisted = ref(null) // true / false / null (браузер не сообщает)

const setCount = computed(() => state.sessions.reduce((n, s) => n + s.exercises.reduce((m, e) => m + e.sets.length, 0), 0))

// «сегодня» / «вчера» / «5 дн. назад» / «ещё не было»
const lastExportText = computed(() => {
  const days = daysSinceExport()
  if (days == null) return 'ещё не было'
  if (days === 0) return 'сегодня'
  if (days === 1) return 'вчера'
  return `${days} дн. назад`
})

onMounted(async () => {
  try {
    persisted.value = (await navigator.storage?.persisted?.()) ?? null
  } catch {
    persisted.value = null
  }
})

async function runExport(forceDownload = false) {
  message.value = ''
  error.value = ''
  busy.value = true
  try {
    const result = await exportAll({ forceDownload })
    if (result === 'shared') message.value = 'Готово: файлы отправлены.'
    if (result === 'downloaded') message.value = 'Готово: файлы сохранены в «Загрузки».'
  } catch (err) {
    error.value = 'Не получилось экспортировать: ' + (err?.message || err)
  } finally {
    busy.value = false
  }
}

// ---------- Импорт ----------

const fileInput = ref(null)

async function onFileChosen(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // чтобы тот же файл можно было выбрать повторно
  if (!file) return
  message.value = ''
  error.value = ''

  let backup
  try {
    backup = parseBackup(await file.text())
  } catch (err) {
    error.value = err.message
    return
  }

  const info = backupSummary(backup)
  const when = backup.exportedAt ? ` от ${formatDateRu(toISODate(new Date(backup.exportedAt)), true)}` : ''
  const text =
    `Восстановить бэкап${when}?\n\n` +
    `В файле: ${info.sessions} тренировок, ${info.sets} подходов, ${info.exercises} упражнений.\n\n` +
    `Все текущие данные на телефоне (${state.sessions.length} тренировок) будут ЗАМЕНЕНЫ.`
  if (!confirm(text)) return

  replaceAllData(backup)
  message.value = 'Данные восстановлены.'
}
</script>

<template>
  <main class="screen">
    <header class="topbar">
      <button class="btn btn--icon" aria-label="Назад" @click="emit('back')">←</button>
      <h1 class="topbar__title">Данные</h1>
    </header>

    <p v-if="message" class="card notice">{{ message }}</p>
    <p v-if="error" class="card notice notice--error">{{ error }}</p>

    <section class="card">
      <h2 class="card__title">Экспорт</h2>
      <p :class="exportReminderDue() ? 'warn' : 'muted'">Последний экспорт: {{ lastExportText }}</p>
      <p class="muted small">
        Всегда полный: журнал для анализа (<b>workouts_….csv</b>) и бэкап всего (<b>backup_….json</b>). Отправьте их себе в
        мессенджер — любой последний файл бэкапа восстанавливает всё.
      </p>
      <button class="btn btn--primary btn--big" :disabled="busy" @click="runExport()">Поделиться файлами</button>
      <button class="btn" :disabled="busy" @click="runExport(true)">Скачать на телефон</button>
    </section>

    <section class="card">
      <h2 class="card__title">Восстановление</h2>
      <p class="muted small">Выберите файл backup_….json (или backup_….json.txt). Перед заменой данных будет вопрос.</p>
      <!-- Настоящее поле выбора файла спрятано, открываем его своей крупной кнопкой. -->
      <input
        ref="fileInput"
        type="file"
        accept=".json,.txt,application/json,text/plain"
        hidden
        @change="onFileChosen"
      />
      <button class="btn" @click="fileInput.click()">Выбрать файл бэкапа</button>
    </section>

    <section class="card">
      <h2 class="card__title">На телефоне</h2>
      <p class="muted small">
        Тренировок: {{ state.sessions.length }} · подходов: {{ setCount }} · упражнений: {{ state.exercises.length }}
      </p>
      <p v-if="persisted === true" class="muted small">Хранилище постоянное: браузер не удалит данные сам.</p>
      <p v-else-if="persisted === false" class="warn small">
        Браузер может очистить данные при нехватке места. Установите приложение на главный экран и регулярно делайте
        экспорт.
      </p>
    </section>
  </main>
</template>
