
const bcryptjs = require('bcryptjs');
const { response } = require('express');

var ObjectId = require('mongodb').ObjectID;

const {Usuario} = require('../models');
const Auditoria = require('../models/Auditoria');


const getUsuarios = async (req, res = response) => {

    const { limite = 5, desde = 0 , estado=true} = req.query;

    const [totalBase, usuarios] = await Promise.all([

        Usuario.count({ estado }),
        Usuario.find({ estado })
            .skip(desde)
            .limit(limite)
    ]);
    const total = usuarios.length
    return res.json({
        totalBase,
        total,
        usuarios
    })
}
const CrearTendero = async (req, res = response) => {


    let{nombreAdministrador} = req.body;
    const { nombreTienda, tipoIdentificacion, identificacion, representantelegal, img, password } = req.body;
    const {paisDireccion, departamentoDireccion, ciudadDireccion, direccion, telefonoFijo, numCelular,correoPrincipal,correoAlternativo} = req.body;

    //Verificar si la identificacion existe
    const ExisteIdentificacion = await Usuario.findOne({tipoIdentificacion:tipoIdentificacion, identificacion:identificacion});
    if(ExisteIdentificacion ){
        return res.status(400).json({
            errors:[{
                value:`${tipoIdentificacion} #${identificacion}`,
                msg:`el ${tipoIdentificacion} #${identificacion} ya esta registrado en la BD`,
                param: "identificacion",
                location:"body"
            }]
        })
    }
    if(!nombreAdministrador){
        nombreAdministrador = representantelegal
    }
    const usuario = new Usuario({
        
        //Informacion Basica Usuario Tendero
        nombre:nombreTienda.toUpperCase(),
        tipoIdentificacion:tipoIdentificacion.toUpperCase(),
        identificacion,
        representantelegal:representantelegal.toUpperCase(),
        nombreAdministrador:nombreAdministrador.toUpperCase(),
        img,

        //informacion adicional
        paisDireccion,
        departamentoDireccion,
        ciudadDireccion,
        direccion,
        telefonoFijo,
        numCelular,
        correoPrincipal,
        correoAlternativo
    });

    //Encriptar la contraseña
    const salt = bcryptjs.genSaltSync();
    usuario.password = bcryptjs.hashSync(password, salt);

    //AGREGAR INFORMACION NECESARIA
    const hoy = 
    usuario.fechaCreacionUsuario = new Date();
    usuario.rol="TENDERO";


    //GUARDAR
    await usuario.save();

    //REGISTRO DE AUDITORIA
    const registro = new Auditoria({
        usuario,
        accion:"Usuario- Tendero Creado Exitosamente",
        ipIngreso: req.socket.localAddress,
        exitoso:true
    });
    await registro.save();

    return res.status(201).json({
        usuario
    });
}
const CrearCliente = async (req, res = response) => {
    const { nombre, tipoIdentificacion= 'CC', identificacion, img, password } = req.body;
    const {paisDireccion, departamentoDireccion, ciudadDireccion, direccion, telefonoFijo, numCelular,correoPrincipal,correoAlternativo} = req.body;

    //Verificar si la identificacion existe
    const ExisteIdentificacion = await Usuario.findOne({tipoIdentificacion:tipoIdentificacion, identificacion:identificacion});
    if(ExisteIdentificacion ){
        return res.status(400).json({
            errors:[{
                value:`${tipoIdentificacion} #${identificacion}`,
                msg:`el ${tipoIdentificacion} #${identificacion} ya esta registrado en la BD`,
                param: "identificacion",
                location:"body"
            }]
        })
    }
    const usuario = new Usuario({
        
        //Informacion Basica Usuario Cliente
        nombre:nombre.toUpperCase(),
        tipoIdentificacion:tipoIdentificacion.toUpperCase(),
        identificacion,
        img,

        //informacion adicional
        paisDireccion,
        departamentoDireccion,
        ciudadDireccion,
        direccion,
        telefonoFijo,
        numCelular,
        correoPrincipal,
        correoAlternativo
    });

    //Encriptar la contraseña
    const salt = bcryptjs.genSaltSync();
    usuario.password = bcryptjs.hashSync(password, salt);

    //AGREGAR INFORMACION NECESARIA
    usuario.fechaCreacionUsuario = new Date();
    usuario.rol="CLIENTE";


    //GUARDAR
    await usuario.save();

    //REGISTRO AUDITORIA
    const registro = new Auditoria({
        usuario,
        accion:"Usuario- Tendero Creado Exitosamente",
        ipIngreso: req.socket.localAddress,
        exitoso:true
    });
    await registro.save();


    return res.status(201).json({
        usuario
    });
}
const CrearAdministrador = async (req, res = response) => {
    const UsuarioRoot = req.usuario;
    const { nombre, tipoIdentificacion= 'CC', identificacion, img, password } = req.body;
    const {paisDireccion, departamentoDireccion, ciudadDireccion, direccion, telefonoFijo, numCelular,correoPrincipal,correoAlternativo} = req.body;

    //Verificar si la identificacion existe
    const ExisteIdentificacion = await Usuario.findOne({tipoIdentificacion:tipoIdentificacion, identificacion:identificacion});
    if(ExisteIdentificacion ){
        return res.status(400).json({
            errors:[{
                value:`${tipoIdentificacion} #${identificacion}`,
                msg:`el ${tipoIdentificacion} #${identificacion} ya esta registrado en la BD`,
                param: "identificacion",
                location:"body"
            }]
        })
    }
    const usuario = new Usuario({
        
        //Informacion Basica Usuario Cliente
        nombre:nombre.toUpperCase(),
        tipoIdentificacion:tipoIdentificacion.toUpperCase(),
        identificacion,
        img,

        //informacion adicional
        paisDireccion,
        departamentoDireccion,
        ciudadDireccion,
        direccion,
        telefonoFijo,
        numCelular,
        correoPrincipal,
        correoAlternativo
    });

    //Encriptar la contraseña
    const salt = bcryptjs.genSaltSync();
    usuario.password = bcryptjs.hashSync(password, salt);

    //AGREGAR INFORMACION NECESARIA
    usuario.fechaCreacionUsuario = new Date();
    usuario.rol="ADMIN_ROLE";


    //GUARDAR
    await usuario.save();

    //REGISTRO DE AUDITORIA
    const registro = new Auditoria({
        usuario:UsuarioRoot,
        accion:"Usuario- Administrador Creado Exitosamente",
        ipIngreso: req.socket.localAddress,
        exitoso:true
    });
    await registro.save();

    return res.status(201).json({
        usuario
    });
}
const actualizarUsuario = async (req, res = response) => {

    const usuarioRequeridor = req.usuario;
    console.log(usuarioRequeridor._id);
    //Comprueba si viene un id, y si es valido en la BD 

    const id= req.header('id');
    console.log("inicio",id);
    //Extrae la informacion
    const { _id, password, tipoIdentificacion, identificacion, correoPrincipal,correoValido,numCelularValido, rol, estado, google, fechaCreacionUsuario, fechaultVez, ...resto  } = req.body;

    //Iniciar registro de auditoria
    const registro = new Auditoria({
        usuario:usuarioRequeridor,
        accion:"Actualizacion de usuario",
        ipIngreso: req.socket.localAddress,
    });

    //Encripta la contraseña si viene
    if (password) {
        const salt = bcryptjs.genSaltSync();
        resto.password = bcryptjs.hashSync(password, salt);
    }

    //Comprueba si quien realiza la solicitud es un usuario administrador o root
    if(usuarioRequeridor.rol=="ADMIN_ROLE" || usuarioRequeridor.rol=="ROOT"){
        
        //Como un usuario administrador/root puede actualizar su propio usuario o el de otro
        //Si ingresa en el header un uid, se entiende que es el de otro, si no ingresa un uid, se entiende que es el usuario propio
        if(id){
            try{
                var uid = ObjectId(id);
            }catch(err){
                return res.status(400).json({
                    msg:"Ingrese un ID valido."
                    
                })
            }
            console.countReset()
            //Se comprueba que el usuario a actualizar esta en la base de datos
            
            const usuarioActualizar = await Usuario.findById(uid);
            
            registro.accion = `Actualizacion de datos del usuario: ${uid} `;

            if(!usuarioActualizar){
                await registro.save();
                return res.status(400).json({
                    msg: "El usuario que desea actualizar no existe en la BD"
                });
            };
            if(usuarioActualizar.rol=="ROOT" && usuarioRequeridor.rol=="ADMIN_ROLE"){
                await registro.save();
                return res.status(401).json({
                    msg: "Usted no tiene el permiso para actualizar este usuario"
                });
            }

            if(rol){resto.rol=rol};
            if(tipoIdentificacion){resto.tipoIdentificacion=tipoIdentificacion;};
            if(identificacion){resto.identificacion = identificacion;};
            if(correoPrincipal){
                resto.correoPrincipal =correoPrincipal;
                resto.correoValido = false;
            };
            if(resto.numCelular){
                resto.numCelularValido = false;
            };
            registro.exitoso =true;
            const usuario = await Usuario.findByIdAndUpdate(uid, resto);
            await registro.save();

            return res.status(202).json({
                msg:"Se actualizo el usuario"
            });
        
        }else{
            if(resto.numCelular){
                resto.numCelularValido = false;
            };
            
            const usuario = await Usuario.findByIdAndUpdate(usuarioRequeridor._id, resto);

            registro.exitoso =true;
            await registro.save();

            return res.status(202).json({
                msg:"Se actualizo el usuario"
            });
        
        };

    }else{
        if(uid){
            await registro.save();
            return res.status(401).json({
                msg: "Usted no tiene permisos para actualizar la cuenta de otra persona."
            });
        };
        if(tipoIdentificacion || identificacion || correoPrincipal || correoValido || numCelularValido || rol || estado || google || fechaCreacionUsuario || fechaultVez){
            return res.status(400).json({
                msg:"Usted no tiene permisos para actualizar algun campo ingresado"
            })
        }
        if(resto.numCelular){
            resto.numCelularValido = false;
        }
        registro.exitoso =true;
        
        const usuario = await Usuario.findByIdAndUpdate(usuarioRequeridor._id, resto);
        await registro.save();

        return res.status(202).json({
            msg:"Se actualizo el usuario"
        });
    }

}
const deleteUsuarios = async (req, res) => {
    const { id } = req.params;
    console.log(id);

    const registro = new Auditoria({
        usuario:req.usuario,
        accion:`Eliminar el usuario: ${id}`,
        ipIngreso: req.socket.localAddress,
    });


    const usuario = Usuario.findById(id);
    if(!usuario.estado){
        await registro.save();
        return res.status(400).json({
            msg:"No se puede eliminar un usuario que no esta en la base de datos."
        })
    }
    const usuarioBorrado = await Usuario.findByIdAndUpdate(id, { estado: false });
    registro.exitoso=true;
    await registro.save();

    return res.status(200).json({
        usuarioBorrado
    });
}

module.exports = {
    actualizarUsuario,
    getUsuarios,
    deleteUsuarios,
    CrearTendero,
    CrearCliente,
    CrearAdministrador
}