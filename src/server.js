import express from 'express';
import cors from 'cors'; // <-- Import cors
import { scanNetwork } from './routes/scanner.js';
import multer from 'multer';
import codeRoutes from './routes/codes.route.js';
import analyticsRote from './routes/qrRoutes.js'
import dotenv from 'dotenv'
import dbConfig from './configs/db_config.js';
dotenv.config()
const PORT = process.env.PORT || 5000
dbConfig()
const app = express();
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
app.use('/api/analytics', analyticsRote);
app.get("/", (req, res) => {
  res.send("WebSocket Server is running!");
  return
});
app.listen(PORT, () => {
  console.log(`Scanner API running at http://localhost:${PORT}`);
});
