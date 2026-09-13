const { Schema, model } = require('mongoose');

const AuditoriaSchema = Schema({

    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    fechaIngreso: {
        type: Date,
        default: new Date(),
        required: true,
    },
    ipIngreso: {
        type: String,
        required: true
    },
    accion:{
        type: String,
        required: true
    }
    ,exitoso: {
        type: Boolean,
        default:false,
        required: true
    }
});

module.exports = model('Auditoria', AuditoriaSchema);