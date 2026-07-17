import { createShader } from 'shaders/js';
import { PRESET1_DEFAULT } from './default-preset.js';
import './style.css';

const canvas = document.querySelector('#shader-canvas');

// VideoTexture 需要一个已经就绪的外部纹理才能让最终 pass 正常绘制。
// 初始状态保持不可见，避免空媒体通道阻断最终 pass；上传视频时再显式启用。

const preset = {
  components: [
    {
      type: 'Swirl',
      id: 'white-swirl',
      props: {
        colorA: '#ffffff',
        colorB: '#f0f0f0',
        detail: 1.7,
      },
    },
    {
      type: 'ImageTexture',
      id: 'uploaded-image',
      props: {
        url: '',
        objectFit: 'cover',
        opacity: 1,
        maskSource: 'cursor-bloom',
        maskType: 'alpha',
      },
    },
    {
      type: 'VideoTexture',
      id: 'uploaded-video',
      props: {
        url: '',
        objectFit: 'cover',
        loop: true,
        opacity: 0,
        visible: false,
        maskSource: 'cursor-bloom',
        maskType: 'alpha',
      },
    },
    {
      type: 'ChromaFlow',
      id: 'cursor-bloom',
      props: {
        baseColor: '#ffffff',
        downColor: '#4642ff',
        leftColor: '#56c2fc',
        momentum: 13,
        radius: 3.5,
        rightColor: '#5b4fff',
        upColor: '#7f66ff',
        intensity: 1,
        opacity: 0.2,
      },
    },
    {
      type: 'FlutedGlass',
      id: 'fluted-glass',
      props: {
        aberration: 0.61,
        angle: 31,
        frequency: 8,
        highlight: 0.12,
        highlightSoftness: 0,
        lightAngle: -90,
        refraction: 4,
        shape: 'rounded',
        softness: 1,
        speed: 0.15,
      },
    },
    {
      type: 'FilmGrain',
      id: 'film-grain',
      props: {
        strength: 0.05,
      },
    },
  ],
};

let shaderInstance;
let activeMediaUrl = '';
let mediaAudio;
let toastHideTimer;
let presetTrackingReady = false;
let suppressPresetTracking = false;
let defaultControlState = null;
let selectedPresetId = 'default';
let selectedPresetBaseline = null;
let savedPresets = [];
let presetIsDirty = false;
let bloomOpacity = 0.2;
let bloomDecayCoefficient = 0;
let bloomDecayEnvelope = 1;
let lastPointerActivity = performance.now();
let bloomDecayFrame;
let mediaVolume = 0.2;
let mediaMuted = true;
let presetVideoPreloader;

const PRESET_STORAGE_KEY = 'glasshaus:shader-presets';
const PRESET_STARTER_SEEDED_KEY = `${PRESET_STORAGE_KEY}:starter-seeded`;
const PRESET_STARTER_VOLUME_MIGRATED_KEY = `${PRESET_STORAGE_KEY}:starter-volume-20`;
const PRESET_STARTER_MUTE_MIGRATED_KEY = `${PRESET_STORAGE_KEY}:starter-muted`;
const DEFAULT_PRESET_MEDIA = PRESET1_DEFAULT.media;

try {
  shaderInstance = await createShader(canvas, preset, {
    colorSpace: 'srgb',
    toneMapping: 'linear',
    disableTelemetry: true,
    onError: (reason) => {
      document.documentElement.dataset.shaderFallback = 'true';
      console.warn(`[Glass Agency Hero] Shader device unavailable: ${reason}`);
    },
  });
} catch (error) {
  document.documentElement.dataset.shaderFallback = 'true';
  console.warn('[Glass Agency Hero] Falling back to the white background.', error);
}

function decimalPlaces(step) {
  if (!step || step === 'any' || !step.includes('.')) return 0;
  return step.split('.')[1].length;
}

