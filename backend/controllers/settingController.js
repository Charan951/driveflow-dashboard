import Setting from '../models/Setting.js';
import { emitEntitySync } from '../utils/syncService.js';

// @desc    Get public settings
// @route   GET /api/settings/public
// @access  Public
export const getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.find({ group: 'content' });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.find({});
    // Transform to object for easier frontend consumption: { commission_rate: 10, ... }
    // Or return list. List is better for editing.
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update or Create a setting
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSetting = async (req, res) => {
  const { key, value, group, description } = req.body;
  try {
    let setting = await Setting.findOne({ key });
    let action = 'updated';

    if (setting) {
      setting.value = value;
      if (group) setting.group = group;
      if (description) setting.description = description;
      await setting.save();
    } else {
      setting = await Setting.create({ key, value, group, description });
      action = 'created';
    }

    // Global Real-time Sync
    emitEntitySync('setting', action, setting);

    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk update settings
// @route   PUT /api/settings/bulk
// @access  Private/Admin
export const bulkUpdateSettings = async (req, res) => {
  const { settings } = req.body; // Expect array of { key, value }
  try {
    const promises = settings.map(async (s) => {
      return Setting.findOneAndUpdate(
        { key: s.key },
        { $set: { value: s.value, group: s.group, description: s.description } },
        { new: true, upsert: true }
      );
    });

    const updatedSettings = await Promise.all(promises);
    
    // Global Real-time Sync for each updated setting
    updatedSettings.forEach(setting => {
      emitEntitySync('setting', 'updated', setting);
    });
    
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
