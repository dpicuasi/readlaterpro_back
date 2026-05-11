const express = require('express');

const authRoutes = require('./authRoutes');
const collectionRoutes = require('./collectionRoutes');
const linkRoutes = require('./linkRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ReadLaterPro',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/collections', collectionRoutes);
router.use('/links', linkRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
