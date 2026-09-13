const {Schema, model} = require('mongoose')

const UsuarioSchema = Schema({
    //NOMBRE CLIENTE - NOMBRE TIENDA
    nombre:{
        type:String,
        required:[true,'El nombre es obligatorio']
    },//TIPO DE DOCUMENTO VALIDOS CC-NIT
    tipoIdentificacion:{
        type:String,
        required: [true,'se necesita un tipo de documento'],
        enun:['CC','NIT']
    },//NUMERO DE DOCUMENTO DE IDENTIDAD
    identificacion:{
        type:String,
        required:[true,'se necesita un documento'],
        unique:true
    },//NOMBRE DEL REPRESENTANTE LEGAL - SOLO TENDEROS
    representantelegal:{
        type:String,
    },//NOMBRE DEL ADMINISTRADOR DEL ESTABLECIMIENTO - SOLO TENDEROS
    nombreAdministrador:{
        type:String,
    },//URL ALOJADOR IMAGEN 
    img: {
        type:String,
    },
    
    //NOMBRE DEL PAIS DE LA DIRECCION
    paisDireccion:{
        type:String,
        default:"Colombia"
    },//NOMBRE DEL DEPARTAMENTO DE LA DIRECCION
    departamentoDireccion:{
        type:String,
        default:"Bolívar"
    },//NOMBRE DE LA CIUDAD DE LA DIRECCION
    ciudadDireccion:{
        type:String,
        default:"Cartagena"
    },//DIRECCION CLIENTE - DIRECCION DEL NEGOCIO 
    direccion:{
        type:String,
        required:true
    },//TELEFONO FIJO
    telefonoFijo:{
        type:String,
    },//NUMERO CELULAR CLIENTE - NUMERO CONTACTO TIENDA
    numCelular:{
        type:String,
        required:true
    },//VALIDACION NUMERO CLIENTE O CONTACTO
    numCelularValido:{
        type:Boolean,
        default:false
    },//CORREO PRINCIPAL Y USADO PARA INICIO DE SESION
    correoPrincipal:{
        type:String,
        required:[true,'El correo es obligatorio'],
        unique:true
    },//VALIDACION DE CORREO ELECTRONICO USUARIO
    correoValido:{
        type:Boolean,
        default:false
    },//CORREO ALTERNATIVO PARA LA RECUPERACION DE CONTRASEÑA
    correoAlternativo:{
        type:String,
    },

    //CONTRASEÑA USUARIO
    password:{
        type:String,
        required:[true,'La contraseña es obligatorio']
    },

    //ROL USUARIO: TENDERO, CLIENTE, ADMINISTRADOR
    rol:{
        type:String,
        required:true,
        default:'CLIENTE',
        enun:['CLIENTE', 'TENDERO', 'ADMIN_ROLE', 'ROOT']
    },//ESTADO DEL USUARIO
    estado:{
        type:Boolean,
        default:true
    },//FUE CREADO O ACCEDIDO CON GOOGLE?
    google:{
        type:Boolean,
        default:false
    },//FECHA DE CREACION USUARIO
    fechaCreacionUsuario:{
        type:Date,
        default:new Date()
    },//ULTIMO ACCESO
    fechaultVez:{
        type:Date,
        default:null
    },
})

UsuarioSchema.methods.toJSON= function(){
    const {__v, password, _id, google, estado, correoValido, numCelularValido, fechaCreacionUsuario, fechaultVez,...usuario}=this.toObject();

    usuario.uid=_id;  
    usuario.fechaCreacionUsuario =fechaCreacionUsuario.toLocaleDateString();
    if(fechaultVez){usuario.fechaultVez=`${fechaultVez.toLocaleDateString()} ${fechaultVez.toLocaleTimeString()}`;};
    return usuario;
}

module.exports= model('Usuario',UsuarioSchema);