function updateOutput(input) {
  const output = document.querySelector(`[data-output-for="${input.id}"]`);
  if (!output) return;

  let displayValue = input.value;
  if (input.type === 'range') {
    displayValue = Number(input.value).toFixed(decimalPlaces(input.step));
  } else if (input.type === 'color') {
    displayValue = input.value.toUpperCase();
  } else if (input.type === 'checkbox') {
    displayValue = input.checked ? 'On' : 'Off';
  }

  if (output.tagName === 'INPUT') {
    output.value = displayValue;
  } else {
    output.textContent = displayValue;
  }
}

function updateBloomOpacity() {
  const effectiveOpacity = Math.min(1, Math.max(0, bloomOpacity * bloomDecayEnvelope));
  shaderInstance?.update('cursor-bloom', { opacity: effectiveOpacity });
}

function updateBloomDecayEnvelope(timestamp) {
  const idleSeconds = Math.max(0, (timestamp - lastPointerActivity) / 1000);
  const activeGracePeriod = 0.06;
  const decayRate = bloomDecayCoefficient / 50;
  const decaySeconds = Math.max(0, idleSeconds - activeGracePeriod);
  const nextEnvelope = decayRate > 0 ? Math.exp(-decayRate * decaySeconds) : 1;

  if (Math.abs(nextEnvelope - bloomDecayEnvelope) > 0.002) {
    bloomDecayEnvelope = nextEnvelope;
    updateBloomOpacity();
  }

  bloomDecayFrame = requestAnimationFrame(updateBloomDecayEnvelope);
}

function markBloomPointerActivity() {
  lastPointerActivity = performance.now();
  if (bloomDecayEnvelope !== 1) {
    bloomDecayEnvelope = 1;
    updateBloomOpacity();
  }
}

function updateShaderControl(input) {
  const scale = Number(input.dataset.valueScale || 1);
  const value = input.type === 'range' ? Number(input.value) * scale : input.value;
  const componentId = input.dataset.shaderId;
  const prop = input.dataset.shaderProp;

  if (componentId === 'cursor-bloom' && prop === 'opacity') {
    bloomOpacity = value;
    updateBloomOpacity();
  } else {
    shaderInstance?.update(componentId, { [prop]: value });
  }
  updateOutput(input);
  markPresetDirty();
}

function updateCustomControl(input, { unmuteOnVolumeChange = false } = {}) {
  const value = input.type === 'checkbox' ? input.checked : Number(input.value);

  if (input.dataset.customControl === 'media-volume') {
    mediaVolume = Math.min(1, Math.max(0, value / 100));
    if (unmuteOnVolumeChange) {
      mediaMuted = false;
      const muteInput = document.querySelector('#video-mute');
      if (muteInput) muteInput.checked = false;
      syncMuteButton();
    }
    syncMediaAudio();
  }

  if (input.dataset.customControl === 'media-mute') {
    mediaMuted = value;
    syncMuteButton();
    syncMediaAudio();
  }

  if (input.dataset.customControl === 'bloom-decay') {
    bloomDecayCoefficient = Math.min(100, Math.max(0, Number(input.value) || 0));
  }

  updateOutput(input);
  markPresetDirty();
}

function syncMuteButton() {
  const button = document.querySelector('#video-mute-toggle');
  if (!button) return;

  button.classList.toggle('is-muted', mediaMuted);
  button.setAttribute('aria-pressed', String(mediaMuted));
  button.setAttribute('aria-label', mediaMuted ? 'Unmute video sound' : 'Mute video sound');
  button.title = mediaMuted ? 'Unmute video sound' : 'Mute video sound';
}

function syncColorControl(id, value) {
  const input = document.querySelector(`#${id}`);
  if (!input) return;
  input.value = value;
  updateOutput(input);
}

