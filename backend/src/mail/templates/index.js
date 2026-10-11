/**
 * Registro de plantillas por nombre. Para agregar un correo nuevo:
 *   1. crear su archivo en esta carpeta con { group, subject(data), render(data) };
 *   2. registrarlo aquí con su nombre;
 *   3. llamar mailService.send('<nombre>', { to, data }) donde corresponda.
 * No hay que tocar el servicio, los transportes ni los demás correos.
 */
module.exports = {
  activationSelf: require('./activationSelf'),
  activationByOther: require('./activationByOther'),
  activationStaff: require('./activationStaff'),
  passwordReset: require('./passwordReset'),
  passwordChanged: require('./passwordChanged'),
};
