import express from 'express'
import { download_qr_code, download_URL_qr_code, generate_qr_code, generate_URL_qr_code, get_codes, get_qr_code, update_qr_code } from '../controllers/generatorController.js'
import multer from 'multer';

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() });
router.route('/generate-qr')
    .post(upload.single('logo'), generate_qr_code)
    .get(get_codes)
router.route('/qrcodes').get(get_codes)
router.route('/download-qr').post(upload.single('logo'), download_qr_code)
router.route('/generate-qrtolink').post(upload.single('logo'), generate_URL_qr_code)
router.route('/download-qrtolink').post(upload.single('logo'), download_URL_qr_code)
router.route('/qr/:id').get(get_qr_code)
router.route('/toggle/:id').get(update_qr_code)

//     .delete(isAuth, delete_user)
//     .put(isAuth, update_user)
// router.route('/enroll/:id')
//     .put(isAuth, Enroll_user)

// router.route('/login').post(login_user)
export default router 