const {Router} = require('express');
const { check } = require('express-validator');
const { login, googleSignIn } = require('../controllers');
const { defaultMethod } = require('../helpers');
const { validarCampos } = require('../middlewares');


const router = new Router();

router.post('/login',[
    check('correo', 'Correo invalido').isEmail(),
    check('password', 'La contraseña es requerida').not().isEmpty(),
    check('password','La contraseña debe contener mas de 6 caracteres').isLength(6),
    validarCampos
],login);

router.post('/google',[
    check('id_token', 'id_token es necesario').not().isEmpty(),
    validarCampos
],googleSignIn);

defaultMethod(router);

module.exports= router;