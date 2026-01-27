const User = require('../models/User');

const getStreakDays = (fromDate) => {
  if (!fromDate) return 0;
  const now = new Date();
  const from = new Date(fromDate);
  return Math.floor((now - from) / (1000 * 60 * 60 * 24));
};

const generateShareCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/* ADD HABIT */
const addHabit = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.userId);

    if (!name) return res.status(400).json({ message: "Habit name required" });
    if (!user) return res.status(404).json({ message: "User not found" });

    const habit = {
      name,
      startDate: new Date(),
      lastFailureDate: null,
      history: [],
      almostRelapses: [],
      shareCode: generateShareCode(),
      sharedWith: []
    };

    user.habits.push(habit);
    await user.save();

    res.status(201).json(habit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* LOG FAILURE */
const logHabitFailure = async (req, res) => {
  try {
    const { habitId } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const habit = user.habits.id(habitId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const now = new Date();
    habit.lastFailureDate = now;
    habit.history.push(now);

    // reset urges when actual relapse happens
    habit.almostRelapses = [];

    await user.save();

    res.json({ message: "Failure logged", habit: habit.toObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* LOG ALMOST RELAPSE */
const logAlmostRelapse = async (req, res) => {
  try {
    const { habitId, note } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const habit = user.habits.id(habitId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    habit.almostRelapses.push({ note: note || '' });
    await user.save();

    res.json({
      message: "Almost relapse logged 💪",
      totalAlmostRelapses: habit.almostRelapses.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* DELETE HABIT */
const deleteHabit = async (req, res) => {
  try {
    const { habitId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const habit = user.habits.id(habitId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    habit.deleteOne();
    await user.save();

    res.json({ message: "Habit deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* SHARE HABIT */
const shareHabit = async (req, res) => {
  try {
    const { code } = req.body;
    const receiver = await User.findById(req.userId);
    if (!receiver) return res.status(404).json({ message: "User not found" });

    const owner = await User.findOne({ "habits.shareCode": code });
    if (!owner) return res.status(404).json({ message: "Invalid share code" });

    const habit = owner.habits.find(h => h.shareCode === code);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    // IMPORTANT: ObjectId compare must use equals()
    if (habit.sharedWith.some(id => id.equals(receiver._id))) {
      return res.status(400).json({ message: "Already shared" });
    }

    habit.sharedWith.push(receiver._id);
    await owner.save();

    res.json({ message: "Habit shared successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* MY HABITS */
const getMyHabits = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name habits");
    if (!user) return res.status(404).json({ message: "User not found" });

    // collect all sharedWith ids across all habits (so we do one query)
    const allSharedIds = user.habits
      .flatMap(h => h.sharedWith || [])
      .map(id => id.toString());

    const uniqueIds = [...new Set(allSharedIds)];

    const sharedUsers = uniqueIds.length
      ? await User.find({ _id: { $in: uniqueIds } }).select("_id name")
      : [];

    const idToName = new Map(sharedUsers.map(u => [u._id.toString(), u.name]));

    const habits = user.habits.map(h => {
      const baseDate = h.lastFailureDate || h.startDate; // ✅ streak starts immediately
      return {
        ...h.toObject(),
        streakDays: getStreakDays(baseDate),
        almostRelapsesCount: (h.almostRelapses?.length || 0),
        almostRelapses: (h.almostRelapses || []),
        sharedWithNames: (h.sharedWith || [])
          .map(id => idToName.get(id.toString()))
          .filter(Boolean)
      };
    });

    res.json({
      user: { id: user._id, name: user.name },
      habits
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* SHARED WITH ME */
const getSharedHabits = async (req, res) => {
  try {
    const viewer = await User.findById(req.userId).select("_id name");
    if (!viewer) return res.status(404).json({ message: "User not found" });

    const owners = await User.find({ "habits.sharedWith": viewer._id }).select("name habits");

    const sharedHabits = [];

    for (const owner of owners) {
      for (const habit of owner.habits) {
        // IMPORTANT: ObjectId compare must use equals()
        const isShared = (habit.sharedWith || []).some(id => id.equals(viewer._id));
        if (!isShared) continue;

        const baseDate = habit.lastFailureDate || habit.startDate;

        sharedHabits.push({
          owner: owner.name,
          name: habit.name,
          startDate: habit.startDate,
          lastFailureDate: habit.lastFailureDate,
          streakDays: getStreakDays(baseDate),
          almostRelapsesCount: habit.almostRelapses?.length || 0
        });
      }
    }

    res.json(sharedHabits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  addHabit,
  logHabitFailure,
  logAlmostRelapse,
  deleteHabit,
  shareHabit,
  getMyHabits,
  getSharedHabits
};