function updatePaletteControl(input, syncRelatedColors = true) {
  const value = input.value;
  const target = input.dataset.paletteTarget;

  document.documentElement.style.setProperty(`--${target}`, value);

  if (target === 'canvas') {
    if (syncRelatedColors) {
      shaderInstance?.update('white-swirl', { colorA: value });
      shaderInstance?.update('cursor-bloom', { baseColor: value });
      syncColorControl('swirl-color-a', value);
      syncColorControl('chroma-base', value);
    }
  }

  if (target === 'indigo') {
    if (syncRelatedColors) {
      shaderInstance?.update('cursor-bloom', { downColor: value });
      syncColorControl('chroma-down', value);
    }
  }

  updateOutput(input);
  markPresetDirty();
}

function showToast(message) {
  const toast = document.querySelector('#upload-toast');
  const messageNode = document.querySelector('#toast-message');
  if (!toast) return;

  if (messageNode) messageNode.textContent = message;
  window.clearTimeout(toastHideTimer);
  toast.hidden = false;
  toast.classList.remove('is-visible');
  requestAnimationFrame(() => toast.classList.add('is-visible'));

  toastHideTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => {
      toast.hidden = true;
    }, 220);
  }, 2200);
}

function showUploadToast() {
  showToast('背景素材上传成功');
}

function stopMediaAudio() {
  if (!mediaAudio) return;

  mediaAudio.pause();
  mediaAudio.src = '';
  mediaAudio.load();
  mediaAudio = null;
}

function syncMediaAudio({ showAutoplayToast = true } = {}) {
  if (!mediaAudio) return;

  mediaAudio.volume = mediaVolume;
  mediaAudio.muted = mediaMuted;
  mediaAudio.play().catch(() => {
    if (showAutoplayToast && !mediaMuted) {
      showToast('浏览器阻止了自动播放声音，请点击页面任意位置播放声音');
    }
  });
}

function startMediaAudio(url, { autoplay = true } = {}) {
  stopMediaAudio();

  mediaAudio = new Audio(url);
  mediaAudio.loop = true;
  mediaAudio.preload = 'auto';
  mediaAudio.volume = mediaVolume;
  mediaAudio.muted = mediaMuted;
  if (autoplay) syncMediaAudio({ showAutoplayToast: false });
}

function retryMediaAudioFromGesture() {
  if (mediaAudio && !mediaMuted) {
    syncMediaAudio({ showAutoplayToast: false });
  }
}

function clearPresetVideoPreloader() {
  if (!presetVideoPreloader) return;

  presetVideoPreloader.pause();
  presetVideoPreloader.src = '';
  presetVideoPreloader.load();
  presetVideoPreloader = null;
}

function clearBackgroundMedia() {
  clearPresetVideoPreloader();
  shaderInstance?.update('uploaded-image', { url: '', opacity: 0 });
  shaderInstance?.update('uploaded-video', { url: '', loop: false, opacity: 0, visible: false });
  stopMediaAudio();

  if (activeMediaUrl) URL.revokeObjectURL(activeMediaUrl);
  activeMediaUrl = '';

  const mediaInput = document.querySelector('#base-image-upload');
  const mediaName = document.querySelector('#uploaded-image-name');
  if (mediaInput) mediaInput.value = '';
  if (mediaName) mediaName.textContent = 'No media';
}

