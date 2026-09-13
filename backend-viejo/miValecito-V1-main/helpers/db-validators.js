const { Categoria, Producto, Role, Usuario, Cuenta } = require('../models');


const esRoleValido = async (rol = '') => {
    const existeRol = await Role.findOne({ rol });
    if (!existeRol) {
        throw new Error(`El rol ${rol} no esta registrado en la base de datos`);
    }
}

const emailExiste = async (correoPrincipal = '') => {
    const existeEmail = await Usuario.findOne({ correoPrincipal });
    if (existeEmail) {
        throw new Error(`el correo ${correoPrincipal} ya esta registrado en la BD`);
    }
}

const cuentaCerrada = async (idCuenta='') => {
    const cuenta = await Cuenta.findById(idCuenta);
    if (!cuenta) {
        throw new Error(`No existe una cuenta con este ID`);
    }

    if(cuenta.cerrado){
        throw new Error(`La cuenta que desea pagar ya se encuentra cerrada, revise el numero de cuenta que desea pagar`);
    }
}

const documentoExiste = async (identificacion = '', tipoIdentificacion='') => {
    const existeDocumento = await Usuario.findOne({ identificacion, tipoIdentificacion });
    if (existeDocumento) {
        throw new Error(`el usuario con  ${tipoIdentificacion} #${identificacion} ya esta registrado en la BD`);
    }
}
const idExiste = async (id = '') => {
    const existeID = await Usuario.findById(id);
    if (!existeID) {
        throw new Error(`El id no se encuentra en la base de datos`)
    }
}

const categoriaExisteByNombre = async (nombre = '') => {
    const existeCategoria = await Categoria.findOne({ nombre });
    if (existeCategoria) {
        throw new Error(`La categoria ya se encuentra en la base de datos`)
    }
}

const categoriaExisteById = async (id = '') => {
    const existeCategoria = await Categoria.findById(id);
    
    if (!existeCategoria) {
        throw new Error('No se encuentra una categoria asociado a este id')
    }
    if (existeCategoria.estado == false) {
        throw new Error('La categoria ha sido borrada de la base de datos')
    }
}
const ProductoExisteById = async (id = '') => {
    const existeProducto = await Producto.findById(id);

    if (!existeProducto) {
        throw new Error('No se encuentra un producto asociado a este id')
    }
    if (existeProducto.estado == false) {
        throw new Error('El producto no se encuentra en la base de datos')
    }
}

const validacionCategoria=async(categoria='') => {
        if(!categoria || categoria==''){
            throw new Error('La categoria es obligatoria')
        };
        categoriaExisteById;
}

const coleccionesPermitida = (coleccion= '', colecciones=[])=>{

    const ExisteColeccion = colecciones.includes(coleccion);
    if(!ExisteColeccion){
        throw new Error('La coleccion ingresada, no es una coleccion valida')
    }

    return true;
}

module.exports = {
    esRoleValido,
    emailExiste,
    idExiste,
    categoriaExisteById,
    categoriaExisteByNombre,
    ProductoExisteById,
    validacionCategoria,
    coleccionesPermitida,
    documentoExiste,
    cuentaCerrada

}