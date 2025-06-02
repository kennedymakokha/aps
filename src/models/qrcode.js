// models/QrCode.js
import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema({
    type: { type: String, enum: ['wifi', 'url'], required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // { ssid, password } or { url }
    color: String,
    background: String,
    logo: Buffer, // optional
    expiresAt: { type: Date, default: null },
    maxScans: { type: Number, default: null },
    scanCount: { type: Number, default: 0 },
   
    active: { type: Boolean, default: true },// to track if the QR code is active,
    //   ssid: String,
    //   password: String,
    //   color: String,
    //   background: String,
    //   logo: Buffer,
    //   qrBuffer: Buffer,

}, { timestamps: true });
let QRCodeModel = mongoose.model('QrCode', qrCodeSchema);
export default QRCodeModel;
