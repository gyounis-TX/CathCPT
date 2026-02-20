import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import {
  ReportSchedule,
  getReportSchedule,
  saveReportSchedule,
  getNextDueDate
} from '../../services/reportScheduleService';

interface ReportScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onScheduleChanged: () => void;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ReportScheduleDialog: React.FC<ReportScheduleDialogProps> = ({
  isOpen,
  onClose,
  orgId,
  onScheduleChanged
}) => {
  const [schedule, setSchedule] = useState<ReportSchedule>({
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    lastGeneratedAt: null,
    isActive: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSchedule();
    }
  }, [isOpen, orgId]);

  const loadSchedule = async () => {
    const s = await getReportSchedule(orgId);
    setSchedule(s);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveReportSchedule(orgId, schedule);
    onScheduleChanged();
    setIsSaving(false);
    onClose();
  };

  const nextDue = getNextDueDate(schedule);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Report Schedule</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Enable Reminders</span>
            <button
              onClick={() => setSchedule(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                schedule.isActive ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  schedule.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {schedule.isActive && (
            <>
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={schedule.frequency}
                  onChange={(e) => setSchedule(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Day of Week (weekly) */}
              {schedule.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={schedule.dayOfWeek}
                    onChange={(e) => setSchedule(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {dayNames.map((name, i) => (
                      <option key={i} value={i}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Day of Month (monthly) */}
              {schedule.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                  <select
                    value={schedule.dayOfMonth}
                    onChange={(e) => setSchedule(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Next Due Date */}
              {nextDue && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    Next due: {nextDue.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Last Generated */}
              {schedule.lastGeneratedAt && (
                <p className="text-xs text-gray-500">
                  Last generated: {new Date(schedule.lastGeneratedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
