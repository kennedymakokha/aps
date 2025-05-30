import expressAsyncHandler from "express-async-handler"

import express from 'express';
import QRCode from 'qrcode';
import { Jimp } from 'jimp';
import geoip from 'geoip-lite';
import cors from 'cors';
import QRCodeModel from "../models/qrcode.js";
import Scan from "../models/Scan.js";


const app = express();
app.use(cors());

function escapeQrText(text) {
    return text.replace(/([\\;,:"])/g, '\\$1');
}

// Utility to generate QR image buffer with logo & colors
export async function generateQrBuffer({ ssid, password, color = '#000000', background = '#ffffff', logoBuffer }) {
    // const qrData = JSON.stringify({ ssid, password });
    const escapedSSID = escapeQrText(ssid);
    const escapedPassword = escapeQrText(password);
    const qrData = `WIFI:T:WPA;S:${escapedSSID};P:${escapedPassword};;`;

    const qrBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        color: { dark: color, light: background }
    });

    const qrImage = await Jimp.fromBuffer(qrBuffer);

    if (logoBuffer) {
        const logo = await Jimp.fromBuffer(logoBuffer);

        const logoWidth = qrImage.bitmap.width * 0.2;
        const aspectRatio = logo.bitmap.height / logo.bitmap.width;
        const logoHeight = Math.round(logoWidth * aspectRatio);

        logo.resize({ w: Math.round(logoWidth), h: logoHeight });

        const x = (qrImage.bitmap.width - logo.bitmap.width) / 2;
        const y = (qrImage.bitmap.height - logo.bitmap.height) / 2;

        qrImage.composite(logo, x, y);
    }

    // Use string 'image/png' instead of Jimp.MIME_PNG
    return qrImage.getBuffer('image/png');
}
const generate_qr_code = expressAsyncHandler(async (req, res) => {
    try {
        const { ssid, password, color, background } = req.body;
        if (!ssid || !password) return res.status(400).json({ error: 'SSID and password required' });

        // STEP 1: Create the QR entry first
        const newQR = await QRCodeModel.create({
            type: 'wifi',
            data: { ssid, password },
            color,
            background,
            logo: req.file?.buffer,
        });

        // STEP 2: Encode the dynamic link
        const qrData = `${process.env.BASE_URL}/api/qr/${newQR._id}`;

        const pngBuffer = await generateLinkQrBuffer({
            url: qrData,
            color,
            background,
            logoBuffer: req.file?.buffer
        });

        const base64 = 'data:image/png;base64,' + pngBuffer.toString('base64');
        res.json({ qrImage: base64, id: newQR._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

export async function generateLinkQrBuffer({ url, color = '#000000', background = '#ffffff', logoBuffer }) {


    const qrBuffer = await QRCode.toBuffer(url, {
        errorCorrectionLevel: 'H',
        color: { dark: color, light: background }
    });

    const qrImage = await Jimp.fromBuffer(qrBuffer);

    if (logoBuffer) {
        const logo = await Jimp.fromBuffer(logoBuffer);

        const logoWidth = qrImage.bitmap.width * 0.2;
        const aspectRatio = logo.bitmap.height / logo.bitmap.width;
        const logoHeight = Math.round(logoWidth * aspectRatio);

        logo.resize({ w: Math.round(logoWidth), h: logoHeight });

        const x = (qrImage.bitmap.width - logo.bitmap.width) / 2;
        const y = (qrImage.bitmap.height - logo.bitmap.height) / 2;

        qrImage.composite(logo, x, y);
    }

    // Use string 'image/png' instead of Jimp.MIME_PNG
    return qrImage.getBuffer('image/png');
}

const get_qr_code = expressAsyncHandler(async (req, res) => {
    const qr = await QRCodeModel.findById(req.params.id);
    if (!qr) return res.status(404).send('<h1>QR code not found</h1>');

    if (!qr.active) {
        return res.status(200).send('<h1>This QR code has been deactivated.</h1>');
    }

    if (qr.type === 'wifi') {
        res.send(`
            <h1>WiFi Access</h1>
            <p><strong>SSID:</strong> ${qr.data.ssid}</p>
            <p><strong>Password:</strong> ${qr.data.password}</p>
        `);
    } else if (qr.type === 'url') {

        // const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const geo = geoip.lookup(ip) || {};

        await Scan.create({
            qrCodeId: req.params.id,
            ip,
            userAgent,
            geo: {
                country: geo.country || null,
                region: geo.region || null,
                city: geo.city || null,
                ll: geo.ll || [],
            },
        });


        res.redirect(qr.data.url);

    } else {
        res.status(400).send('<h1>Unsupported QR code type</h1>');
    }
})
const get_codes = expressAsyncHandler(async (req, res) => {
    try {
        const codes = await QRCodeModel.find().sort({ createdAt: -1 });
        res.json(codes);
    } catch (error) {
        console.log(error)
    }
})

const update_qr_code = expressAsyncHandler(async (req, res) => {
    const qr = await QRCodeModel.findById(req.params.id);
    qr.active = !qr.active;
    await qr.save();
    res.json({ success: true, active: qr.active });
});
const download_qr_code = expressAsyncHandler(async (req, res) => {
    try {
        const { ssid, password, color, background } = req.body;
        if (!ssid || !password) return res.status(400).json({ error: 'SSID and password required' });

        const pngBuffer = await generateQrBuffer({
            ssid,
            password,
            color,
            background,
            logoBuffer: req.file?.buffer
        });

        res.setHeader('Content-Disposition', 'attachment; filename=qr-code.png');
        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

const generate_URL_qr_code = expressAsyncHandler(async (req, res) => {
    try {
        const { url, color, background } = req.body;
        if (!url) return res.status(400).json({ error: 'url required' });

        const newQR = await QRCodeModel.create({
            type: 'url',
            data: { url },
            color,
            background,
            logo: req.file?.buffer,
        });

        const qrData = `${process.env.BASE_URL}/api/qr/${newQR._id}`;

        const pngBuffer = await generateLinkQrBuffer({
            url: qrData,
            color,
            background,
            logoBuffer: req.file?.buffer
        });

        const base64 = 'data:image/png;base64,' + pngBuffer.toString('base64');
        res.json({ qrImage: base64, id: newQR._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const download_URL_qr_code = expressAsyncHandler(async (req, res) => {
    try {
        const { url, color, background } = req.body;
        if (!url) return res.status(400).json({ error: 'url required' });

        const pngBuffer = await generateLinkQrBuffer({
            url,
            color,
            background,
            logoBuffer: req.file?.buffer
        });
        res.setHeader('Content-Disposition', 'attachment; filename=qr-code.png');
        res.setHeader('Content-Type', 'image/png');
        res.send(pngBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

export {
    generate_URL_qr_code,
    download_URL_qr_code,
    generate_qr_code,
    download_qr_code,
    get_qr_code,
    get_codes,
    update_qr_code
}