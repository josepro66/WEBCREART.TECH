/**
 * productIdentity.ts — Identidad visual y copy de venta por producto.
 *
 * Cada controlador Creart tiene su color, tagline y descripción corta para
 * el menú lateral del configurador y los CTAs de compra.
 */

export type ProductId =
  | 'beato8' | 'beato16' | 'knobo' | 'mixo'
  | 'loopo' | 'fado' | 'wavo'

export interface ProductIdentity {
  id: ProductId
  name: string
  /** Línea corta debajo del nombre, para vender en 3 palabras. */
  tagline: string
  /** Color identitario (tema del menú/CTAs cuando está seleccionado). */
  accent: string
  /** Gradiente para fondos y CTAs. */
  gradient: string
  /** Glow/sombra para hover y activo. */
  glow: string
  /** Etiqueta de estado: NUEVO / POPULAR / EDICIÓN LTD. */
  badge?: 'POPULAR' | 'NUEVO' | 'EDICIÓN LTD' | null
  /** Precio base en USD (anticipo $50, total estimado). */
  priceUsd: number
  /** Texto de venta para el CTA principal. */
  ctaCopy: {
    primary: string   // botón grande
    secondary: string // subtítulo
  }
}

export const PRODUCT_IDENTITY: Record<ProductId, ProductIdentity> = {
  beato8: {
    id: 'beato8',
    name: 'BEATO 8',
    tagline: 'Beats sin fricción',
    accent: '#C8FF4D',
    gradient: 'linear-gradient(135deg, #C8FF4D 0%, #9ec93a 100%)',
    glow: 'rgba(200, 255, 77, 0.45)',
    badge: 'POPULAR',
    priceUsd: 189,
    ctaCopy: {
      primary: 'Reservar mi Beato 8',
      secondary: '8 pads · 4 knobs · USB-C · plug-and-play',
    },
  },
  beato16: {
    id: 'beato16',
    name: 'BEATO 16',
    tagline: 'Más pads, más groove',
    accent: '#C8FF4D',
    gradient: 'linear-gradient(135deg, #d4ff6a 0%, #88c000 100%)',
    glow: 'rgba(200, 255, 77, 0.45)',
    badge: 'NUEVO',
    priceUsd: 249,
    ctaCopy: {
      primary: 'Reservar mi Beato 16',
      secondary: '16 pads · 4 knobs · 3 bancos · SHIFT integrado',
    },
  },
  knobo: {
    id: 'knobo',
    name: 'KNOBO',
    tagline: 'Control fino, total',
    accent: '#00E5FF',
    gradient: 'linear-gradient(135deg, #00E5FF 0%, #0093ff 100%)',
    glow: 'rgba(0, 229, 255, 0.45)',
    badge: null,
    priceUsd: 149,
    ctaCopy: {
      primary: 'Reservar mi Knobo',
      secondary: '8 encoders premium · CC mapeable · sin drivers',
    },
  },
  mixo: {
    id: 'mixo',
    name: 'MIXO',
    tagline: 'Tu DJ booth de bolsillo',
    accent: '#FF7A1A',
    gradient: 'linear-gradient(135deg, #FF7A1A 0%, #ff4a2a 100%)',
    glow: 'rgba(255, 122, 26, 0.45)',
    badge: null,
    priceUsd: 199,
    ctaCopy: {
      primary: 'Reservar mi Mixo',
      secondary: '4 faders · 8 botones · crossfader incluido',
    },
  },
  loopo: {
    id: 'loopo',
    name: 'LOOPO',
    tagline: 'Loops en vivo, al instante',
    accent: '#FF3D77',
    gradient: 'linear-gradient(135deg, #FF3D77 0%, #c8005a 100%)',
    glow: 'rgba(255, 61, 119, 0.45)',
    badge: null,
    priceUsd: 169,
    ctaCopy: {
      primary: 'Reservar mi Loopo',
      secondary: 'Looper físico · controles dedicados · plug-and-play',
    },
  },
  fado: {
    id: 'fado',
    name: 'FADO',
    tagline: 'Faders que sienten todo',
    accent: '#B07CFF',
    gradient: 'linear-gradient(135deg, #B07CFF 0%, #7536ff 100%)',
    glow: 'rgba(176, 124, 255, 0.45)',
    badge: null,
    priceUsd: 179,
    ctaCopy: {
      primary: 'Reservar mi Fado',
      secondary: '8 faders motorizados · respuesta táctil precisa',
    },
  },
  wavo: {
    id: 'wavo',
    name: 'WAVO',
    tagline: 'Sintetizador físico portátil',
    accent: '#B07CFF',
    gradient: 'linear-gradient(135deg, #B07CFF 0%, #6e3dff 100%)',
    glow: 'rgba(176, 124, 255, 0.45)',
    badge: 'EDICIÓN LTD',
    priceUsd: 329,
    ctaCopy: {
      primary: 'Reservar mi Wavo',
      secondary: 'Synth standalone + MIDI · pantalla integrada',
    },
  },
}

export function getProduct(id: ProductId): ProductIdentity {
  return PRODUCT_IDENTITY[id]
}
