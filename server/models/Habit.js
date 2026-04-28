const mongoose = require('mongoose');

const CompletionSchema = new mongoose.Schema({
  date: {
    type: String, // stored as YYYY-MM-DD
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

const HabitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  completions: [CompletionSchema],
  reminderTime: {
    type: String,
    default: null,
  },
}, { timestamps: true });

// Calculate current streak
HabitSchema.methods.getStreak = function () {
  if (!this.completions.length) return 0;

  const dates = this.completions
    .map(c => c.date)
    .sort()
    .reverse();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const curr = new Date(dates[i]);
    const next = new Date(dates[i + 1]);
    const diff = (curr - next) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

// Calculate completion rate (last 30 days)
HabitSchema.methods.getCompletionRate = function () {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const recentCompletions = this.completions.filter(c => c.date >= thirtyDaysAgo);
  return Math.round((recentCompletions.length / 30) * 100);
};

module.exports = mongoose.models.Habit || mongoose.model('Habit', HabitSchema);
