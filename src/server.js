import express from 'express';
import cors from 'cors'; // <-- Import cors
import { scanNetwork } from './routes/scanner.js';
import multer from 'multer';
import codeRoutes from './routes/codes.route.js';
import dotenv from 'dotenv'
import dbConfig from './configs/db_config.js';
dotenv.config()
// const port = process.env.PORT || 5000
dbConfig()
const app = express();
const PORT = 5000;

app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

app.get('/scan', async (req, res) => {
  try {
    const devices = await scanNetwork();
    res.json(devices);
  } catch (err) {
    console.error('Error scanning network:', err);
    res.status(500).send('Error scanning network');
  }
});
app.use('/api', codeRoutes);
// app.post('/generate-qr', upload.single('logo'), async (req, res) => {
//   try {
//     const { ssid, password, color, background } = req.body;
//     if (!ssid || !password) return res.status(400).json({ error: 'SSID and password required' });

//     const pngBuffer = await generateQrBuffer({
//       ssid,
//       password,
//       color,
//       background,
//       logoBuffer: req.file?.buffer
//     });

//     const base64 = 'data:image/png;base64,' + pngBuffer.toString('base64');
//     res.json({ qrImage: base64 });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Endpoint to download PNG file directly
// app.post('/download-qr', upload.single('logo'), async (req, res) => {
//   try {
//     const { ssid, password, color, background } = req.body;
//     if (!ssid || !password) return res.status(400).json({ error: 'SSID and password required' });

//     const pngBuffer = await generateQrBuffer({
//       ssid,
//       password,
//       color,
//       background,
//       logoBuffer: req.file?.buffer
//     });

//     res.setHeader('Content-Disposition', 'attachment; filename=qr-code.png');
//     res.setHeader('Content-Type', 'image/png');
//     res.send(pngBuffer);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: error.message });
//   }
// });
// app.post('/generate-qrtolink', upload.single('logo'), async (req, res) => {
//   try {
//     const { url, color, background } = req.body;
//     if (!url) return res.status(400).json({ error: 'url required' });

//     const pngBuffer = await generateLinkQrBuffer({
//       url,
//       color,
//       background,
//       logoBuffer: req.file?.buffer
//     });

//     const base64 = 'data:image/png;base64,' + pngBuffer.toString('base64');
//     res.json({ qrImage: base64 });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: error.message });
//   }
// });
// app.post('/download-qrtolink', upload.single('logo'), async (req, res) => {
//   try {
//     const { url, color, background } = req.body;
//     if (!url) return res.status(400).json({ error: 'url required' });

//     const pngBuffer = await generateLinkQrBuffer({
//       url,
//       color,
//       background,
//       logoBuffer: req.file?.buffer
//     });
//     res.setHeader('Content-Disposition', 'attachment; filename=qr-code.png');
//     res.setHeader('Content-Type', 'image/png');
//     res.send(pngBuffer);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: error.message });
//   }
// });


app.listen(PORT, () => {
  console.log(`Scanner API running at http://localhost:${PORT}`);
});
