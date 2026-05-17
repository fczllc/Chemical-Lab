import {
  PARAMETER_DEFINITIONS,
  createParameterEngine,
} from './engine.js';

function formatValue(value, definition) {
  if (definition.type === 'boolean') {
    return value ? '已加入' : '未加入';
  }
  return `${Number(value).toLocaleString('zh-CN')}${definition.unit ? ` ${definition.unit}` : ''}`;
}

function createNumericControl(documentRef, key, definition, value, onInput) {
  const wrapper = documentRef.createElement('label');
  wrapper.className = 'lab-parameter-control lab-parameter-control--slider';

  const heading = documentRef.createElement('span');
  heading.className = 'lab-parameter-control__heading';
  heading.textContent = definition.label;

  const valueText = documentRef.createElement('output');
  valueText.className = 'lab-parameter-control__value';
  valueText.value = formatValue(value, definition);
  valueText.textContent = valueText.value;

  const slider = documentRef.createElement('input');
  slider.type = 'range';
  slider.name = key;
  slider.min = String(definition.min);
  slider.max = String(definition.max);
  slider.step = String(definition.step);
  slider.value = String(value);

  slider.addEventListener('input', () => {
    const nextValue = Number(slider.value);
    valueText.value = formatValue(nextValue, definition);
    valueText.textContent = valueText.value;
    onInput(key, nextValue);
  });

  wrapper.append(heading, valueText, slider);
  return { wrapper, input: slider, valueText };
}

function createBooleanControl(documentRef, key, definition, value, onInput) {
  const wrapper = documentRef.createElement('label');
  wrapper.className = 'lab-parameter-control lab-parameter-control--switch';

  const checkbox = documentRef.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = key;
  checkbox.checked = Boolean(value);

  const heading = documentRef.createElement('span');
  heading.className = 'lab-parameter-control__heading';
  heading.textContent = definition.label;

  const valueText = documentRef.createElement('output');
  valueText.className = 'lab-parameter-control__value';
  valueText.value = formatValue(value, definition);
  valueText.textContent = valueText.value;

  checkbox.addEventListener('change', () => {
    valueText.value = formatValue(checkbox.checked, definition);
    valueText.textContent = valueText.value;
    onInput(key, checkbox.checked);
  });

  wrapper.append(checkbox, heading, valueText);
  return { wrapper, input: checkbox, valueText };
}

export function createParameterControls({
  engine = createParameterEngine(),
  values = engine.getState().values,
  onChange = () => {},
  documentRef = globalThis.document,
  className = 'lab-parameter-panel',
} = {}) {
  if (!documentRef) {
    throw new Error('createParameterControls requires a document object.');
  }

  const element = documentRef.createElement('section');
  element.className = className;
  element.setAttribute('aria-label', '实验参数控制面板');

  const title = documentRef.createElement('h3');
  title.className = 'lab-parameter-panel__title';
  title.textContent = '实验参数';
  element.append(title);

  const controls = {};
  const currentValues = { ...values };
  const definitions = engine.definitions || PARAMETER_DEFINITIONS;

  function emitChange(key, value) {
    currentValues[key] = value;
    const state = engine.updateParameters({ [key]: value });
    onChange({
      key,
      value,
      values: { ...state.values },
      effects: state.effects,
    });
  }

  for (const [key, definition] of Object.entries(definitions)) {
    const value = currentValues[key] ?? definition.defaultValue;
    const control = definition.type === 'boolean'
      ? createBooleanControl(documentRef, key, definition, value, emitChange)
      : createNumericControl(documentRef, key, definition, value, emitChange);
    controls[key] = control;
    element.append(control.wrapper);
  }

  function setValue(key, value) {
    const definition = definitions[key];
    const control = controls[key];
    if (!definition || !control) {
      return;
    }

    if (definition.type === 'boolean') {
      control.input.checked = Boolean(value);
    } else {
      control.input.value = String(value);
    }
    control.valueText.value = formatValue(value, definition);
    control.valueText.textContent = control.valueText.value;
    emitChange(key, definition.type === 'boolean' ? Boolean(value) : Number(value));
  }

  function getValues() {
    return { ...engine.getState().values };
  }

  function dispose() {
    element.remove();
  }

  return {
    element,
    controls,
    setValue,
    getValues,
    dispose,
  };
}

export { PARAMETER_DEFINITIONS };
