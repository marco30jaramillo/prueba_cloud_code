const validarCampos = require('../middlewares/validar-campos');
const validarJWT = require('../middlewares/validar-JWT');
const validarRoles = require('../middlewares/validar-roles');
// const validarArchivosSubir = require('./z_validar-archivo')

module.exports={
    ...validarCampos,
    ...validarJWT,
    ...validarRoles
    // ...validarArchivosSubir
}