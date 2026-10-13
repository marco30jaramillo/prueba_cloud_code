/**
 * Límites de envío (condición 5 de la revisión de seguridad), con conteo persistente: se
 * leen de la auditoría de envíos, no de memoria, de modo que sobreviven a reinicios y a
 * varias instancias.
 *
 *  - por destinatario y grupo de plantillas: 3 por hora y 10 por día;
 *  - espera mínima de 60 s entre dos envíos al mismo destinatario y grupo;
 *  - tope global: 200 correos por hora (interruptor de la cuota del servicio).
 *
 * Una plantilla puede declarar `limits` propios (ver passwordChanged).
 */

const DEFAULT_LIMITS = {
  perHour: 3,
  perDay: 10,
  minGapSeconds: 60,
  globalPerHour: 200,
};

/**
 * @param {{countActivity: Function, limits?: object}} deps
 *        `countActivity({to, group, gapSeconds})` -> { inGap, lastHour, lastDay, globalHour }
 */
function createMailLimits({ countActivity, limits = {} }) {
  const base = { ...DEFAULT_LIMITS, ...limits };

  return {
    /**
     * @returns {Promise<{allowed:boolean, reason?:string}>}
     * Ante un error al contar NO se permite el envío (falla cerrada).
     */
    async check({ to, group, templateLimits = {} }) {
      const rule = { ...base, ...templateLimits };
      let usage;
      try {
        usage = await countActivity({ to, group, gapSeconds: rule.minGapSeconds });
      } catch {
        return { allowed: false, reason: 'limit_check_failed' };
      }
      if (usage.globalHour >= rule.globalPerHour) {
        console.warn('[mail] tope global de correos por hora alcanzado; se descartan envíos');
        return { allowed: false, reason: 'global_hour_cap' };
      }
      if (rule.minGapSeconds > 0 && usage.inGap > 0) return { allowed: false, reason: 'min_gap' };
      if (usage.lastHour >= rule.perHour) return { allowed: false, reason: 'recipient_hour_cap' };
      if (usage.lastDay >= rule.perDay) return { allowed: false, reason: 'recipient_day_cap' };
      return { allowed: true };
    },
  };
}

module.exports = { createMailLimits, DEFAULT_LIMITS };
