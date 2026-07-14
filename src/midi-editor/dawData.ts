/**
 * dawData.ts — Catálogo de DAWs, acciones y presets de shift.
 * Portado del HTML standalone creart-beato16-fixed.html.
 */

export interface DawDef {
  id: string
  name: string
}

export const DAWS: DawDef[] = [
  { id: 'ableton', name: 'Ableton Live' },
  { id: 'logic', name: 'Logic Pro' },
  { id: 'protools', name: 'Pro Tools' },
  { id: 'flstudio', name: 'FL Studio' },
  { id: 'cubase', name: 'Cubase' },
  { id: 'reaper', name: 'Reaper' },
  { id: 'bitwig', name: 'Bitwig Studio' },
]

export interface DawAction {
  id: string
  name: string
  shortName: string
  shortcuts: Record<string, { mac: string | null; win: string | null }>
  isCustom?: boolean
}

export const DAW_ACTIONS: DawAction[] = [
  { id: 'play_stop', name: 'Play / Stop', shortName: 'Play', shortcuts: { ableton: { mac: 'Space', win: 'Space' }, logic: { mac: 'Space', win: 'Space' }, protools: { mac: 'Space', win: 'Space' }, flstudio: { mac: 'Space', win: 'Space' }, cubase: { mac: 'Space', win: 'Space' }, reaper: { mac: 'Space', win: 'Space' }, bitwig: { mac: 'Space', win: 'Space' } } },
  { id: 'record', name: 'Record', shortName: 'Rec', shortcuts: { ableton: { mac: 'F9', win: 'F9' }, logic: { mac: 'R', win: 'R' }, protools: { mac: 'Cmd+Space', win: 'Ctrl+Space' }, flstudio: { mac: null, win: 'Num 0' }, cubase: { mac: '*', win: '*' }, reaper: { mac: 'Cmd+R', win: 'Ctrl+R' }, bitwig: { mac: 'Num *', win: 'Num *' } } },
  { id: 'quantize', name: 'Quantize', shortName: 'Quant', shortcuts: { ableton: { mac: 'Cmd+U', win: 'Ctrl+U' }, logic: { mac: 'Q', win: 'Q' }, protools: { mac: 'Cmd+U', win: 'Ctrl+U' }, flstudio: { mac: 'Cmd+Q', win: 'Ctrl+Q' }, cubase: { mac: 'Q', win: 'Q' }, reaper: { mac: null, win: null }, bitwig: { mac: 'Cmd+Shift+Q', win: 'Ctrl+Shift+Q' } } },
  { id: 'quantize_settings', name: 'Quantize Settings / 50%', shortName: 'Quant 50%', shortcuts: { ableton: { mac: 'Cmd+Shift+U', win: 'Ctrl+Shift+U' }, logic: { mac: null, win: null }, protools: { mac: null, win: null }, flstudio: { mac: 'Cmd+Alt+Q', win: 'Ctrl+Alt+Q' }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'undo', name: 'Undo', shortName: 'Undo', shortcuts: { ableton: { mac: 'Cmd+Z', win: 'Ctrl+Z' }, logic: { mac: 'Cmd+Z', win: 'Ctrl+Z' }, protools: { mac: 'Cmd+Z', win: 'Ctrl+Z' }, flstudio: { mac: 'Cmd+Z', win: 'Ctrl+Z' }, cubase: { mac: 'Cmd+Z', win: 'Ctrl+Z' }, reaper: { mac: 'Cmd+Z', win: 'Ctrl+Z' }, bitwig: { mac: 'Cmd+Z', win: 'Ctrl+Z' } } },
  { id: 'redo', name: 'Redo', shortName: 'Redo', shortcuts: { ableton: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' }, logic: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' }, protools: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' }, flstudio: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' }, cubase: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' }, reaper: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' }, bitwig: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' } } },
  { id: 'loop_toggle', name: 'Loop Toggle', shortName: 'Loop', shortcuts: { ableton: { mac: 'Cmd+L', win: 'Ctrl+L' }, logic: { mac: 'C', win: 'C' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: '/', win: '/' }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'clear', name: 'Clear / Delete Notes', shortName: 'Clear', shortcuts: { ableton: { mac: 'Cmd+Backspace', win: 'Ctrl+Backspace' }, logic: { mac: 'Cmd+A then Delete', win: 'Ctrl+A then Delete' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'capture_midi', name: 'Capture MIDI', shortName: 'Capture', shortcuts: { ableton: { mac: 'Cmd+Shift+F8', win: 'Ctrl+Shift+F8' }, logic: { mac: null, win: null }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'new_clip', name: 'Insert / New Empty Clip', shortName: 'New Clip', shortcuts: { ableton: { mac: 'Cmd+Shift+M', win: 'Ctrl+Shift+M' }, logic: { mac: null, win: null }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: 'Cmd+I', win: 'Ctrl+I' }, bitwig: { mac: null, win: null } } },
  { id: 'duplicate', name: 'Duplicate', shortName: 'Dup', shortcuts: { ableton: { mac: 'Cmd+D', win: 'Ctrl+D' }, logic: { mac: 'Cmd+D', win: 'Ctrl+D' }, protools: { mac: 'Cmd+D', win: 'Ctrl+D' }, flstudio: { mac: 'Cmd+D', win: 'Ctrl+D' }, cubase: { mac: 'Cmd+D', win: 'Ctrl+D' }, reaper: { mac: 'Cmd+D', win: 'Ctrl+D' }, bitwig: { mac: 'Cmd+D', win: 'Ctrl+D' } } },
  { id: 'follow', name: 'Follow / Scroll Playhead', shortName: 'Follow', shortcuts: { ableton: { mac: 'Shift+Tab', win: 'Shift+Tab' }, logic: { mac: 'Cmd+Shift+J', win: 'Ctrl+Shift+J' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'copy', name: 'Copy', shortName: 'Copy', shortcuts: { ableton: { mac: 'Cmd+C', win: 'Ctrl+C' }, logic: { mac: 'Cmd+C', win: 'Ctrl+C' }, protools: { mac: 'Cmd+C', win: 'Ctrl+C' }, flstudio: { mac: 'Cmd+C', win: 'Ctrl+C' }, cubase: { mac: 'Cmd+C', win: 'Ctrl+C' }, reaper: { mac: 'Cmd+C', win: 'Ctrl+C' }, bitwig: { mac: 'Cmd+C', win: 'Ctrl+C' } } },
  { id: 'paste', name: 'Paste', shortName: 'Paste', shortcuts: { ableton: { mac: 'Cmd+V', win: 'Ctrl+V' }, logic: { mac: 'Cmd+V', win: 'Ctrl+V' }, protools: { mac: 'Cmd+V', win: 'Ctrl+V' }, flstudio: { mac: 'Cmd+V', win: 'Ctrl+V' }, cubase: { mac: 'Cmd+V', win: 'Ctrl+V' }, reaper: { mac: 'Cmd+V', win: 'Ctrl+V' }, bitwig: { mac: 'Cmd+V', win: 'Ctrl+V' } } },
  { id: 'zoom_selection', name: 'Zoom to Selection', shortName: 'Zoom', shortcuts: { ableton: { mac: 'Cmd+Shift+E', win: 'Ctrl+Shift+E' }, logic: { mac: 'Cmd+Shift+Z', win: 'Ctrl+Shift+Z' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'save', name: 'Save', shortName: 'Save', shortcuts: { ableton: { mac: 'Cmd+S', win: 'Ctrl+S' }, logic: { mac: 'Cmd+S', win: 'Ctrl+S' }, protools: { mac: 'Cmd+S', win: 'Ctrl+S' }, flstudio: { mac: 'Cmd+S', win: 'Ctrl+S' }, cubase: { mac: 'Cmd+S', win: 'Ctrl+S' }, reaper: { mac: 'Cmd+S', win: 'Ctrl+S' }, bitwig: { mac: 'Cmd+S', win: 'Ctrl+S' } } },
  { id: 'metronome', name: 'Metronome', shortName: 'Metro', shortcuts: { ableton: { mac: null, win: null }, logic: { mac: 'K', win: 'K' }, protools: { mac: 'Cmd+7', win: 'Ctrl+7' }, flstudio: { mac: null, win: null }, cubase: { mac: 'C', win: 'C' }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'overdub', name: 'Overdub Toggle', shortName: 'Overdub', shortcuts: { ableton: { mac: null, win: null }, logic: { mac: null, win: null }, protools: { mac: 'N', win: 'N' }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'semitone_down', name: 'Semitone -', shortName: 'Semi -', shortcuts: { ableton: { mac: 'Alt+Down', win: 'Alt+Down' }, logic: { mac: 'Alt+Down', win: 'Alt+Down' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'semitone_up', name: 'Semitone +', shortName: 'Semi +', shortcuts: { ableton: { mac: 'Alt+Up', win: 'Alt+Up' }, logic: { mac: 'Alt+Up', win: 'Alt+Up' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'octave_down', name: 'Octave -', shortName: 'Oct -', shortcuts: { ableton: { mac: 'Shift+Alt+Down', win: 'Shift+Alt+Down' }, logic: { mac: 'Shift+Alt+Down', win: 'Shift+Alt+Down' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'octave_up', name: 'Octave +', shortName: 'Oct +', shortcuts: { ableton: { mac: 'Shift+Alt+Up', win: 'Shift+Alt+Up' }, logic: { mac: 'Shift+Alt+Up', win: 'Shift+Alt+Up' }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'step_undo', name: 'Step Undo', shortName: 'St.Undo', shortcuts: { ableton: { mac: null, win: null }, logic: { mac: null, win: null }, protools: { mac: null, win: null }, flstudio: { mac: 'Cmd+Alt+Z', win: 'Ctrl+Alt+Z' }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'step_redo', name: 'Step Redo', shortName: 'St.Redo', shortcuts: { ableton: { mac: null, win: null }, logic: { mac: null, win: null }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'nudge_left', name: 'Nudge Izquierda', shortName: 'Nudge <', shortcuts: { ableton: { mac: null, win: null }, logic: { mac: null, win: null }, protools: { mac: ',', win: ',' }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'nudge_right', name: 'Nudge Derecha', shortName: 'Nudge >', shortcuts: { ableton: { mac: null, win: null }, logic: { mac: null, win: null }, protools: { mac: '.', win: '.' }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'tap_tempo', name: 'Tap Tempo', shortName: 'Tap', shortcuts: { ableton: { mac: null, win: null }, logic: { mac: null, win: null }, protools: { mac: null, win: null }, flstudio: { mac: null, win: null }, cubase: { mac: null, win: null }, reaper: { mac: null, win: null }, bitwig: { mac: null, win: null } } },
  { id: 'custom', name: 'Atajo personalizado', shortName: 'Custom', shortcuts: {}, isCustom: true },
  { id: 'none', name: 'Sin asignar', shortName: '', shortcuts: {} },
]

export const DAW_PRESETS: Record<string, string[]> = {
  ableton:  ['play_stop','record','quantize','quantize_settings','undo','redo','loop_toggle','clear','capture_midi','new_clip','duplicate','follow','copy','paste','zoom_selection','save'],
  logic:    ['play_stop','record','quantize','metronome','undo','redo','loop_toggle','follow','duplicate','copy','paste','semitone_down','semitone_up','octave_down','octave_up','save'],
  protools: ['play_stop','record','quantize','overdub','undo','redo','nudge_left','nudge_right','metronome','copy','paste','duplicate','none','none','none','save'],
  flstudio: ['play_stop','record','quantize','quantize_settings','undo','step_undo','redo','none','copy','paste','duplicate','none','none','none','none','save'],
  cubase:   ['play_stop','record','quantize','metronome','undo','redo','loop_toggle','copy','paste','duplicate','none','none','none','none','none','save'],
  reaper:   ['play_stop','record','undo','redo','copy','paste','duplicate','new_clip','none','none','none','none','none','none','none','save'],
  bitwig:   ['play_stop','record','quantize','undo','redo','copy','paste','duplicate','none','none','none','none','none','none','none','save'],
}

export function isMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}

export function shortcutLabel(actionId: string, dawId: string): string {
  if (actionId === 'none') return '—'
  const action = DAW_ACTIONS.find((a) => a.id === actionId)
  if (!action) return '—'
  const sc = action.shortcuts[dawId]
  if (!sc) return 'sin atajo nativo'
  const val = isMac() ? sc.mac : sc.win
  return val || 'sin atajo nativo'
}

// Mapeo de acción → ID numérico para SysEx (espejo del firmware)
export const SHIFT_ACTION_IDS: Record<string, number> = {
  none: 0, play_stop: 1, record: 2, quantize: 3, quantize_settings: 4,
  undo: 5, redo: 6, copy: 7, paste: 8, clear: 9, duplicate: 10, save: 11,
  loop_toggle: 12, metronome: 13, tap_tempo: 14, overdub: 15, capture_midi: 16,
  follow: 17, new_clip: 18, zoom_selection: 19, semitone_down: 20, semitone_up: 21,
  octave_down: 22, octave_up: 23, step_undo: 24, step_redo: 25,
  nudge_left: 26, nudge_right: 27, custom: 28,
}