function applyPresetMedia(media) {
  if (!media?.url) return;

  clearPresetVideoPreloader();

  if (activeMediaUrl) {
    URL.revokeObjectURL(activeMediaUrl);
    activeMediaUrl = '';
  }

  const mediaInput = document.querySelector('#base-image-upload');
  const mediaName = document.querySelector('#uploaded-image-name');
  if (mediaInput) mediaInput.value = '';
  if (mediaName) mediaName.textContent = media.name || 'Background video';

  shaderInstance?.update('uploaded-image', { url: '', opacity: 0 });

  const video = document.createElement('video');
  video.preload = 'metadata';
  video.playsInline = true;
  video.muted = true;
  video.crossOrigin = 'anonymous';
  video.src = media.url;
  presetVideoPreloader = video;

  const activate = () => {
    if (presetVideoPreloader !== video) return;

    shaderInstance?.update('uploaded-video', {
      url: media.url,
      loop: true,
      opacity: 1,
      visible: true,
    });
    startMediaAudio(media.url);
    video.removeAttribute('src');
    video.load();
    presetVideoPreloader = null;
  };

  video.addEventListener('loadedmetadata', activate, { once: true });
  video.addEventListener('error', () => {
    if (presetVideoPreloader !== video) return;
    clearPresetVideoPreloader();
    showToast(`${media.name || '默认视频'} 加载失败`);
  }, { once: true });
  video.load();
}

function getPresetControls() {
  return [...document.querySelectorAll('[data-shader-id], [data-palette-target], [data-custom-control]')];
}

function captureControlState() {
  return Object.fromEntries(getPresetControls().map((input) => [
    input.id,
    input.type === 'checkbox' ? String(input.checked) : input.value,
  ]));
}

function cloneControlState(state) {
  return { ...(state || {}) };
}

function statesEqual(first, second) {
  const keys = new Set([
    ...Object.keys(first || {}),
    ...Object.keys(second || {}),
  ]);

  return [...keys].every((key) => first?.[key] === second?.[key]);
}

function markPresetDirty() {
  if (!presetTrackingReady || suppressPresetTracking || !selectedPresetBaseline) return;

  presetIsDirty = !statesEqual(captureControlState(), selectedPresetBaseline);
  renderPresetUi();
}

function applyControlState(state) {
  suppressPresetTracking = true;

  try {
    getPresetControls().forEach((input) => {
      if (state?.[input.id] === undefined) return;

      if (input.type === 'checkbox') input.checked = state[input.id] === 'true';
      else input.value = state[input.id];
      if (input.dataset.customControl) {
        updateCustomControl(input);
      } else if (input.dataset.paletteTarget) {
        updatePaletteControl(input, false);
      } else {
        updateShaderControl(input);
      }
      updateOutput(input);
    });
  } finally {
    suppressPresetTracking = false;
  }
}

function loadSavedPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];

    const knownIds = new Set(Object.keys(defaultControlState || {}));
    const usedSlots = new Set();

    return parsed
      .map((item) => {
        const slot = Number(item?.slot);
        if (!Number.isInteger(slot) || slot < 1 || slot > 3 || usedSlots.has(slot)) return null;
        if (!item?.values || typeof item.values !== 'object') return null;

        usedSlots.add(slot);
        const values = { ...(defaultControlState || {}) };
        Object.entries(item.values).forEach(([id, value]) => {
          if (knownIds.has(id)) values[id] = String(value);
        });

        return {
          id: `preset-${slot}`,
          name: `Preset${slot}`,
          slot,
          values,
          media: item.media?.url
            ? {
                url: String(item.media.url),
                name: String(item.media.name || 'Background video'),
              }
            : null,
        };
      })
      .filter(Boolean)
      .sort((first, second) => first.slot - second.slot);
  } catch {
    return [];
  }
}

function getSourcePresetValues() {
  const values = cloneControlState(defaultControlState);

  Object.entries(PRESET1_DEFAULT.controls).forEach(([id, value]) => {
    if (Object.prototype.hasOwnProperty.call(values, id)) values[id] = String(value);
  });

  return values;
}

