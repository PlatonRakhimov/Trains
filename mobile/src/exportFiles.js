// Экспорт: два файла (CSV для анализа и JSON-бэкап) → системное меню «Поделиться»
// или, если оно не умеет файлы, обычное скачивание.
import { state } from './store.js'
import { sessionsToCSV } from '@shared/csv.js'
import { backupToJSON } from '@shared/backup.js'
import { todayISO } from '@shared/date.js'

// Chrome на Android делится не любыми файлами, а только типами из своего списка.
// CSV в списке есть, а JSON — нет. Поэтому, если JSON поделиться нельзя,
// отдаём бэкап как .txt (внутри тот же JSON, импорт понимает оба варианта).
function canShareFiles(files) {
  try {
    return !!navigator.canShare?.({ files })
  } catch {
    return false
  }
}

export function buildExportFiles() {
  const date = todayISO()
  const csv = new File([sessionsToCSV(state.sessions)], `workouts_${date}.csv`, { type: 'text/csv' })

  const json = backupToJSON(state)
  let backup = new File([json], `backup_${date}.json`, { type: 'application/json' })
  if (!canShareFiles([backup])) {
    const asText = new File([json], `backup_${date}.json.txt`, { type: 'text/plain' })
    if (canShareFiles([asText])) backup = asText
  }
  return [csv, backup]
}

// Скачивание файла через временную ссылку <a download>.
function download(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Ссылку освобождаем не сразу — браузеру нужно успеть начать скачивание.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Возвращает 'shared' | 'downloaded' | 'cancelled'.
export async function exportAll({ forceDownload = false } = {}) {
  const files = buildExportFiles()

  if (!forceDownload && canShareFiles(files)) {
    try {
      await navigator.share({ files, title: 'Тренировки — экспорт' })
    } catch (err) {
      // Пользователь закрыл меню «Поделиться» — это не ошибка, но и экспортом не считается.
      if (err?.name === 'AbortError') return 'cancelled'
      throw err
    }
    markExported()
    return 'shared'
  }

  for (const file of files) download(file)
  markExported()
  return 'downloaded'
}

function markExported() {
  state.settings.lastExportAt = new Date().toISOString()
}
