const { Schema, model } = require('mongoose');

const CuentaShema = Schema({
    descripcionCredito:{
        type:String
    },
    valorCuenta: {
        type: Number,
        required: [true, 'El valor es requerido'],
    },
    valorPendiente: {
        type: Number,
        required: [true, 'El valor es requerido'],
    },
    fechaCreacion: {
        type: Date,
        required: [true, 'El valor es requerido'],
        default : new Date()
    },
    tendero: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    cliente: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    cerrado:{
        type:Boolean,
        default:false,
        required:true
    },
    estado: {
        type: Boolean,
        default: true,
        required: true
    }
    
});

CuentaShema.methods.toJSON= function(){
    const {__v, estado, ...data}=this.toObject();
    
    return data;
}

module.exports = model('Cuenta', CuentaShema);