function ensureStarterPreset() {
  const existing = savedPresets.find((item) => item.slot === 1);
  let starterWasSeeded = false;
  let starterVolumeMigrated = false;
  let starterMuteMigrated = false;

  try {
    starterWasSeeded = localStorage.getItem(PRESET_STARTER_SEEDED_KEY) === 'true';
    starterVolumeMigrated = localStorage.getItem(PRESET_STARTER_VOLUME_MIGRATED_KEY) === 'true';
    starterMuteMigrated = localStorage.getItem(PRESET_STARTER_MUTE_MIGRATED_KEY) === 'true';
  } catch {
    starterWasSeeded = false;
    starterVolumeMigrated = false;
    starterMuteMigrated = false;
  }

  if (existing) {
    const mediaChanged = existing.media?.url !== DEFAULT_PRESET_MEDIA.url
      || existing.media?.name !== DEFAULT_PRESET_MEDIA.name;
    const volumeChanged = !starterVolumeMigrated
      && existing.values?.['video-volume'] !== '20';
    const muteChanged = !starterMuteMigrated
      && existing.values?.['video-mute'] !== 'true';

    if (mediaChanged || volumeChanged || muteChanged) {
      existing.media = { ...DEFAULT_PRESET_MEDIA };
      if (volumeChanged) existing.values['video-volume'] = '20';
      if (muteChanged) existing.values['video-mute'] = 'true';
      persistSavedPresets();
    }

    try {
      localStorage.setItem(PRESET_STARTER_SEEDED_KEY, 'true');
      localStorage.setItem(PRESET_STARTER_VOLUME_MIGRATED_KEY, 'true');
      localStorage.setItem(PRESET_STARTER_MUTE_MIGRATED_KEY, 'true');
    } catch {
      // Continue with the in-memory starter when browser storage is unavailable.
    }

    return existing;
  }

  if (starterWasSeeded || savedPresets.length >= 3) return null;

  const starter = {
    id: 'preset-1',
    name: 'Preset1',
    slot: 1,
    values: getSourcePresetValues(),
    media: { ...DEFAULT_PRESET_MEDIA },
  };

  savedPresets = [starter, ...savedPresets].sort((first, second) => first.slot - second.slot);
  persistSavedPresets();

  try {
    localStorage.setItem(PRESET_STARTER_SEEDED_KEY, 'true');
    localStorage.setItem(PRESET_STARTER_VOLUME_MIGRATED_KEY, 'true');
    localStorage.setItem(PRESET_STARTER_MUTE_MIGRATED_KEY, 'true');
  } catch {
    // Continue with the in-memory starter when browser storage is unavailable.
  }

  return starter;
}

function persistSavedPresets() {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(savedPresets));
  } catch {
    showToast('预设无法写入浏览器存储');
  }
}

function getSelectedPreset() {
  if (selectedPresetId === 'default') {
    return {
      id: 'default',
      name: 'Default',
      values: defaultControlState,
    };
  }

  return savedPresets.find((item) => item.id === selectedPresetId);
}

function renderPresetUi() {
  const list = document.querySelector('#preset-list');
  const actions = document.querySelector('#preset-actions');
  const saveButton = document.querySelector('#save-preset');
  const saveNewButton = document.querySelector('#save-new-preset');
  const deleteButton = document.querySelector('#delete-preset');
  const status = document.querySelector('#preset-status');
  if (!list || !actions || !saveButton || !saveNewButton || !deleteButton || !status) return;

  list.replaceChildren();
  const presets = [
    { id: 'default', name: 'Default', meta: 'Built-in · read only' },
    ...savedPresets.map((item) => ({
      id: item.id,
      name: item.name,
      meta: item.media?.url === DEFAULT_PRESET_MEDIA.url ? 'Starter · Frieren.mov' : 'Saved locally',
    })),
  ];

  presets.forEach((item) => {
    const button = document.createElement('button');
    button.className = `preset-item${item.id === selectedPresetId ? ' is-selected' : ''}`;
    button.type = 'button';
    button.dataset.presetId = item.id;
    button.setAttribute('aria-pressed', item.id === selectedPresetId ? 'true' : 'false');

    const name = document.createElement('span');
    name.className = 'preset-item-name';
    name.textContent = item.name;

    const meta = document.createElement('span');
    meta.className = 'preset-item-meta';
    meta.textContent = item.meta;

    button.append(name, meta);
    button.addEventListener('click', () => selectPreset(item.id));
    list.append(button);
  });

  actions.hidden = !presetIsDirty;
  saveButton.disabled = selectedPresetId === 'default';
  saveButton.title = selectedPresetId === 'default'
    ? 'Default is read only; use Save as new'
    : 'Save changes to the selected preset';
  saveNewButton.disabled = false;
  saveNewButton.title = savedPresets.length >= 3
    ? '最多只支持保存三个预设'
    : 'Save the current parameters as a new preset';
  deleteButton.hidden = selectedPresetId === 'default';

  if (selectedPresetId === 'default') {
    status.textContent = presetIsDirty
      ? 'Default · read only · unsaved changes'
      : 'Default · read only';
  } else {
    const selected = getSelectedPreset();
    status.textContent = selected
      ? `${selected.name} · ${presetIsDirty ? 'unsaved changes' : 'saved'}`
      : 'Preset unavailable';
  }
}

