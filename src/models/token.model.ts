import mongoose from 'mongoose';


const tokenSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
    provider : {type : String, enum: ['google', 'github', 'slack'], required : true},
    accessToken : {type : String},
    refreshToken : {type : String},
    tokenExpiredAt : {type : Date, refuired: false}
})

export const Tokens = mongoose.model('Tokens', tokenSchema);