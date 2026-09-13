const { response } = require("express")

const esAdminRole = (req, res = response, next) => {

    if (!req.usuario) {
        return res.status(500).json({
            msg: 'Se quiere verificar el role, sin validar el token primero'
        })
    }

    const { rol, nombre } = req.usuario;
    if (!((rol == 'ADMIN_ROLE') || (rol =="ROOT"))) {
        return res.status(401).json({
            msg: `${nombre} no es administrador - No puede hacer esto`
        });
    }
    next();
}
const esRootRole = (req, res = response, next) => {

    if (!req.usuario) {
        return res.status(500).json({
            msg: 'Se quiere verificar el role, sin validar el token primero'
        })
    }

    const { rol, nombre } = req.usuario;
    if (!(rol == 'ROOT')) {
        return res.status(401).json({
            msg: `${nombre} no tiene los privilegios para realizar esta accion. `
        });
    }
    next();
}
const esClienteRole = (req, res = response, next) => {

    if (!req.usuario) {
        return res.status(500).json({
            msg: 'Se quiere verificar el role, sin validar el token primero'
        })
    }

    const { rol, nombre } = req.usuario;
    if (!(rol == 'CLIENTE')) {
        return res.status(401).json({
            msg: `${nombre} no es administrador - No puede hacer esto 1`
        });
    }
    next();
}


const esTenderoRole = (req, res = response, next) => {

    if (!req.usuario) {
        return res.status(500).json({
            msg: 'Se quiere verificar el role, sin validar el token primero'
        })
    };

    const { rol, nombre } = req.usuario;

    if (!(rol == 'TENDERO')) {
        return res.status(401).json({
            msg: `${nombre} no es Tendero - No puede hacer esto`
        });
    };
    next();
}


const tieneRole = (...roles) => {
    return (req, res = response, next) => {

        if (!req.usuario) {
            return res.status(500).json({
                msg: 'Se quiere verificar el role, sin validar el token primero'
            })
        }

        const { rol, nombre } = req.usuario;
        const existeRol= roles.includes(rol);
        
        if (!existeRol) {
            return res.status(401).json({
                msg: `${nombre} no es administrador - No puede hacer esto2`
            });
        }

        next();
    }
}
module.exports = {
    esAdminRole,
    tieneRole,
    esTenderoRole,
    esRootRole,
    esClienteRole
}