function selectPreset(id) {
  const target = id === 'default'
    ? { id: 'default', values: defaultControlState }
    : savedPresets.find((item) => item.id === id);
  if (!target?.values) return;

  selectedPresetId = target.id;
  selectedPresetBaseline = cloneControlState(target.values);
  applyControlState(target.values);
  if (target.media?.url) applyPresetMedia(target.media);
  else clearBackgroundMedia();
  presetIsDirty = false;
  renderPresetUi();
}

function saveSelectedPreset() {
  if (selectedPresetId === 'default') {
    showToast('Default 为只读，请使用 Save as new');
    return;
  }

  const selected = savedPresets.find((item) => item.id === selectedPresetId);
  if (!selected) return;

  selected.values = captureControlState();
  selectedPresetBaseline = cloneControlState(selected.values);
  presetIsDirty = false;
  persistSavedPresets();
  renderPresetUi();
  showToast('预设已保存');
}

function saveAsNewPreset() {
  if (savedPresets.length >= 3) {
    showToast('最多只支持保存三个预设');
    return;
  }

  const usedSlots = new Set(savedPresets.map((item) => item.slot));
  const slot = [1, 2, 3].find((candidate) => !usedSlots.has(candidate));
  if (!slot) {
    showToast('最多只支持保存三个预设');
    return;
  }

  const newPreset = {
    id: `preset-${slot}`,
    name: `Preset${slot}`,
    slot,
    values: captureControlState(),
  };

  savedPresets = [...savedPresets, newPreset].sort((first, second) => first.slot - second.slot);
  selectedPresetId = newPreset.id;
  selectedPresetBaseline = cloneControlState(newPreset.values);
  presetIsDirty = false;
  persistSavedPresets();
  renderPresetUi();
  showToast(`${newPreset.name} 已保存`);
}

function deleteSelectedPreset() {
  if (selectedPresetId === 'default') return;

  const selected = getSelectedPreset();
  savedPresets = savedPresets.filter((item) => item.id !== selectedPresetId);
  persistSavedPresets();
  selectPreset('default');
  showToast(`${selected?.name || '预设'} 已删除`);
}

function initializePresetManager() {
  defaultControlState = captureControlState();
  savedPresets = loadSavedPresets();
  selectedPresetBaseline = cloneControlState(defaultControlState);
  presetTrackingReady = true;

  document.querySelector('#save-preset')?.addEventListener('click', saveSelectedPreset);
  document.querySelector('#save-new-preset')?.addEventListener('click', saveAsNewPreset);
  document.querySelector('#delete-preset')?.addEventListener('click', deleteSelectedPreset);

  const starterPreset = ensureStarterPreset();
  if (starterPreset) selectPreset(starterPreset.id);
  else renderPresetUi();
}

