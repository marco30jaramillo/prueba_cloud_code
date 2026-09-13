const { response } = require("express");
const { Cuenta, Usuario, Pago } = require('../models');
const Auditoria = require("../models/Auditoria");

//OBTENER TODAS LAS CUENTAS
const obtenerCuentas = async (req, res = response) => {
    const { limite = 5, desde = 0, close = false } = req.query;

    //RECUPERA TODAS LAS CUENTAS DE UN TENDERO EN ESPECIFICO ENVIADO POR JWT
    if (req.usuario.rol == "TENDERO") {
        try {
            //CONSULTA GENERAL
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

            let detalleCuentas = [];


            const pagosRealizados = await Pago.find({ estado: true, pagoExitoso: true });


            cuentas.forEach(cuenta => {

                let { _id, descripcionCredito, valorCuenta, valorPendiente, fechaCreacion, cliente } = cuenta;

                const date = new Date(fechaCreacion);

                if (isNaN(valorPendiente)) {
                    valorPendiente = 0;
                }

                const { nombre, correoPrincipal } = cliente;
                cliente = {
                    nombre,
                    correo:correoPrincipal
                };

                //DETALLE DE PAGOS
                const detPagosRealizados = pagosRealizados.filter(element => element.cuenta.toString() == _id);

                cuentaActual = {
                    idCuenta: _id,
                    fechaCreacion: date.toLocaleDateString(),
                    descripcionCredito,
                    cerrado: cuenta.cerrado,
                    valorCuenta,
                    valorPendiente,
                    cliente,
                    pagosRealizados: detPagosRealizados
                }

                detalleCuentas.push(cuentaActual);
            });

            const totalAbiertas = totalCuentas - totalcerradas;
            const total = cuentas.length
            return res.status(200).json({
                msg: `Status 200 -TENDERO`,
                totalEnBasedeDatos: totalCuentas,
                totalAbiertas: totalAbiertas,
                totalCerradas: totalcerradas,
                totalenConsulta: total,
                detalleCuentas
            });
        } catch (err) {
            return res.status(400).json({
                msg: "Hubo un error al procesar su consulta, intente luego"
            })
        }
        //RECUPERA TODAS LAS CUENTAS DEL CLIENTE EN ESPECIFICO ENVIADO POR JWT
    } else if (req.usuario.rol == "CLIENTE") {
        try {

            let detalleCuentas = [];

            const pagosRealizados = await Pago.find({ estado: true, pagoExitoso: true });

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
            cuentas.forEach(cuenta => {

                let { _id, descripcionCredito, valorCuenta, valorPendiente, fechaCreacion, tendero } = cuenta;

                const date = new Date(fechaCreacion);

                if (isNaN(valorPendiente)) {
                    valorPendiente = 0;
                }

                const { nombre, correoPrincipal } = tendero;
                tendero = {
                    nombre,
                    correo:correoPrincipal
                };
                //DETALLE DE PAGOS
                const detPagosRealizados = pagosRealizados.filter(element => element.cuenta.toString() == _id);

                cuentaActual = {
                    idCuenta: _id,
                    fechaCreacion: date.toLocaleDateString(),
                    descripcionCredito,
                    cerrado: cuenta.cerrado,
                    valorCuenta,
                    valorPendiente,
                    tendero,
                    pagosRealizados: detPagosRealizados
                }

                detalleCuentas.push(cuentaActual);
            });
            console.log(detalleCuentas);

            const total = cuentas.length
            return res.status(200).json({
                msg: `Status 200 - CLIENTE`,
                totalEnBasedeDatos: totalCuentas,
                totalConsulta: total,
                cuentas:detalleCuentas
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
const obtenerPagos = (idCuentas) => {
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
const crearNuevaCuenta = async (req, res = response) => {

    const { descripcion, valor, clienteID } = req.body;

    const registro = new Auditoria({
        usuario: req.usuario,
        accion: `Crear nueva cuenta a: ${clienteID}`,
        ipIngreso: req.socket.localAddress,
    });

    const usuarioExiste = await Usuario.findById(clienteID);

    if (!usuarioExiste || !usuarioExiste.estado) {
        await registro.save();
        return res.status(400).json({
            msg: "No se encuentra a este cliente"
        })
    }

    if (usuarioExiste.rol !== "CLIENTE") {
        await registro.save();
        return res.status(400).json({
            msg: "Esta intentando cargar una cuenta a un usuario no Cliente"
        })
    }

    data = {
        descripcionCredito: descripcion,
        valorCuenta: valor,
        valorPendiente: valor,
        tendero: req.usuario._id,
        cliente: clienteID
    }

    const cuentaNueva = new Cuenta(data);
    await cuentaNueva.save();

    registro.exitoso = true;
    await registro.save();

    return res.status(201).json({
        msg: `Se ha agregado una cuenta`,
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

            let { _id, descripcionCredito, valorCuenta, valorPendiente, cliente, fechaCreacion } = cuenta;
            const { nombre } = cliente;

            const date = new Date(fechaCreacion);

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
    crearNuevaCuenta,
    obtenerCuentas,
    obtenerCuentasID,
    resumen
}