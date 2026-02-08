import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Settings, Globe, Briefcase, Clock, FileText } from 'lucide-react';
import { settingService, Setting } from '../../services/settingService';
import { toast } from 'react-hot-toast';

const SETTING_GROUPS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'business', label: 'Business & Finance', icon: Briefcase },
  { id: 'operations', label: 'Operations & SLA', icon: Clock },
  { id: 'content', label: 'App Content', icon: FileText },
];

interface SettingDefinition {
  group: string;
  label: string;
  type: string;
  default: string | number;
}

const DEFAULT_SETTINGS: Record<string, SettingDefinition> = {
  // General
  app_name: { group: 'general', label: 'App Name', type: 'text', default: 'DriveFlow' },
  support_email: { group: 'general', label: 'Support Email', type: 'email', default: 'support@driveflow.com' },
  contact_phone: { group: 'general', label: 'Contact Phone', type: 'text', default: '+91 9876543210' },
  
  // Business
  platform_commission: { group: 'business', label: 'Platform Commission (%)', type: 'number', default: 10 },
  tax_percentage: { group: 'business', label: 'Tax / GST (%)', type: 'number', default: 18 },
  currency: { group: 'business', label: 'Currency Symbol', type: 'text', default: '₹' },

  // Operations
  sla_timer_minutes: { group: 'operations', label: 'SLA Warning Timer (mins)', type: 'number', default: 30 },
  service_time_slots: { group: 'operations', label: 'Default Time Slots (comma separated)', type: 'text', default: '09:00 AM, 11:00 AM, 02:00 PM, 04:00 PM' },
  booking_buffer_minutes: { group: 'operations', label: 'Booking Buffer (mins)', type: 'number', default: 60 },

  // Content
  terms_url: { group: 'content', label: 'Terms & Conditions URL', type: 'url', default: '' },
  privacy_url: { group: 'content', label: 'Privacy Policy URL', type: 'url', default: '' },
};

const AdminSettingsPage = () => {
  const [activeGroup, setActiveGroup] = useState('general');
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await settingService.getSettings();
      // Convert array to object: { key: value }
      const settingsMap: Record<string, string | number> = {};
      data.forEach((s: Setting) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.keys(DEFAULT_SETTINGS)
        .filter((key) => DEFAULT_SETTINGS[key].group === activeGroup)
        .map((key) => ({
          key,
          value: settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key].default,
          group: activeGroup,
        }));

      await settingService.bulkUpdateSettings(updates);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
          <p className="text-gray-600">Configure application preferences and operational parameters</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-70"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-100 p-2 h-fit">
          {SETTING_GROUPS.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${
                activeGroup === group.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <group.icon size={18} />
              {group.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <motion.div
          key={activeGroup}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            {React.createElement(SETTING_GROUPS.find(g => g.id === activeGroup)?.icon || Settings, { size: 20 })}
            {SETTING_GROUPS.find(g => g.id === activeGroup)?.label} Settings
          </h2>

          <div className="space-y-6 max-w-2xl">
            {Object.entries(DEFAULT_SETTINGS)
              .filter(([_, config]) => config.group === activeGroup)
              .map(([key, config]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {config.label}
                  </label>
                  <input
                    type={config.type}
                    value={settings[key] !== undefined ? settings[key] : config.default}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Key: <span className="font-mono">{key}</span>
                  </p>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
