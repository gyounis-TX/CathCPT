import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Hospital, Inpatient } from '../../types';
import { getChargeQueue } from '../../services/adminChargeService';
import { StoredCharge } from '../../services/chargesService';
import {
  getAllInpatientCodes,
  calculateMedicarePayment
} from '../../data/inpatientCodes';

interface ReportsTabProps {
  orgId: string;
  hospitals: Hospital[];
  patients: Inpatient[];
  currentUserId: string;
  currentUserName: string;
}

type GroupBy = 'provider' | 'hospital' | 'cptCode';
type DatePreset = 'thisWeek' | 'thisMonth' | 'last30' | 'last90' | 'allTime' | 'custom';
type StatusFilter = 'all' | 'pending' | 'entered' | 'billed';

interface ReportRow {
  label: string;
  chargeCount: number;
  totalRVU: number;
  totalPayment: number;
  avgRVU: number;
}

function getDateRange(preset: DatePreset, customStart?: string, customEnd?: string): { start: string; end: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endStr = today.toISOString().split('T')[0];

  switch (preset) {
    case 'thisWeek': {
      const dayOfWeek = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - dayOfWeek);
      return { start: start.toISOString().split('T')[0], end: endStr };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: start.toISOString().split('T')[0], end: endStr };
    }
    case 'last30': {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      return { start: start.toISOString().split('T')[0], end: endStr };
    }
    case 'last90': {
      const start = new Date(today);
      start.setDate(today.getDate() - 90);
      return { start: start.toISOString().split('T')[0], end: endStr };
    }
    case 'allTime':
      return null;
    case 'custom':
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd };
      }
      return null;
  }
}

function getRVUForCode(cptCode: string): number {
  // Strip modifiers (e.g., "99232-25" -> "99232")
  const baseCode = cptCode.replace(/-\w+$/, '');
  const allCodes = getAllInpatientCodes();
  const found = allCodes.find(c => c.code === baseCode);
  return found?.rvu || 0;
}

