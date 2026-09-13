
const { Router } = require('express');
const { check } = require('express-validator');
const { crearNuevaCuenta, obtenerCuentas, obtenerCuentasID, resumen } = require('../controllers');
const { defaultMethod } = require('../helpers');

const { validarCampos, validarJWT, esTenderoRole, esAdminRole } = require('../middlewares')


const router = new Router();

router.get('/',[
    validarJWT,
    validarCampos
], obtenerCuentas);

router.get('/resumen',[
    validarJWT,
    validarCampos
], resumen);

// router.get('/resumen/:id',[
//     validarJWT,
//     esAdminRole,
//     check('id', 'Ingrese un idValido').isMongoId(),
//     check('id').custom(idExiste),
//     validarCampos
// ], resumen);

router.get('/:id',[
    validarJWT,
    esAdminRole,
    check('id','Ingrese un Id valido').isMongoId(),
    validarCampos
], obtenerCuentasID);

router.post('/new', [
    validarJWT,
    esTenderoRole,
    check('descripcion', 'La descripcion es obligatoria').not().isEmpty(),
    check('valor', 'Ingrese un valor correcto').isNumeric(),
    check('clienteID','Ingrese un cliente, este es un campo obligatorio').not().isEmpty(),
    check('clienteID','Ingrese un ID valido').isMongoId(),
    validarCampos
], crearNuevaCuenta)

defaultMethod(router);

module.exports = router;