function resetControl(input) {
  if (input.type === 'checkbox') input.checked = input.dataset.defaultValue === 'true';
  else input.value = input.dataset.defaultValue;

  if (input.dataset.customControl) {
    updateCustomControl(input);
  } else if (input.dataset.paletteTarget) {
    updatePaletteControl(input);
  } else {
    updateShaderControl(input);
  }
}

function addResetButton(input) {
  const controlItem = input.closest('.control-item');
  if (!controlItem) return;

  if (input.dataset.inlineControl === 'true') return;

  const inputRow = input.parentElement?.classList.contains('control-input-row')
    ? input.parentElement
    : document.createElement('div');

  if (!inputRow.parentElement) {
    inputRow.className = 'control-input-row';
    input.parentNode.insertBefore(inputRow, input);
    inputRow.append(input);
  }

  const label = controlItem.querySelector('.control-topline > span')?.textContent || 'parameter';
  const button = document.createElement('button');
  button.className = 'control-reset';
  button.type = 'button';
  button.title = `Reset ${label}`;
  button.setAttribute('aria-label', `Reset ${label} to default`);
  button.innerHTML = '<span aria-hidden="true">↺</span>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetControl(input);
  });

  inputRow.append(button);
}

function bindRefractionValueInput() {
  const rangeInput = document.querySelector('#glass-refraction');
  const valueInput = document.querySelector('#glass-refraction-value');
  if (!rangeInput || !valueInput) return;

  const min = Number(rangeInput.min);
  const max = Number(rangeInput.max);

  const restoreLastValidValue = () => {
    const fallback = valueInput.dataset.lastValidValue || rangeInput.value;
    valueInput.value = Number(fallback).toFixed(2);
    rangeInput.value = fallback;
    updateShaderControl(rangeInput);
  };

  const applyValue = () => {
    if (valueInput.value === '') return;

    const nextValue = Number(valueInput.value);
    if (!Number.isFinite(nextValue) || nextValue < min || nextValue > max) {
      restoreLastValidValue();
      return;
    }

    const normalizedValue = nextValue.toFixed(2);
    valueInput.value = normalizedValue;
    valueInput.dataset.lastValidValue = normalizedValue;
    rangeInput.value = normalizedValue;
    updateShaderControl(rangeInput);
  };

  valueInput.addEventListener('focus', () => {
    valueInput.dataset.lastValidValue = rangeInput.value;
  });
  valueInput.addEventListener('input', applyValue);
  valueInput.addEventListener('change', () => {
    if (valueInput.value === '') restoreLastValidValue();
    else applyValue();
  });
  valueInput.dataset.lastValidValue = rangeInput.value;
}

