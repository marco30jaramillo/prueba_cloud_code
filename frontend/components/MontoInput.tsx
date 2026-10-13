'use client';

import React from 'react';
import { Form } from 'react-bootstrap';
import { soloDigitos, formatearMonto } from '@/lib/monto';

interface Props {
  /** Valor sin formato: cadena de dígitos ("25000"). */
  value: string;
  /** Recibe el valor sin formato (solo dígitos). */
  onChange: (valor: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Campo de monto en pesos enteros: acepta solo dígitos, muestra "$ 25.000"
 * (es-CO) y entrega al padre el valor sin formato. Sin min/step, por lo que
 * no hay rejilla de valores válidos.
 */
export default function MontoInput({
  value, onChange, placeholder = '$ 0', required, disabled, className, style,
}: Props) {
  const formateado = formatearMonto(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value.replace(/[^\d]/g, ''));
  }

  return (
    <Form.Control
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={formateado}
      onChange={handleChange}
      required={required}
      disabled={disabled}
      className={className}
      style={style}
    />
  );
}
