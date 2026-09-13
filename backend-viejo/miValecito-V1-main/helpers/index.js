const dbValidator = require('./db-validators');
const generarJWT = require('./generar-JWT');
const defaultpage404 = require('./answer_default');
// const googleVerifity = require('./z_google-verifity');
// const subirArchivo = require('./z_subir-archivo');
// const crearCarpeta = require('./z_archivos');

module.exports={
    ...dbValidator,
    ...generarJWT,
    ...defaultpage404
    // ...googleVerifity,
    // ...subirArchivo,
    // ...crearCarpeta
}
