'use client'

import { useEffect } from 'react'

/**
 * Bloqueo del scroll del `body` con contador compartido.
 *
 * Por que un contador y no que cada capa guarde y restaure lo que habia
 * -------------------------------------------------------------------
 * El patron ingenuo es que cada modal recuerde el `overflow` anterior y lo
 * devuelva al cerrarse. Con dos capas encimadas eso se rompe: si el modal de
 * arriba se monta mientras el de abajo tiene el body en `hidden`, guarda
 * `hidden` como "valor anterior" y, al cerrarse el ultimo, lo deja en `hidden`
 * para siempre. La pagina queda sin poder desplazarse hasta recargar.
 *
 * Con un contador solo la primera capa aplica el bloqueo y solo la ultima lo
 * suelta, sin importar en que orden se abran o se cierren.
 *
 * Ademas se compensa el ancho de la barra de desplazamiento con `padding-right`.
 * Al poner `overflow: hidden` la barra desaparece y todo el contenido salta unos
 * pixeles a la derecha; ese salto se percibe como un tiron al abrir cualquier
 * ventana.
 */

let lockCount = 0
let previousOverflow = ''
let previousPaddingRight = ''

function applyLock() {
  const body = document.body
  previousOverflow = body.style.overflow
  previousPaddingRight = body.style.paddingRight

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  if (scrollbarWidth > 0) {
    const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0
    body.style.paddingRight = `${current + scrollbarWidth}px`
  }
  body.style.overflow = 'hidden'
}

function releaseLock() {
  const body = document.body
  body.style.overflow = previousOverflow
  body.style.paddingRight = previousPaddingRight
}

/** Suma una capa al bloqueo. Devuelve la funcion que la quita. */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}

  if (lockCount === 0) applyLock()
  lockCount += 1

  let released = false
  return () => {
    // Sin esta guarda, un cleanup ejecutado dos veces (React en modo estricto)
    // descontaria de mas y soltaria el bloqueo con una capa todavia abierta.
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) releaseLock()
  }
}

/**
 * Bloquea el scroll mientras `active` sea verdadero.
 *
 * Solo depende de `active`: si dependiera de callbacks recreados en cada render
 * del padre, se desbloquearia y volveria a bloquear en cada pulsacion de tecla,
 * forzando un recalculo de estilos de todo el documento. Ese era el origen del
 * scroll a tirones en la pantalla de citas.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    return lockBodyScroll()
  }, [active])
}
