
const { Router } = require('express');
const { check } = require('express-validator');

const { getUsuarios, deleteUsuarios, CrearTendero, CrearCliente, actualizarUsuario, CrearAdministrador } = require('../controllers');
const { emailExiste, idExiste, defaultMethod } = require('../helpers');
const { validarCampos, validarJWT, tieneRole, esRootRole } = require('../middlewares');
const { esAdminRole } = require('../middlewares/validar-roles');


const router = new Router();

router.get('/',[
     validarJWT,
     esAdminRole,
     validarCampos
], getUsuarios);

router.put('/', [
     validarJWT,
     validarCampos
],actualizarUsuario);

router.post('/tendero', [
     check('nombreTienda', 'El nombre de la tienda es obligatorio').not().isEmpty(),
     check('tipoIdentificacion', 'El tipoIdentificacion es obligatorio').not().isEmpty(),
     check('identificacion', 'La identificacion es obligatoria').not().isEmpty(),
     check('representantelegal', 'El representantelegal es obligatorio').not().isEmpty(),
     check('direccion', 'El direccion es obligatorio').not().isEmpty(),
     check('numCelular', 'El numCelular es obligatorio').not().isEmpty(),
     check('correoPrincipal', 'El correoPrincipal es obligatorio').not().isEmpty(),
     check('password', 'El password debe contener mas de 6 caracteres').isLength({ min: 6 }),
     check('password', 'El password es obligatorio').not().isEmpty(),
     check('correoPrincipal', 'El correo no es valido').isEmail(),
     check('correoPrincipal').custom(emailExiste),
     validarCampos
], CrearTendero);

router.post('/cliente', [
     check('nombre', 'El nombre es obligatorio').not().isEmpty(),
     check('tipoIdentificacion', 'El tipoIdentificacion es obligatorio').not().isEmpty(),
     check('identificacion', 'La identificacion es obligatoria').not().isEmpty(),
     check('direccion', 'El direccion es obligatorio').not().isEmpty(),
     check('numCelular', 'El numCelular es obligatorio').not().isEmpty(),
     check('correoPrincipal', 'El correoPrincipal es obligatorio').not().isEmpty(),
     check('password', 'El password debe contener mas de 6 caracteres').isLength({ min: 6 }),
     check('password', 'El password es obligatorio').not().isEmpty(),
     check('correoPrincipal', 'El correo no es valido').isEmail(),
     check('correoPrincipal').custom(emailExiste),
     validarCampos
], CrearCliente);

router.post('/admin', [
     validarJWT,
     esRootRole,
     check('nombre', 'El nombre es obligatorio').not().isEmpty(),
     check('tipoIdentificacion', 'El tipoIdentificacion es obligatorio').not().isEmpty(),
     check('identificacion', 'La identificacion es obligatoria').not().isEmpty(),
     check('direccion', 'El direccion es obligatorio').not().isEmpty(),
     check('numCelular', 'El numCelular es obligatorio').not().isEmpty(),
     check('correoPrincipal', 'El correoPrincipal es obligatorio').not().isEmpty(),
     check('password', 'El password debe contener mas de 6 caracteres').isLength({ min: 6 }),
     check('password', 'El password es obligatorio').not().isEmpty(),
     check('correoPrincipal', 'El correo no es valido').isEmail(),
     check('correoPrincipal').custom(emailExiste),
     validarCampos
], CrearAdministrador);

router.delete('/:id', [
     validarJWT,
     esAdminRole,
     check('id', 'No es un id Valido').isMongoId(),
     check('id').custom(idExiste),
     validarCampos
], deleteUsuarios);

defaultMethod(router);

module.exports = router;