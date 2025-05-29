import Scan from './../models/Scan.js'
import router from './codes.route.js';

// Track scan
router.get('/track/:id', async (req, res) => {
    try {
        const qrCode = await QrCode.findById(req.params.id);
        if (!qrCode) return res.status(404).json({ error: 'QR not found' });

        await Scan.create({
            qrCodeId: qrCode._id,
            ip: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
        });

        // Redirect or send QR data
        if (qrCode.type === 'url') {
            return res.redirect(qrCode.url);
        }

        return res.json({
            type: 'wifi',
            ssid: qrCode.ssid,
            password: qrCode.password,
        });
    } catch {
        res.status(500).json({ error: 'Tracking failed' });
    }
});

// Get scan analytics
router.get('/:id/analytics', async (req, res) => {
    try {
        const scans = await Scan.find({ qrCodeId: req.params.id }).sort({ timestamp: -1 });
        res.json(scans);
    } catch {
        res.status(500).json({ error: 'Analytics fetch failed' });
    }
});

export default router