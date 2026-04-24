const supabase = require('../supabase');

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
    const userId = req.userId;

    if (!name) return res.status(400).json({ message: "Habit name required" });

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    const shareCode = generateShareCode();

    // Create habit
    const { data: habit, error } = await supabase
      .from('habits')
      .insert([
        {
          user_id: userId,
          name,
          share_code: shareCode,
          start_date: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      id: habit[0].id,
      name: habit[0].name,
      startDate: habit[0].start_date,
      lastFailureDate: habit[0].last_failure_date,
      history: [],
      almostRelapses: [],
      shareCode: habit[0].share_code,
      sharedWith: [],
      streakDays: 0
    });
  } catch (err) {
    console.error('Add habit error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* LOG FAILURE */
const logHabitFailure = async (req, res) => {
  try {
    const { habitId } = req.body;
    const userId = req.userId;

    console.log(`[LOG FAILURE] habitId: ${habitId}, userId: ${userId}`);
    console.log(`[LOG FAILURE] Full body:`, req.body);

    if (!habitId) {
      console.log('[LOG FAILURE] ERROR: habitId not provided in request body');
      return res.status(400).json({ 
        message: "habitId is required in request body",
        received: req.body
      });
    }

    // Verify habit belongs to user
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', userId);

    console.log(`[LOG FAILURE] Query error: ${habitError}, Found habits: ${habit?.length || 0}`);

    if (habitError) {
      return res.status(500).json({ message: "Error finding habit: " + habitError.message });
    }

    if (!habit || habit.length === 0) {
      console.log(`[LOG FAILURE] Habit ${habitId} not found for user ${userId}`);
      return res.status(404).json({ 
        message: "Habit not found",
        debug: { habitId, userId, habitsFound: habit?.length || 0 }
      });
    }

    const now = new Date().toISOString();

    // Update habit's last failure date
    const { error: updateError } = await supabase
      .from('habits')
      .update({ last_failure_date: now })
      .eq('id', habitId);

    if (updateError) throw updateError;

    // Add to history
    const { error: historyError } = await supabase
      .from('habit_history')
      .insert([{ habit_id: habitId, failure_date: now }]);

    if (historyError) throw historyError;

    // Clear almost relapses
    const { error: clearError } = await supabase
      .from('almost_relapses')
      .delete()
      .eq('habit_id', habitId);

    if (clearError) throw clearError;

    console.log(`[LOG FAILURE] Successfully logged failure for habit ${habitId}`);
    res.json({ message: "Failure logged" });
  } catch (err) {
    console.error('Log failure error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* LOG ALMOST RELAPSE */
const logAlmostRelapse = async (req, res) => {
  try {
    const { habitId, note } = req.body;
    const userId = req.userId;

    console.log(`[ALMOST RELAPSE] habitId: ${habitId}, userId: ${userId}, note: ${note}`);
    console.log(`[ALMOST RELAPSE] Full body:`, req.body);

    if (!habitId) {
      console.log('[ALMOST RELAPSE] ERROR: habitId not provided in request body');
      return res.status(400).json({ 
        message: "habitId is required in request body",
        received: req.body
      });
    }

    // Verify habit belongs to user
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', userId);

    console.log(`[ALMOST RELAPSE] Query error: ${habitError}, Found habits: ${habit?.length || 0}`);

    if (habitError || !habit || habit.length === 0) {
      console.log(`[ALMOST RELAPSE] Habit ${habitId} not found for user ${userId}`);
      return res.status(404).json({ 
        message: "Habit not found",
        debug: { habitId, userId, habitsFound: habit?.length || 0 }
      });
    }

    // Add almost relapse
    const { error } = await supabase
      .from('almost_relapses')
      .insert([
        {
          habit_id: habitId,
          note: note || ''
        }
      ]);

    if (error) throw error;

    // Get count
    const { count } = await supabase
      .from('almost_relapses')
      .select('*', { count: 'exact', head: true })
      .eq('habit_id', habitId);

    console.log(`[ALMOST RELAPSE] Successfully logged for habit ${habitId}`);
    res.json({
      message: "Almost relapse logged",
      totalAlmostRelapses: count || 0
    });
  } catch (err) {
    console.error('Log almost relapse error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* DELETE HABIT */
const deleteHabit = async (req, res) => {
  try {
    const { habitId } = req.params;
    const userId = req.userId;

    console.log(`[DELETE] habitId: ${habitId}, userId: ${userId}`);
    console.log(`[DELETE] URL params:`, req.params);

    if (!habitId) {
      console.log('[DELETE] ERROR: habitId not provided in URL path');
      return res.status(400).json({ 
        message: "habitId is required in URL path",
        example: "DELETE /habits/550e8400-e29b-41d4-a716-446655440000"
      });
    }

    // Verify habit belongs to user (don't use .single() - it throws error if not found)
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id')
      .eq('id', habitId)
      .eq('user_id', userId);

    console.log(`[DELETE] Query error: ${habitError}, Found habits: ${habit?.length || 0}`);

    if (habitError) {
      console.error('Habit query error:', habitError);
      return res.status(500).json({ message: "Error finding habit: " + habitError.message });
    }

    if (!habit || habit.length === 0) {
      console.log(`[DELETE] Habit ${habitId} not found for user ${userId}`);
      return res.status(404).json({ 
        message: "Habit not found",
        debug: { habitId, userId, habitsFound: habit?.length || 0 }
      });
    }

    // Delete habit (cascade will handle related records)
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    console.log(`[DELETE] Successfully deleted habit ${habitId}`);
    res.json({ message: "Habit deleted" });
  } catch (err) {
    console.error('Delete habit error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* SHARE HABIT */
const shareHabit = async (req, res) => {
  try {
    const { code } = req.body;
    const receiverId = req.userId;

    // Find habit by share code
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, user_id')
      .eq('share_code', code)
      .single();

    if (habitError || !habit) {
      return res.status(404).json({ message: "Invalid share code" });
    }

    // Check if already shared
    const { data: existingShare } = await supabase
      .from('habit_shares')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('shared_with_user_id', receiverId)
      .single();

    if (existingShare) {
      return res.status(400).json({ message: "Already shared" });
    }

    // Create share
    const { error } = await supabase
      .from('habit_shares')
      .insert([
        {
          habit_id: habit.id,
          shared_with_user_id: receiverId
        }
      ]);

    if (error) throw error;

    res.json({ message: "Habit shared successfully" });
  } catch (err) {
    console.error('Share habit error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* GET MY HABITS */
const getMyHabits = async (req, res) => {
  try {
    const userId = req.userId;

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all habits for user
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId);

    if (habitsError) throw habitsError;

    // For each habit, get history, almost relapses, and shares
    const enrichedHabits = await Promise.all(
      habits.map(async (habit) => {
        // Get history
        const { data: history } = await supabase
          .from('habit_history')
          .select('failure_date')
          .eq('habit_id', habit.id);

        // Get almost relapses
        const { data: almostRelapses } = await supabase
          .from('almost_relapses')
          .select('note, created_at')
          .eq('habit_id', habit.id);

        // Get shared with users
        const { data: shares } = await supabase
          .from('habit_shares')
          .select('shared_with_user_id')
          .eq('habit_id', habit.id);

        let sharedWithUserIds = shares?.map(s => s.shared_with_user_id) || [];

        // Get names of shared users
        let sharedWithNames = [];
        if (sharedWithUserIds.length > 0) {
          const { data: sharedUsers } = await supabase
            .from('users')
            .select('id, name')
            .in('id', sharedWithUserIds);

          sharedWithNames = sharedUsers?.map(u => u.name) || [];
        }

        const baseDate = habit.last_failure_date || habit.start_date;

        return {
          id: habit.id,
          name: habit.name,
          startDate: habit.start_date,
          lastFailureDate: habit.last_failure_date,
          history: history?.map(h => h.failure_date) || [],
          almostRelapses: (almostRelapses || []).map(r => ({
            date: r.created_at,
            note: r.note
          })),
          almostRelapsesCount: almostRelapses?.length || 0,
          shareCode: habit.share_code,
          sharedWith: sharedWithUserIds,
          sharedWithNames: sharedWithNames,
          streakDays: getStreakDays(baseDate)
        };
      })
    );

    res.json({
      user: { id: user.id, name: user.name },
      habits: enrichedHabits
    });
  } catch (err) {
    console.error('Get my habits error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* GET SHARED HABITS */
const getSharedHabits = async (req, res) => {
  try {
    const viewerId = req.userId;

    // Get viewer data
    const { data: viewer, error: viewerError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', viewerId)
      .single();

    if (viewerError || !viewer) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all habits shared with this user
    const { data: shares, error: sharesError } = await supabase
      .from('habit_shares')
      .select('habit_id')
      .eq('shared_with_user_id', viewerId);

    if (sharesError) throw sharesError;

    if (!shares || shares.length === 0) {
      return res.json([]);
    }

    const habitIds = shares.map(s => s.habit_id);

    // Get habits and owner info
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, start_date, last_failure_date, user_id')
      .in('id', habitIds);

    if (habitsError) throw habitsError;

    // Get owner info for each habit
    const sharedHabits = await Promise.all(
      habits.map(async (habit) => {
        const { data: owner } = await supabase
          .from('users')
          .select('name')
          .eq('id', habit.user_id)
          .single();

        // Get almost relapses count
        const { count: almostRelapsesCount } = await supabase
          .from('almost_relapses')
          .select('*', { count: 'exact', head: true })
          .eq('habit_id', habit.id);

        const baseDate = habit.last_failure_date || habit.start_date;

        return {
          habitId: habit.id,
          owner: owner?.name || 'Unknown',
          name: habit.name,
          startDate: habit.start_date,
          lastFailureDate: habit.last_failure_date,
          streakDays: getStreakDays(baseDate),
          almostRelapsesCount: almostRelapsesCount || 0
        };
      })
    );

    res.json(sharedHabits);
  } catch (err) {
    console.error('Get shared habits error:', err.message);
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
