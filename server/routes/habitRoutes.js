const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createHabit,
  getHabits,
  completeHabit,
  getHabitStats,
  deleteHabit,
} = require('../controllers/habitController');

router.use(protect);

router.post('/', createHabit);
router.get('/', getHabits);
router.post('/:id/complete', completeHabit);
router.get('/:id/stats', getHabitStats);
router.delete('/:id', deleteHabit);

module.exports = router;
