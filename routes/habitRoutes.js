const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

const {
  addHabit,
  logHabitFailure,
  logAlmostRelapse,
  deleteHabit,
  shareHabit,
  getMyHabits,
  getSharedHabits
} = require('../controllers/habitController');

router.post('/add', auth, addHabit);
router.get('/mine', auth, getMyHabits);

router.post('/fail', auth, logHabitFailure);
router.post('/urge', auth, logAlmostRelapse);

router.delete('/:habitId', auth, deleteHabit);

router.post('/share', auth, shareHabit);
router.get('/shared', auth, getSharedHabits);

module.exports = router;
