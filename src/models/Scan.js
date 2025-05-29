import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema({
    qrCodeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QrCode',
        required: true,
    },

    ip: String,
    userAgent: String,
    geo: {
        country: String,
        region: String,
        city: String,
        ll: [Number], // [latitude, longitude]
    },
},  {timestamps: true });

const Scan = mongoose.model('Scan', scanSchema);
export default Scan
