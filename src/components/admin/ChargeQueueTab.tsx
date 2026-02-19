import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Check,
  CheckCheck,
  Edit2,
  DollarSign,
  Clock
} from 'lucide-react';
import { ChargeQueueFilters, ChargeQueueItem, Hospital, Inpatient } from '../../types';
import { StoredCharge, ChargeStatus, markChargeEntered, markChargeBilled } from '../../services/chargesService';
import { getChargeQueue } from '../../services/adminChargeService';
import { logAuditEvent } from '../../services/auditService';
import { calculateMedicarePayment, getAllInpatientCodes } from '../../data/inpatientCodes';
import { getAllEPCodes } from '../../data/epCodes';
import { getAllEchoCodes } from '../../data/echoCodes';
import { ChargeEditDialog } from './ChargeEditDialog';
import { BatchBillConfirmDialog } from './BatchBillConfirmDialog';

interface ChargeQueueTabProps {
  orgId: string;
  hospitals: Hospital[];
  patients: Inpatient[];
  currentUserId: string;
  currentUserName: string;
  onChargesUpdated: () => void;
  refreshKey?: number;
}

export const ChargeQueueTab: React.FC<ChargeQueueTabProps> = ({
  orgId,
  hospitals,
  patients,
  currentUserId,
  currentUserName,
  onChargesUpdated,
  refreshKey
}) => {
  const [items, setItems] = useState<ChargeQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [editingCharge, setEditingCharge] = useState<{ charge: StoredCharge; patientName: string } | null>(null);
  const [batchAction, setBatchAction] = useState<{ items: ChargeQueueItem[]; action: 'entered' | 'billed' } | null>(null);

  const [filters, setFilters] = useState<ChargeQueueFilters>({
    status: 'all',
    physicianId: null,
    hospitalId: null,
    dateRange: null,
    searchQuery: ''
  });

  const allCodes = useMemo(() => [...getAllInpatientCodes(), ...getAllEPCodes(), ...getAllEchoCodes()], []);

  const getRVU = useCallback((cptCode: string): number => {
    if (cptCode.includes(' + ')) {
      return cptCode.split(' + ').reduce((sum, code) => {
        const baseCode = code.replace(/-\d+$/, '').trim();
        const codeData = allCodes.find(c => c.code === baseCode);
        return sum + (codeData?.rvu || 0);
      }, 0);
    }
    const baseCode = cptCode.replace(/-\d+$/, '').trim();
    const code = allCodes.find(c => c.code === baseCode);
    return code?.rvu || 0;
  }, [allCodes]);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    const queueItems = await getChargeQueue(orgId, filters, patients);
    setItems(queueItems);
    setIsLoading(false);
  }, [orgId, filters, patients]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Reload when parent triggers refresh
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      loadQueue();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.charge.id)));
    }
  };

  const toggleSelect = (chargeId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(chargeId)) {
        next.delete(chargeId);
      } else {
        next.add(chargeId);
      }
      return next;
    });
  };

  const handleMarkEntered = async (item: ChargeQueueItem) => {
    // Optimistic update — change status immediately in UI
    setItems(prev => prev.map(i =>
      i.charge.id === item.charge.id
        ? { ...i, charge: { ...i.charge, status: 'entered' as ChargeStatus, enteredAt: new Date().toISOString(), enteredBy: currentUserName } }
        : i
    ));
    // Persist (pass full charge in case it's a mock not yet in storage)
    await markChargeEntered(item.charge.id, currentUserName, item.charge);
    await logAuditEvent(orgId, {
      action: 'charge_marked_entered',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: item.patient.id,
      targetPatientName: item.patient.patientName,
      details: `Marked charge ${item.charge.cptCode} as entered for ${item.patient.patientName}`,
      listContext: null,
      metadata: { chargeId: item.charge.id, chargeDate: item.charge.chargeDate, previousStatus: item.charge.status, newStatus: 'entered' }
    });
    onChargesUpdated();
  };

  const handleMarkBilled = async (item: ChargeQueueItem) => {
    // Optimistic update — change status immediately in UI
    setItems(prev => prev.map(i =>
      i.charge.id === item.charge.id
        ? { ...i, charge: { ...i.charge, status: 'billed' as ChargeStatus, billedAt: new Date().toISOString(), billedBy: currentUserName } }
        : i
    ));
    // Persist (pass full charge in case it's a mock not yet in storage)
    await markChargeBilled(item.charge.id, currentUserName, item.charge);
    await logAuditEvent(orgId, {
      action: 'charge_marked_billed',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: item.patient.id,
      targetPatientName: item.patient.patientName,
      details: `Marked charge ${item.charge.cptCode} as billed for ${item.patient.patientName}`,
      listContext: null,
      metadata: { chargeId: item.charge.id, chargeDate: item.charge.chargeDate, previousStatus: item.charge.status, newStatus: 'billed' }
    });
    onChargesUpdated();
  };

  const handleBatchAction = (action: 'entered' | 'billed') => {
    const selectedItems = items.filter(item => selectedIds.has(item.charge.id));
    if (selectedItems.length === 0) return;
    setBatchAction({ items: selectedItems, action });
  };

  const handleBatchCompleted = async () => {
    setSelectedIds(new Set());
    await loadQueue();
    onChargesUpdated();
  };

  const handleEditSaved = async () => {
    await loadQueue();
    onChargesUpdated();
  };

  // Unique physicians for filter
  const physicians = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(item => {
      const id = item.charge.submittedByUserId || item.patient.primaryPhysicianId;
      if (id && !map.has(id)) {
        map.set(id, item.physicianName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const formatDOS = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">Pending</span>;
      case 'entered':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"><Check className="w-3 h-3" />Entered</span>;
      case 'billed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium"><CheckCheck className="w-3 h-3" />Billed</span>;
      default:
        return null;
    }
  };

  // Visible items (filter out billed when in "all" mode, since optimistic update keeps them in array)
  const visibleItems = useMemo(() => {
    if (filters.status === 'all') {
      return items.filter(i => i.charge.status !== 'billed');
    }
    return items.filter(i => i.charge.status === filters.status);
  }, [items, filters.status]);

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filter Bar */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search patient, MRN, or CPT..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {/* Batch actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300">
              <span className="text-sm font-medium text-blue-700">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBatchAction('entered')}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Mark Entered
              </button>
              <button
                onClick={() => handleBatchAction('billed')}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark Billed
              </button>
            </div>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All Active</option>
              <option value="pending">Pending</option>
              <option value="entered">Entered</option>
              <option value="billed">Billed</option>
            </select>

            <select
              value={filters.physicianId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, physicianId: e.target.value || null }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All Physicians</option>
              {physicians.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={filters.hospitalId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, hospitalId: e.target.value || null }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All Hospitals</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading charges...</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <CheckCheck className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">Queue is clear</p>
            <p className="text-sm">No charges match your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-12 px-4 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedIds.size === visibleItems.length && visibleItems.length > 0
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {selectedIds.size === visibleItems.length && visibleItems.length > 0 && <Check className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">MRN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">DOS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Physician</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">CPT Code</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">RVU</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Payment</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleItems.map(item => {
                const rvu = item.charge.rvu || getRVU(item.charge.cptCode);
                const payment = calculateMedicarePayment(rvu);
                const isSelected = selectedIds.has(item.charge.id);
                const isBilled = item.charge.status === 'billed';

                return (
                  <tr
                    key={item.charge.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50' : isBilled ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(item.charge.id)}
                        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.patient.patientName}</p>
                    </td>

                    {/* MRN */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{item.patient.mrn || '—'}</p>
                    </td>

                    {/* DOS */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{formatDOS(item.charge.chargeDate)}</p>
                    </td>

                    {/* Physician */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 truncate">{item.physicianName}</p>
                    </td>

                    {/* CPT Code */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-gray-900">{item.charge.cptCode}</p>
                      {item.charge.cptDescription && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">{item.charge.cptDescription}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(item.charge.status)}
                    </td>

                    {/* RVU */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-700">{rvu.toFixed(2)}</span>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-green-600">${payment.toFixed(0)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {!isBilled && (
                          <>
                            <button
                              onClick={() => setEditingCharge({ charge: item.charge, patientName: item.patient.patientName })}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit charge"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {item.charge.status === 'pending' && (
                              <button
                                onClick={() => handleMarkEntered(item)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Mark as Entered"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleMarkBilled(item)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mark as Billed"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      {visibleItems.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {visibleItems.length} charge{visibleItems.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-700 font-medium">
              Total: {visibleItems.reduce((sum, item) => sum + (item.charge.rvu || getRVU(item.charge.cptCode)), 0).toFixed(2)} RVU
              {' | '}
              <span className="text-green-600">
                ${visibleItems.reduce((sum, item) => sum + calculateMedicarePayment(item.charge.rvu || getRVU(item.charge.cptCode)), 0).toFixed(0)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ChargeEditDialog
        isOpen={!!editingCharge}
        charge={editingCharge?.charge || null}
        patientName={editingCharge?.patientName || ''}
        orgId={orgId}
        adminId={currentUserId}
        adminName={currentUserName}
        onClose={() => setEditingCharge(null)}
        onSaved={handleEditSaved}
      />

      {batchAction && (
        <BatchBillConfirmDialog
          isOpen={!!batchAction}
          items={batchAction.items}
          action={batchAction.action}
          orgId={orgId}
          adminId={currentUserId}
          adminName={currentUserName}
          onClose={() => setBatchAction(null)}
          onCompleted={handleBatchCompleted}
        />
      )}
    </div>
  );
};

export default ChargeQueueTab;