function bindControlPanel() {
  const panel = document.querySelector('#control-panel');
  const panelToggle = document.querySelector('#toggle-panel');

  const setPanelExpanded = (expanded) => {
    if (!panel || !panelToggle) return;

    panel.classList.toggle('is-collapsed', !expanded);
    panel.setAttribute('aria-hidden', String(!expanded));
    panel.toggleAttribute('inert', !expanded);
    if ('inert' in panel) panel.inert = !expanded;
    panelToggle.setAttribute('aria-expanded', String(expanded));
    panelToggle.setAttribute('aria-label', expanded ? 'Collapse parameter panel' : 'Expand parameter panel');
    panelToggle.setAttribute('title', expanded ? 'Collapse parameter panel' : 'Expand parameter panel');

    if (!expanded && panel.contains(document.activeElement)) {
      panelToggle.focus();
    }
  };

  panelToggle?.addEventListener('click', () => {
    const expanded = panelToggle.getAttribute('aria-expanded') === 'true';
    setPanelExpanded(!expanded);
  });

  const shaderControls = document.querySelectorAll('[data-shader-id]');
  shaderControls.forEach((input) => {
    input.dataset.defaultValue = input.value;
    input.addEventListener('input', () => updateShaderControl(input));
    input.addEventListener('change', () => updateShaderControl(input));
    updateOutput(input);
    addResetButton(input);
  });
  bindRefractionValueInput();

  const customControls = document.querySelectorAll('[data-custom-control]');
  customControls.forEach((input) => {
    input.dataset.defaultValue = input.type === 'checkbox' ? String(input.checked) : input.value;
    const isVolumeControl = input.dataset.customControl === 'media-volume';
    input.addEventListener('input', () => updateCustomControl(input, { unmuteOnVolumeChange: isVolumeControl }));
    input.addEventListener('change', () => updateCustomControl(input, { unmuteOnVolumeChange: isVolumeControl }));
    updateCustomControl(input);
    addResetButton(input);
  });

  document.querySelector('#video-mute-toggle')?.addEventListener('click', () => {
    const muteInput = document.querySelector('#video-mute');
    if (!muteInput) return;

    muteInput.checked = !muteInput.checked;
    muteInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  const paletteControls = document.querySelectorAll('[data-palette-target]');
  paletteControls.forEach((input) => {
    input.dataset.defaultValue = input.value;
    input.addEventListener('input', () => updatePaletteControl(input));
    input.addEventListener('change', () => updatePaletteControl(input));
    updatePaletteControl(input);
    addResetButton(input);
  });

  const mediaInput = document.querySelector('#base-image-upload');
  const mediaName = document.querySelector('#uploaded-image-name');
  const resetImageButton = document.querySelector('#reset-image');

  const resetBackgroundMedia = () => {
    clearBackgroundMedia();
  };

  mediaInput?.addEventListener('change', () => {
    const file = mediaInput.files?.[0];
    const isImage = file?.type.startsWith('image/');
    const isVideo = file?.type.startsWith('video/');
    if (!file || (!isImage && !isVideo)) return;

    const nextMediaUrl = URL.createObjectURL(file);
    const previousMediaUrl = activeMediaUrl;
    activeMediaUrl = nextMediaUrl;

    if (isVideo) {
      shaderInstance?.update('uploaded-image', { opacity: 0 });
      shaderInstance?.update('uploaded-video', { url: nextMediaUrl, loop: true, opacity: 1, visible: true });
      startMediaAudio(nextMediaUrl);
    } else {
      stopMediaAudio();
      shaderInstance?.update('uploaded-video', { url: '', loop: false, opacity: 0, visible: false });
      shaderInstance?.update('uploaded-image', { url: nextMediaUrl, opacity: 1 });
    }

    if (previousMediaUrl) window.setTimeout(() => URL.revokeObjectURL(previousMediaUrl), 5000);
    if (mediaName) mediaName.textContent = file.name;
    showUploadToast();
  });

  resetImageButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetBackgroundMedia();
  });

  document.querySelector('#reset-all')?.addEventListener('click', () => {
    [...shaderControls, ...customControls, ...paletteControls].forEach(resetControl);
    resetBackgroundMedia();
  });

  window.addEventListener('pointermove', markBloomPointerActivity, { passive: true });
  window.addEventListener('pointerdown', retryMediaAudioFromGesture, { passive: true });
  window.addEventListener('keydown', retryMediaAudioFromGesture, { passive: true });
  bloomDecayFrame = requestAnimationFrame(updateBloomDecayEnvelope);

  window.addEventListener('pagehide', () => {
    if (activeMediaUrl) URL.revokeObjectURL(activeMediaUrl);
  }, { once: true });
}

bindControlPanel();
initializePresetManager();

window.addEventListener('pagehide', () => {
  window.removeEventListener('pointermove', markBloomPointerActivity);
  window.removeEventListener('pointerdown', retryMediaAudioFromGesture);
  window.removeEventListener('keydown', retryMediaAudioFromGesture);
  if (bloomDecayFrame) cancelAnimationFrame(bloomDecayFrame);
  clearPresetVideoPreloader();
  stopMediaAudio();
  shaderInstance?.destroy();
});
