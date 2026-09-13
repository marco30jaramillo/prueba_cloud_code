const { Schema, model } = require('mongoose');

const PagoShema = Schema({

    cuenta:{
        type: Schema.Types.ObjectId,
        ref: 'Cuenta',
        required: true 
    }
    , valorPago: {
        type: Number,
        required: [true, 'El valor es requerido'],
    }
    , monedaPago:{
        type:String,
        default:"COP",
        required:true
    }
    , medioPago:{
        type:String,
        required:true
    }
    ,nombrePagador:{
        type:String,
        default:"N/E",
        required:true
    }
    , saldoCuenta:{
        type: Number,
        required: [true, 'El valor es requerido'],
    }
    , fechaPago:{
        type:Date,
        default: new Date()
    }
    ,pagoExitoso:{
        type: Boolean,
        default: false,
        required: true
    }
    ,estado: {
        type: Boolean,
        default: true,
        required: true
    }
    
});

PagoShema.methods.toJSON= function(){
    const {__v, estado, ...data}=this.toObject();
    
    return data;
}

module.exports = model('Pago', PagoShema);