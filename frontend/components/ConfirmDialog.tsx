'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Icon, type NombreIcono } from './Icon';
import styles from './ConfirmDialog.module.scss';

export type TonoConfirmacion = 'peligro' | 'aviso' | 'info';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: React.ReactNode;
  /** Texto del botón que acepta. Por defecto "Confirmar". */
  confirmar?: string;
  /** Texto del botón que cancela. Por defecto "Cancelar". */
  cancelar?: string;
  /** Color e icono del cuadro: `peligro` para acciones que no se deshacen. Por defecto `aviso`. */
  tono?: TonoConfirmacion;
  icono?: NombreIcono;
}

type Confirmar = (opciones: OpcionesConfirmacion) => Promise<boolean>;

const ConfirmContext = createContext<Confirmar | null>(null);

const ICONO_POR_TONO: Record<TonoConfirmacion, NombreIcono> = {
  peligro: 'alerta',
  aviso: 'alerta',
  info: 'informacion'
};

/**
 * Sustituye a `window.confirm()` con un cuadro de la marca. Uso:
 *   const confirmar = useConfirm();
 *   if (!(await confirmar({ titulo: '¿Anular?', mensaje: '...', tono: 'peligro' }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirmacion | null>(null);
  const [visible, setVisible] = useState(false);
  const resolver = useRef<((valor: boolean) => void) | null>(null);

  const confirmar = useCallback<Confirmar>((nuevas) => {
    // Si había uno abierto, se da por cancelado antes de abrir el siguiente.
    resolver.current?.(false);
    setOpciones(nuevas);
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const cerrar = (valor: boolean) => {
    resolver.current?.(valor);
    resolver.current = null;
    setVisible(false);
  };

  const tono = opciones?.tono ?? 'aviso';

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal
        show={visible}
        onHide={() => cerrar(false)}
        onExited={() => setOpciones(null)}
        centered
        size="sm"
        className={styles.modal}
        backdropClassName={styles.backdrop}
        aria-labelledby="confirm-dialog-titulo"
      >
        {opciones && (
          <>
            <Modal.Body className={styles.cuerpo}>
              <span className={`${styles.icono} ${styles[tono]}`}>
                <Icon name={opciones.icono ?? ICONO_POR_TONO[tono]} size={28} />
              </span>
              <h2 id="confirm-dialog-titulo" className={styles.titulo}>{opciones.titulo}</h2>
              <div className={styles.mensaje}>{opciones.mensaje}</div>
            </Modal.Body>
            <Modal.Footer className={styles.pie}>
              <Button variant="light" onClick={() => cerrar(false)}>
                {opciones.cancelar ?? 'Cancelar'}
              </Button>
              <Button
                variant={tono === 'peligro' ? 'danger' : 'primary'}
                onClick={() => cerrar(true)}
                autoFocus
              >
                {opciones.confirmar ?? 'Confirmar'}
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirmar {
  const confirmar = useContext(ConfirmContext);
  if (!confirmar) throw new Error('Falta <ConfirmProvider> en app/layout.tsx');
  return confirmar;
}
