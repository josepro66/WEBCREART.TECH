/**
 * configStore.ts
 * ──────────────────────────────────────────────────────────────────
 * Capa ligera sobre localStorage para soportar MÚLTIPLES configuraciones
 * por modelo. Cada modelo tiene:
 *   - {modelo}_chosenColors    → borrador de colores que edita el configurador
 *   - {modelo}_activeConfigId   → a qué documento de Firestore mapea ese borrador
 *   - {modelo}_currentView      → vista 3D actual (la usa el configurador)
 *
 * El usuario puede tener varias configs del mismo modelo. La "config activa"
 * es la que se está editando ahora y a la que apunta el auto-guardado.
 */

export const MODELS = ['beato', 'knobo', 'mixo', 'beato16', 'loopo', 'fado', 'wavo'] as const
export type Modelo = typeof MODELS[number]

export const lsColors = (m: string) => `${m}_chosenColors`
export const lsActiveId = (m: string) => `${m}_activeConfigId`
export const lsView = (m: string) => `${m}_currentView`

export const getActiveConfigId = (m: string): string | null =>
  localStorage.getItem(lsActiveId(m))

export const setActiveConfigId = (m: string, id: string): void =>
  localStorage.setItem(lsActiveId(m), id)

/**
 * Empieza una configuración NUEVA: limpia el borrador y el id activo para
 * que el configurador arranque desde cero y el auto-guardado cree un doc nuevo.
 */
export const startNewConfig = (m: string): void => {
  localStorage.removeItem(lsColors(m))
  localStorage.removeItem(lsActiveId(m))
  localStorage.removeItem(lsView(m))
}

/**
 * Abre una configuración EXISTENTE: fija el id activo y carga sus colores
 * en el borrador para que el configurador los muestre.
 */
export const openExistingConfig = (m: string, configId: string, colores: unknown): void => {
  localStorage.setItem(lsActiveId(m), configId)
  localStorage.setItem(lsColors(m), JSON.stringify(colores))
  localStorage.removeItem(lsView(m))
}

// El BEATO8 se guarda como modelo "beato" pero la ruta del configurador usa "beato8"
export const modeloToProduct = (m: string): string => (m === 'beato' ? 'beato8' : m)
export const productToModelo = (p: string): string => (p === 'beato8' ? 'beato' : p)
