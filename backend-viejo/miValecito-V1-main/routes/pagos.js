
const { Router } = require('express');
const { check } = require('express-validator');
const { nuevoPago } = require('../controllers');
const { defaultMethod, cuentaCerrada } = require('../helpers');

const { validarCampos, validarJWT, esTenderoRole, esAdminRole } = require('../middlewares')


const router = new Router();

router.post('/new', [
    check('idCuenta','No ingreso un ID valido.').isMongoId(),
    check('idCuenta').custom(cuentaCerrada),
    check('valorPago', 'Ingrese el valor a pagar').notEmpty(),
    check('valorPago', 'Ingrese un valor correcto, recuerde es numerico sin puntos, comas o demas caracteres').isNumeric(),
    check('medioPago','Ingrese el medio de pago').notEmpty(),
    validarCampos
], nuevoPago)

defaultMethod(router);

module.exports = router;