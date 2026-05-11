const express = require('express');

const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/push-token', protect, notificationController.registerPushToken);
router.delete('/push-token', protect, notificationController.unregisterPushToken);

module.exports = router;
