import React, { useEffect, useState } from 'react';
import { settingService } from '@/services/settingService';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Receipt } from 'lucide-react';
import { toast } from 'sonner';

/** Matches the keys/defaults in backend/controllers/bookingInvoiceController.js */
const INVOICE_SETTINGS = [
  { key: 'invoice_enabled_general', label: 'General Service', default: true },
  { key: 'invoice_enabled_car_wash', label: 'Car Wash', default: true },
  { key: 'invoice_enabled_tyres', label: 'Tyres', default: false },
  { key: 'invoice_enabled_battery', label: 'Battery', default: false },
] as const;

type ToggleKey = (typeof INVOICE_SETTINGS)[number]['key'];

/**
 * Lets admins control which service categories generate a customer-facing
 * invoice, without needing a code change. Backed by the generic Setting
 * model (group: 'operations') and enforced server-side in
 * bookingInvoiceController.js — toggling here takes effect immediately.
 */
const InvoiceSettingsCard: React.FC = () => {
  const [values, setValues] = useState<Record<ToggleKey, boolean>>(() =>
    Object.fromEntries(INVOICE_SETTINGS.map((s) => [s.key, s.default])) as Record<ToggleKey, boolean>
  );
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await settingService.getSettings();
        if (cancelled) return;
        setValues((prev) => {
          const next = { ...prev };
          for (const { key } of INVOICE_SETTINGS) {
            const found = settings.find((s) => s.key === key);
            if (found && typeof found.value === 'boolean') {
              next[key] = found.value;
            }
          }
          return next;
        });
      } catch {
        // Keep defaults on failure — non-fatal, this card just won't reflect saved state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (key: ToggleKey, checked: boolean) => {
    const previous = values[key];
    setValues((prev) => ({ ...prev, [key]: checked }));
    setSavingKey(key);
    try {
      await settingService.updateSetting({
        key,
        value: checked,
        group: 'operations',
        description: 'Whether customers/merchants can download an invoice for this service category.',
      });
      toast.success('Invoice setting updated');
    } catch (error) {
      setValues((prev) => ({ ...prev, [key]: previous }));
      toast.error('Failed to update invoice setting');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Invoice Generation</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Control which service categories customers can download an invoice for. Changes apply immediately — no deploy needed.
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {INVOICE_SETTINGS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              id={`invoice-toggle-${key}`}
              checked={values[key]}
              disabled={loading || savingKey === key}
              onCheckedChange={(checked) => handleToggle(key, checked)}
            />
            <Label htmlFor={`invoice-toggle-${key}`} className="text-sm cursor-pointer">
              {label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceSettingsCard;
