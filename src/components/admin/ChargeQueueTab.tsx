import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Check,
  CheckCheck,
  Edit2,
  ChevronDown,
  DollarSign,
  Clock
} from 'lucide-react';
import { ChargeQueueFilters, ChargeQueueItem, Hospital, Inpatient } from '../../types';
import { StoredCharge, markChargeEntered, markChargeBilled } from '../../services/chargesService';
import { getChargeQueue } from '../../services/adminChargeService';
import { logAuditEvent } from '../../services/auditService';
import { calculateMedicarePayment, getAllInpatientCodes } from '../../data/inpatientCodes';
import { ChargeEditDialog } from './ChargeEditDialog';
import { BatchBillConfirmDialog } from './BatchBillConfirmDialog';

interface ChargeQueueTabProps {
  orgId: string;
  hospitals: Hospital[];
  patients: Inpatient[];
  currentUserId: string;
  currentUserName: string;
  onChargesUpdated: () => void;
}

export const ChargeQueueTab: React.FC<ChargeQueueTabProps> = ({
  orgId,
  hospitals,
  patients,
  currentUserId,
  currentUserName,
  onChargesUpdated
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

  const allCodes = useMemo(() => getAllInpatientCodes(), []);

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
    const queueItems = await getChargeQueue(orgId, filters);
    setItems(queueItems);
    setIsLoading(false);
  }, [orgId, filters]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleRefreshAfterAction = async () => {
    setSelectedIds(new Set());
    await loadQueue();
    onChargesUpdated();
  };

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
    await markChargeEntered(item.charge.id, currentUserName);
    await logAuditEvent(orgId, {
      action: 'charge_marked_entered',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: item.patient.id,
      targetPatientName: item.patient.patientName,
      details: `Marked charge ${item.charge.cptCode} as entered for ${item.patient.patientName}`,
      listContext: null,
      metadata: { chargeId: item.charge.id, previousStatus: item.charge.status, newStatus: 'entered' }
    });
    await handleRefreshAfterAction();
  };

  const handleMarkBilled = async (item: ChargeQueueItem) => {
    await markChargeBilled(item.charge.id, currentUserName);
    await logAuditEvent(orgId, {
      action: 'charge_marked_billed',
      userId: currentUserId,
      userName: currentUserName,
      targetPatientId: item.patient.id,
      targetPatientName: item.patient.patientName,
      details: `Marked charge ${item.charge.cptCode} as billed for ${item.patient.patientName}`,
      listContext: null,
      metadata: { chargeId: item.charge.id, previousStatus: item.charge.status, newStatus: 'billed' }
    });
    await handleRefreshAfterAction();
  };

  const handleBatchAction = (action: 'entered' | 'billed') => {
    const selectedItems = items.filter(item => selectedIds.has(item.charge.id));
    if (selectedItems.length === 0) return;
    setBatchAction({ items: selectedItems, action });
  };

  // Get unique physicians for filter dropdown
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">Pending</span>;
      case 'entered':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex items-center gap-1"><Check className="w-3 h-3" />Entered</span>;
      case 'billed':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1"><CheckCheck className="w-3 h-3" />Billed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filter Bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search patient, MRN, or CPT..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-2 border rounded-lg text-sm ${
              showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All Active</option>
              <option value="pending">Pending</option>
              <option value="entered">Entered</option>
            </select>

            <select
              value={filters.physicianId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, physicianId: e.target.value || null }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All Physicians</option>
              {physicians.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={filters.hospitalId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, hospitalId: e.target.value || null }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All Hospitals</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Batch Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-blue-700">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={() => handleBatchAction('entered')}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Check className="w-3.5 h-3.5" />
              Mark Entered
            </button>
            <button
              onClick={() => handleBatchAction('billed')}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark Billed
            </button>
          </div>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading charges...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <CheckCheck className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">Queue is clear</p>
            <p className="text-sm">No charges match your filters</p>
          </div>
        ) : (
          <>
            {/* Select All Header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">
              <button
                onClick={handleSelectAll}
                className={`w-5 h-5 rounded border flex items-center justify-center ${
                  selectedIds.size === items.length
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                {selectedIds.size === items.length && <Check className="w-3 h-3" />}
              </button>
              <span className="flex-1">PATIENT</span>
              <span className="w-20">PHYSICIAN</span>
              <span className="w-16 text-center">CPT</span>
              <span className="w-16 text-center">STATUS</span>
              <span className="w-14 text-right">RVU</span>
              <span className="w-16 text-right">$</span>
              <span className="w-20"></span>
            </div>

            <div className="divide-y divide-gray-100">
              {items.map(item => {
                const rvu = item.charge.rvu || getRVU(item.charge.cptCode);
                const payment = calculateMedicarePayment(rvu);
                const isSelected = selectedIds.has(item.charge.id);
                const isBilled = item.charge.status === 'billed';

                return (
                  <div
                    key={item.charge.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isSelected ? 'bg-blue-50' : isBilled ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(item.charge.id)}
                      className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>

                    {/* Patient */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.patient.patientName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.patient.mrn && `MRN ${item.patient.mrn} • `}
                        {item.charge.chargeDate}
                      </p>
                    </div>

                    {/* Physician */}
                    <span className="w-20 text-xs text-gray-600 truncate hidden sm:block">
                      {item.physicianName}
                    </span>

                    {/* CPT */}
                    <span className="w-16 text-center font-mono text-sm text-gray-900">
                      {item.charge.cptCode.length > 7 ? item.charge.cptCode.substring(0, 7) + '...' : item.charge.cptCode}
                    </span>

                    {/* Status */}
                    <div className="w-16 flex justify-center">
                      {getStatusBadge(item.charge.status)}
                    </div>

                    {/* RVU */}
                    <span className="w-14 text-right text-sm text-gray-700">
                      {rvu.toFixed(2)}
                    </span>

                    {/* Payment */}
                    <span className="w-16 text-right text-sm text-green-600 font-medium">
                      ${payment.toFixed(0)}
                    </span>

                    {/* Actions */}
                    <div className="w-20 flex items-center justify-end gap-1">
                      {!isBilled && (
                        <>
                          <button
                            onClick={() => setEditingCharge({
                              charge: item.charge,
                              patientName: item.patient.patientName
                            })}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.charge.status === 'pending' && (
                            <button
                              onClick={() => handleMarkEntered(item)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                              title="Mark Entered"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleMarkBilled(item)}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                            title="Mark Billed"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Summary Footer */}
      {items.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {items.length} charge{items.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-700 font-medium">
              {items.reduce((sum, item) => sum + (item.charge.rvu || getRVU(item.charge.cptCode)), 0).toFixed(2)} RVU
              {' • '}
              <span className="text-green-600">
                ${items.reduce((sum, item) => sum + calculateMedicarePayment(item.charge.rvu || getRVU(item.charge.cptCode)), 0).toFixed(0)}
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
        onSaved={handleRefreshAfterAction}
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
          onCompleted={handleRefreshAfterAction}
        />
      )}
    </div>
  );
};

export default ChargeQueueTab;