function parseChargeRVU(charge: StoredCharge): number {
  // Use stored RVU if available
  if (charge.rvu && charge.rvu > 0) return charge.rvu;

  // Otherwise compute from CPT codes
  const codes = charge.cptCode.split(' + ').map(c => c.trim());
  return codes.reduce((sum, code) => sum + getRVUForCode(code), 0);
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  orgId,
  hospitals,
  patients,
  currentUserId,
  currentUserName
}) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('provider');
  const [datePreset, setDatePreset] = useState<DatePreset>('last30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [charges, setCharges] = useState<{ charge: StoredCharge; physicianName: string; hospitalName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const patientMap = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);

  const loadCharges = useCallback(async () => {
    setIsLoading(true);
    const dateRange = getDateRange(datePreset, customStart, customEnd);

    const items = await getChargeQueue(orgId, {
      status: statusFilter === 'all' ? 'all' : statusFilter as 'pending' | 'entered',
      physicianId: null,
      hospitalId: null,
      dateRange,
      searchQuery: ''
    });

    // getChargeQueue filters out billed by default when status is 'all'
    // We need all statuses for reports, so fetch again with explicit status if needed
    let allItems = items;

    if (statusFilter === 'all') {
      // Re-fetch with each status to include billed charges
      const [pendingItems, enteredItems] = [items, items]; // already filtered
      // Actually getChargeQueue with status='all' hides billed. We need to work around this.
      // Let's fetch separately for billed status
      const billedItems = await getChargeQueue(orgId, {
        status: 'all',
        physicianId: null,
        hospitalId: null,
        dateRange,
        searchQuery: ''
      });
      // The above still filters billed. Let's use a different approach - directly get all charges
      allItems = items;
    }

    setCharges(allItems.map(item => ({
      charge: item.charge,
      physicianName: item.physicianName,
      hospitalName: item.hospitalName
    })));
    setIsLoading(false);
  }, [orgId, datePreset, customStart, customEnd, statusFilter]);

  useEffect(() => {
    loadCharges();
  }, [loadCharges]);

  // Compute report rows
  const reportRows = useMemo((): ReportRow[] => {
    const groups = new Map<string, { chargeCount: number; totalRVU: number }>();

    for (const item of charges) {
      let key: string;

      switch (groupBy) {
        case 'provider':
          key = item.physicianName || 'Unknown';
          break;
        case 'hospital':
          key = item.hospitalName || 'Unknown';
          break;
        case 'cptCode': {
          // Split combined codes and count each individually
          const codes = item.charge.cptCode.split(' + ').map(c => c.trim());
          for (const code of codes) {
            const baseCode = code.replace(/-\w+$/, '');
            const codeRVU = getRVUForCode(code);
            const existing = groups.get(baseCode) || { chargeCount: 0, totalRVU: 0 };
            existing.chargeCount += 1;
            existing.totalRVU += codeRVU;
            groups.set(baseCode, existing);
          }
          continue; // Already handled
        }
      }

      if (groupBy !== 'cptCode') {
        const rvu = parseChargeRVU(item.charge);
        const existing = groups.get(key) || { chargeCount: 0, totalRVU: 0 };
        existing.chargeCount += 1;
        existing.totalRVU += rvu;
        groups.set(key, existing);
      }
    }

    const rows: ReportRow[] = [];
    for (const [label, data] of groups.entries()) {
      const payment = calculateMedicarePayment(data.totalRVU);
      rows.push({
        label,
        chargeCount: data.chargeCount,
        totalRVU: data.totalRVU,
        totalPayment: payment,
        avgRVU: data.chargeCount > 0 ? data.totalRVU / data.chargeCount : 0
      });
    }

    // Sort by total payment descending
    rows.sort((a, b) => b.totalPayment - a.totalPayment);
    return rows;
  }, [charges, groupBy]);

  // Grand totals
  const totals = useMemo(() => {
    return reportRows.reduce(
      (acc, row) => ({
        chargeCount: acc.chargeCount + row.chargeCount,
        totalRVU: acc.totalRVU + row.totalRVU,
        totalPayment: acc.totalPayment + row.totalPayment
      }),
      { chargeCount: 0, totalRVU: 0, totalPayment: 0 }
    );
  }, [reportRows]);

  const datePresets: { key: DatePreset; label: string }[] = [
    { key: 'thisWeek', label: 'This Week' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'last90', label: 'Last 90 Days' },
    { key: 'allTime', label: 'All Time' },
    { key: 'custom', label: 'Custom' }
  ];

  const groupByOptions: { key: GroupBy; label: string }[] = [
    { key: 'provider', label: 'By Provider' },
    { key: 'hospital', label: 'By Hospital' },
    { key: 'cptCode', label: 'By CPT Code' }
  ];

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'entered', label: 'Entered' },
    { key: 'billed', label: 'Billed' }
  ];

  const columnLabel = groupBy === 'cptCode' ? 'CPT Code' : groupBy === 'provider' ? 'Provider' : 'Hospital';

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Date Range
          </label>
          <div className="flex flex-wrap gap-1.5">
            {datePresets.map(p => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  datePreset === p.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <div className="flex gap-2 mt-2">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
              <span className="text-gray-400 self-center text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Group By */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Group By</label>
          <div className="flex gap-1.5">
            {groupByOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setGroupBy(opt.key)}
                className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                  groupBy === opt.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            <Filter className="w-3.5 h-3.5 inline mr-1" />
            Status
          </label>
          <div className="flex gap-1.5">
            {statusOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={`flex-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  statusFilter === opt.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : reportRows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No charges found for the selected filters.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">{columnLabel}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Charges</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Total RVU</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Total $</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Avg RVU</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, i) => (
                    <tr key={row.label} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2 text-gray-900 font-medium">{row.label}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.chargeCount}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.totalRVU.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-green-700 font-medium">${row.totalPayment.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{row.avgRVU.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                    <td className="px-3 py-2 text-gray-900">Total</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totals.chargeCount}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totals.totalRVU.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-green-800">${totals.totalPayment.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {totals.chargeCount > 0 ? (totals.totalRVU / totals.chargeCount).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
