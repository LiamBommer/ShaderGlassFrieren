/**
 * Source-controlled online default.
 *
 * These values were exported from the Preset1 state in the local Demo.
 * Keep the control IDs aligned with the controls in index.html so the same
 * object can initialize the UI, the built-in Default preset, and Preset1.
 */
export const PRESET1_DEFAULT = Object.freeze({
  name: 'Preset1',
  controls: Object.freeze({
    'video-volume': '20',
    'video-mute': 'true',
    'image-opacity': '10',
    'swirl-color-a': '#ffffff',
    'swirl-color-b': '#ededee',
    'swirl-detail': '1.2',
    'chroma-base': '#ffffff',
    'chroma-up': '#7f66ff',
    'chroma-down': '#9bc5e5',
    'chroma-left': '#56c2fc',
    'chroma-right': '#5b4fff',
    'chroma-momentum': '10',
    'chroma-radius': '5',
    'chroma-dissipation': '0',
    'glass-shape': 'bars',
    'glass-angle': '-8',
    'glass-frequency': '3',
    'glass-refraction': '0.15',
    'glass-aberration': '0.8',
    'glass-softness': '1',
    'glass-speed': '0.4',
    'glass-highlight': '0.14',
    'glass-highlight-softness': '0',
    'glass-light-angle': '1',
    'palette-canvas': '#ffffff',
    'palette-ink': '#16161d',
    'palette-indigo': '#9bc5e5',
    'grain-strength': '0.16',
  }),
  media: Object.freeze({
    url: new URL('../Frieren.mov', import.meta.url).href,
    name: 'Frieren.mov',
  }),
});

export default PRESET1_DEFAULT;
