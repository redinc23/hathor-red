const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/auth');
const { roomValidation, idParamValidation, validate } = require('../middleware/validation');

router.get('/', authMiddleware, roomController.getRooms);
router.get('/:id', authMiddleware, idParamValidation, validate, roomController.getRoomById);
router.post('/', authMiddleware, roomValidation, validate, roomController.createRoom);
router.post('/:id/join', authMiddleware, idParamValidation, validate, roomController.joinRoom);
router.post('/:id/leave', authMiddleware, idParamValidation, validate, roomController.leaveRoom);
router.delete('/:id', authMiddleware, idParamValidation, validate, roomController.deleteRoom);

module.exports = router;
