const { response } = require("express");
const { Cuenta, Usuario } = require('../models');
const Auditoria = require("../models/Auditoria");
const {Pago} = require("../models");

//OBTENER TODAS LAS CUENTAS
const obtenerCuentas = async (req, res = response) => {
    const { limite = 5, desde = 0, close = false } = req.query;

    //RECUPERA TODAS LAS CUENTAS DE UN TENDERO EN ESPECIFICO ENVIADO POR JWT
    if (req.usuario.rol == "TENDERO") {
        try {
            const [totalCuentas, totalcerradas, cuentas] = await Promise.all([
                Cuenta.count({ estado: true, tendero: req.usuario._id }),

                Cuenta.count({ estado: true, tendero: req.usuario._id, cerrado: true }),

                Cuenta.find({ estado: true, tendero: req.usuario._id })
                    .populate({
                        path: 'tendero',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .populate({
                        path: 'cliente',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .skip(desde)
                    .limit(limite)
            ]);
            const totalAbiertas = totalCuentas - totalcerradas;
            const total = cuentas.length
            return res.status(200).json({
                msg: `Status 200 -TENDERO`,
                totalEnBasedeDatos: totalCuentas,
                totalAbiertas: totalAbiertas,
                totalCerradas: totalcerradas,
                totalenConsulta: total,
                cuentas
            });
        } catch (err) {
            return res.status(400).json({
                msg: "Hubo un error al procesar su consulta, intente luego"
            })
        }
        //RECUPERA TODAS LAS CUENTAS DEL CLIENTE EN ESPECIFICO ENVIADO POR JWT
    } else if (req.usuario.rol == "CLIENTE") {
        try {
            const [totalCuentas, cuentas] = await Promise.all([
                Cuenta.count({ estado: true, cliente: req.usuario._id }),

                Cuenta.find({ estado: true, cliente: req.usuario._id })
                    .populate({
                        path: 'tendero',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .populate({
                        path: 'cliente',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .skip(desde)
                    .limit(limite)
            ]);

            const total = cuentas.length
            return res.status(200).json({
                msg: `Status 200 - CLIENTE`,
                totalEnBasedeDatos: totalCuentas,
                totalConsulta: total,
                cuentas
            });
        } catch (err) {
            return res.status(400).json({
                msg: "Hubo un error al procesar su consulta, intente luego"
            })
        }

        //SE OBTIENEN TODAS LAS CUENTAS DE LOS TENDEROS Y CLIENTES
    } else if (req.usuario.rol == "ADMIN_ROLE" || req.usuario.rol == "ROOT") {
        const [totalCuentas, cuentas] = await Promise.all([
            Cuenta.count({ estado: true, cerrado: close }),

            Cuenta.find({ estado: true, cerrado: close })
                .populate({
                    path: 'tendero',
                    select: ['nombre', 'correoPrincipal']
                })
                .populate({
                    path: 'cliente',
                    select: ['nombre', 'correoPrincipal']
                })
                .skip(desde)
                .limit(limite)
        ]);

        const total = cuentas.length
        return res.status(200).json({
            msg: `Status 200 - ADMIN`,
            totalEnBasedeDatos: totalCuentas,
            totalConsulta: total,
            cuentas
        });
    } else {
        return res.status(200).json({
            msg: "Todavia no se ha programado esta funcionalidad :)"
        })
    }

}

//OBTENER TODAS LAS CUENTAS DE UN USUARIO ESPECIFICO - MDOO ADMINISTRADOR
const obtenerCuentasID = async (req, res = response) => {
    const { limite = 5, desde = 0, close = false } = req.query;
    const { id } = req.params;

    try {
        const usuario = await Usuario.findById(id);
        if (!usuario.estado) {
            return res.status(400).json({
                msg: 'No se encuentra este usuario en la base de datos'
            });
        };

        if (usuario.rol == "TENDERO") {
            const [totalCuentas, cuentas] = await Promise.all([
                Cuenta.count({ estado: true, tendero: usuario._id, cerrado: close }),

                Cuenta.find({ estado: true, tendero: usuario._id, cerrado: close })
                    .populate({
                        path: 'tendero',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .populate({
                        path: 'cliente',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .skip(desde)
                    .limit(limite)
            ]);
            const total = cuentas.length
            return res.status(200).json({
                msg: `Status 200`,
                totalEnBasedeDatos: totalCuentas,
                totalConsulta: total,
                cuentas
            });
        } else if (usuario.rol == "CLIENTE") {
            const [totalCuentas, cuentas] = await Promise.all([
                Cuenta.count({ estado: true, cliente: usuario._id, cerrado: close }),

                Cuenta.find({ estado: true, cliente: usuario._id, cerrado: close })
                    .populate({
                        path: 'tendero',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .populate({
                        path: 'cliente',
                        select: ['nombre', 'correoPrincipal']
                    })
                    .skip(desde)
                    .limit(limite)
            ]);
            const total = cuentas.length
            return res.status(200).json({
                msg: `Status 200`,
                totalEnBasedeDatos: totalCuentas,
                totalConsulta: total,
                cuentas
            });

        } else {
            return res.status(500).json({
                msg: "El rol de este usuario no es el indicado para realizar esta consulta"
            });
        }
    } catch (err) {
        return res.status(500).json({
            msg: `Presentamos un problema al realizar esta consulta, te agradecemos contactarte al ${process.env.CONTACTO_ERROR}`
        });
    }
}

// AGREGA UNA NUEVA CUENTA A UN USUARIO
const nuevoPago = async (req, res = response) => {

    const { idCuenta, valorPago, monedaPago, medioPago, nombrePagador } = req.body;

    const cuenta = await Cuenta.findById(idCuenta);

    if ((cuenta.valorPendiente - valorPago) < -100) {
        return res.status(400).json({
            msg: `La cuenta ${idCuenta} tiene un saldo de ${cuenta.valorPendiente}, no puede pagar mas de lo que adeuda.`
        })
    }

    saldoPendiente= cuenta.valorPendiente - valorPago;

    const data = {
        cuenta,
        valorPago,
        monedaPago,
        medioPago,
        nombrePagador,
        saldoCuenta:saldoPendiente,
    };
    
    const pagoNuevo = new Pago(data);

    cuenta.valorPendiente =saldoPendiente;
    if(cuenta.valorPendiente<=0){
        cuenta.cerrado=true;
    }

    await pagoNuevo.save();
    await cuenta.save();

    pagoNuevo.pagoExitoso = true;
    await pagoNuevo.save();
    return res.status(200).json({
        msg:"Su pago ha sido registrado exitosamente"
    })
}

//CONSULTAR EL RESUMEN DEL USUARIO EN LOGIN
const resumen = async (req, res = response) => {

    const { idConsultar } = req.params;

    const { nombre, uid, correoPrincipal, rol } = req.usuario;

    if (rol == "CLIENTE") {

        const cuentas = await Cuenta.find({ estado: true, cliente: req.usuario._id, cerrado: false }).populate({ path: 'tendero', select: ['nombre', 'correoPrincipal'] });

        let total = 0;
        let detalleCuentas = [];
        cuentas.forEach(cuenta => {

            let { _id, descripcionCredito, valorCuenta, tendero, fechaCreacion, valorPendiente, cerrado } = cuenta;
            const { nombre } = tendero;

            const date = new Date(fechaCreacion);

            if (!cerrado) {
                valorPendiente = valorCuenta;
            } else {
                valorPendiente = 0;
            }
            cuentaActual = {
                idCuenta: _id,
                fechaCreacion: date.toLocaleDateString(),
                descripcionCredito,
                tendero: nombre,
                valorCuenta,
                valorPendiente
            }
            if (isNaN(valorPendiente)) {
                valorPendiente = 0;
            }

            total += valorPendiente;

            detalleCuentas.push(cuentaActual);
        });

        const usuario = {
            uid,
            nombre,
            correoPrincipal,
            totalPendiente: total,
            cuentasActivas: cuentas.length
        };

        return res.status(200).json({
            usuario,
            cuentas: detalleCuentas
        });
    } else if (rol == "TENDERO") {

        const cuentas = await Cuenta.find({ estado: true, tendero: req.usuario._id, cerrado: false }).populate({ path: 'cliente', select: ['nombre', 'correoPrincipal'] });

        let total = 0;
        let detalleCuentas = [];

        cuentas.forEach(cuenta => {

            let { _id, descripcionCredito, valorCuenta, valorPendiente, cliente, fechaCreacion, cerrado } = cuenta;
            const { nombre } = cliente;

            const date = new Date(fechaCreacion);

            if (!cerrado) {
                valorPendiente = valorCuenta;
            } else {
                valorPendiente = 0;
            }
            cuentaActual = {
                idCuenta: _id,
                fechaCreacion: date.toLocaleDateString(),
                descripcionCredito,
                cliente: nombre,
                valorCuenta,
                valorPendiente
            }

            total += valorPendiente;

            detalleCuentas.push(cuentaActual);
        });

        const usuario = {
            uid,
            nombre,
            correoPrincipal,
            totalPrestamos: total,
            cuentasActivas: cuentas.length
        };

        return res.status(200).json({
            usuario,
            cuentas: detalleCuentas
        });

        // }else if(rol =="ROOT" || rol=="ADMIN_ROLE"){
        //     const usuarioConsulta = Usuario.findById(idConsultar);
    } else {
        return res.status(418).json({
            msg: "Disculpamos las molestias sin embargo aun no contamos con este servicio"
        })
    }
}

module.exports = {
    nuevoPago
};