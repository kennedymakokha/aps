import expressAsyncHandler from "express-async-handler"

import express from 'express';
import QRCode from 'qrcode';
import geoip from 'geoip-lite';
import cors from 'cors';
import QRCodeModel from "../models/qrcode.js";
import Scan from "../models/Scan.js";



import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Jimp = require('jimp');
const app = express();
app.use(cors());

function escapeQrText(text) {
    return text.replace(/([\\;,:"])/g, '\\$1');
}
// Overlay status text like "DISABLED" or "EXPIRED" onto a QR buffer
async function overlayStatusOnQr(qrBuffer, statusText) {
    const image = await Jimp.read(qrBuffer);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    const banner = new Jimp(image.bitmap.width, image.bitmap.height, 0xFF000080); // Red with transparency
    banner.rotate(-45);

    image.composite(banner, 0, 0, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: 0.5,
    });

    const x = image.bitmap.width / 4;
    const y = image.bitmap.height / 2 - 16;

    image.print(font, x, y, statusText);

    return image.getBufferAsync(Jimp.MIME_PNG);
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

    const qrImage = await Jimp.read(qrBuffer);

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
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            maxScans: maxScans ?? null,
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

    const qrImage = await Jimp.read(qrBuffer);

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

// const get_qr_code = expressAsyncHandler(async (req, res) => {
//     const qr = await QRCodeModel.findById(req.params.id);
//     console.log(qr)
//     const now = new Date();

//     if (!qr.active) {
//         return res.status(200).send('<h1>This QR code has been deactivated.</h1>');
//     }

//     if (qr.expiresAt && now > qr.expiresAt) {
//         return res.status(200).send('<h1>This QR code has expired.</h1>');
//     }

//     if (qr.maxScans !== null && qr.scanCount >= qr.maxScans) {
//         return res.status(200).send('<h1>This QR code has reached its scan limit.</h1>');
//     }

//     if (qr.type === 'wifi') {
//         qr.scanCount += 1;
//         await qr.save();
//         res.send(`
//             <h1>WiFi Access</h1>
//             <p><strong>SSID:</strong> ${qr.data.ssid}</p>
//             <p><strong>Password:</strong> ${qr.data.password}</p>
//         `);
//     } else if (qr.type === 'url') {
//         // Don't allow redirect if QR is inactive (already checked above)

//         const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
//         const userAgent = req.headers['user-agent'];
//         const geo = geoip.lookup(ip) || {};

//         await Scan.create({

//             qrCodeId: req.params.id,
//             ip,
//             userAgent,
//             geo: {
//                 country: geo.country || null,
//                 region: geo.region || null,
//                 city: geo.city || null,
//                 ll: geo.ll || [],
//             },
//         });
//         qr.scanCount += 1;
//         await qr.save();
//         res.redirect(qr.data.url);


//     } else {
//         res.status(400).send('<h1>Unsupported QR code type</h1>');
//     }
// })
const get_qr_code = expressAsyncHandler(async (req, res) => {
    const qr = await QRCodeModel.findById(req.params.id);
    if (!qr) return res.status(404).send('<h1>QR code not found</h1>');

    const now = new Date();
    let status = null;

    if (!qr.active) status = 'DISABLED';
    else if (qr.expiresAt && now > qr.expiresAt) status = 'EXPIRED';
    else if (qr.maxScans !== null && qr.scanCount >= qr.maxScans) status = 'SCAN LIMIT';

    if (status) {
        const qrLink = `${process.env.BASE_URL}/api/qr/${qr._id}`;
        const baseQR = await generateLinkQrBuffer({
            url: qrLink,
            color: qr.color,
            background: qr.background,
            logoBuffer: qr.logo
        });

        const overlayed = await overlayStatusOnQr(baseQR, status);
        res.setHeader('Content-Type', 'image/png');
        return res.send(overlayed);
    }

    // QR is valid – continue as usual
    if (qr.type === 'wifi') {
        qr.scanCount += 1;
        await qr.save();
        res.send(`
            <h1>WiFi Access</h1>
            <p><strong>SSID:</strong> ${qr.data.ssid}</p>
            <p><strong>Password:</strong> ${qr.data.password}</p>
        `);
    } else if (qr.type === 'url') {
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

        qr.scanCount += 1;
        await qr.save();
        res.redirect(qr.data.url);
    } else {
        res.status(400).send('<h1>Unsupported QR code type</h1>');
    }
});

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
            expiresAt: null,
            maxScans: null,
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