const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, roomController.getRooms);
router.get('/:id', authMiddleware, roomController.getRoomById);
router.post('/', authMiddleware, roomController.createRoom);
router.post('/:id/join', authMiddleware, roomController.joinRoom);
router.post('/:id/leave', authMiddleware, roomController.leaveRoom);
router.delete('/:id', authMiddleware, roomController.deleteRoom);

module.exports = router;
