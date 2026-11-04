<script setup>
// Поле числа с крупными кнопками − и +. Используется для веса, повторов, номера цикла.
const props = defineProps({
  modelValue: { type: Number, default: 0 },
  step: { type: Number, default: 1 },
  min: { type: Number, default: 0 },
  label: { type: String, default: '' },
  small: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

// Округляем до сотых, иначе 0.1 + 0.2 даст 0.30000000000000004.
const round = (n) => Math.round(n * 100) / 100

function change(delta) {
  emit('update:modelValue', Math.max(props.min, round((props.modelValue || 0) + delta)))
}

// Поле текстовое (inputmode="decimal" показывает цифровую клавиатуру),
// чтобы принимать и «62,5», и «62.5».
function onInput(event) {
  const n = parseFloat(event.target.value.replace(',', '.'))
  if (Number.isFinite(n) && n >= props.min) emit('update:modelValue', round(n))
}

// Если стёрли значение и ушли из поля — показываем текущее число обратно.
function onBlur(event) {
  event.target.value = props.modelValue
}
</script>

<template>
  <div class="stepper" :class="{ 'stepper--small': small }">
    <span v-if="label" class="stepper__label">{{ label }}</span>
    <div class="stepper__row">
      <button type="button" class="stepper__btn" :aria-label="`Уменьшить ${label}`" @click="change(-step)">−</button>
      <input
        class="stepper__input"
        type="text"
        inputmode="decimal"
        :value="modelValue"
        @input="onInput"
        @blur="onBlur"
        @focus="$event.target.select()"
      />
      <button type="button" class="stepper__btn" :aria-label="`Увеличить ${label}`" @click="change(step)">+</button>
    </div>
  </div>
</template>
