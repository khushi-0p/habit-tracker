const Habit = require('../models/Habit');

// POST /api/habits
const createHabit = async (req, res) => {
  try {
    const { name, description, reminderTime } = req.body;
    if (!name) return res.status(400).json({ message: 'Habit name is required' });

    const habit = await Habit.create({
      user: req.user._id,
      name,
      description: description || '',
      reminderTime: reminderTime || null,
    });

    res.status(201).json(habit);
  } catch (err) {
    console.error('Create habit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/habits
const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 });

    const habitsWithStats = habits.map((habit) => {
      const today = new Date().toISOString().split('T')[0];
      const completedToday = habit.completions.some(c => c.date === today);
      return {
        _id: habit._id,
        name: habit.name,
        description: habit.description,
        reminderTime: habit.reminderTime,
        streak: habit.getStreak(),
        completionRate: habit.getCompletionRate(),
        completedToday,
        totalCompletions: habit.completions.length,
        createdAt: habit.createdAt,
      };
    });

    res.json(habitsWithStats);
  } catch (err) {
    console.error('Get habits error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/habits/:id/complete
const completeHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const today = new Date().toISOString().split('T')[0];
    const alreadyDone = habit.completions.some(c => c.date === today);

    if (alreadyDone) {
      // Toggle: remove today's completion
      habit.completions = habit.completions.filter(c => c.date !== today);
    } else {
      habit.completions.push({ date: today });
    }

    await habit.save();

    res.json({
      _id: habit._id,
      name: habit.name,
      streak: habit.getStreak(),
      completionRate: habit.getCompletionRate(),
      completedToday: !alreadyDone,
      totalCompletions: habit.completions.length,
    });
  } catch (err) {
    console.error('Complete habit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/habits/:id/stats
const getHabitStats = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const today = new Date().toISOString().split('T')[0];

    // Build last 30 days calendar
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      last30.push({
        date: d,
        completed: habit.completions.some(c => c.date === d),
      });
    }

    res.json({
      _id: habit._id,
      name: habit.name,
      description: habit.description,
      streak: habit.getStreak(),
      completionRate: habit.getCompletionRate(),
      completedToday: habit.completions.some(c => c.date === today),
      totalCompletions: habit.completions.length,
      last30Days: last30,
      createdAt: habit.createdAt,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/habits/:id
const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json({ message: 'Habit deleted successfully' });
  } catch (err) {
    console.error('Delete habit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createHabit, getHabits, completeHabit, getHabitStats, deleteHabit };
