import React, { useState } from 'react';
import { PackageCheck, CheckCircle, Clock, Check, X, Plus } from 'lucide-react';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

export const RequisitionsView: React.FC = () => {
  const requisitions = db.getRequisitions();
  const [reqPage, setReqPage] = useState(1);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    customerName: '',
    partName: '',
    partNumber: '',
    quantity: '1',
    amount: '0',
    reason: '',
    notes: ''
  });
  const reqPageSize = DEFAULT_PAGE_SIZE;
  const totalReq = requisitions.length;
  const pagedReqs = requisitions.slice((reqPage - 1) * reqPageSize, reqPage * reqPageSize);

  const handleIssueItem = (reqId: string, itemId: string) => {
    db.issueRequisitionItem(reqId, itemId);
    alert('Spare part issued from Store and deducted from Inventory stock!');
  };

  const handleCreateManualRequisition = () => {
    const customerName = manualForm.customerName.trim();
    const partName = manualForm.partName.trim();
    const quantity = Number(manualForm.quantity) || 0;
    const amount = Number(manualForm.amount) || 0;

    if (!customerName || !partName || quantity <= 0) {
      alert('Please enter the customer name, part name, and quantity before saving a manual requisition.');
      return;
    }

    const item = {
      id: `req-item-${Date.now()}`,
      partId: `manual-part-${Date.now()}`,
      partName,
      partNumber: manualForm.partNumber.trim() || 'MANUAL',
      quantityRequested: quantity,
      quantityIssued: 0,
      unitPrice: amount > 0 && quantity > 0 ? amount / quantity : 0,
      totalPrice: amount > 0 ? amount : 0,
      reason: manualForm.reason.trim() || 'Manual requisition',
      status: 'Pending' as const,
    };

    db.saveRequisition({
      jobId: undefined,
      jobNumber: 'MANUAL',
      customerName,
      vehicleRegistration: 'N/A',
      requestedBy: `${db.getCurrentUser()?.name || 'User'} (${db.getCurrentUser()?.role || 'Staff'})`,
      status: 'Submitted',
      items: [item],
      notes: manualForm.notes.trim() || 'Manual requisition request for parts without a linked job card.'
    });

    setManualForm({
      customerName: '',
      partName: '',
      partNumber: '',
      quantity: '1',
      amount: '0',
      reason: '',
      notes: ''
    });
    setShowManualForm(false);
    alert('Manual requisition created successfully.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Store Requisitions & Parts Issue</h1>
            <p className="text-xs text-slate-500">
              Technician spare parts requests, storekeeper issue verification, and stock deduction
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          {showManualForm ? 'Close' : 'Add Manual Requisition'}
        </button>
      </div>

      {showManualForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Customer Name</label>
              <input
                value={manualForm.customerName}
                onChange={e => setManualForm({ ...manualForm, customerName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                placeholder="Customer or supplier name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Part Name</label>
              <input
                value={manualForm.partName}
                onChange={e => setManualForm({ ...manualForm, partName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                placeholder="e.g. Oil Filter"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Part Number</label>
              <input
                value={manualForm.partNumber}
                onChange={e => setManualForm({ ...manualForm, partNumber: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={manualForm.quantity}
                onChange={e => setManualForm({ ...manualForm, quantity: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Amount (GH₵)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualForm.amount}
                onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Reason</label>
              <input
                value={manualForm.reason}
                onChange={e => setManualForm({ ...manualForm, reason: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                placeholder="Why is this being requisitioned?"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Notes</label>
            <textarea
              value={manualForm.notes}
              onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 min-h-20"
              placeholder="Optional extra notes"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreateManualRequisition}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
            >
              Save Manual Requisition
            </button>
          </div>
        </div>
      )}

      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {totalReq === 0 ? (
          <p className="p-8 text-center text-slate-400">No store requisitions raised yet.</p>
        ) : (
          pagedReqs.map(req => {
            const job = db.getJobById(req.jobId);
            return (
              <div key={req.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="font-mono font-bold text-emerald-700 text-xs">{req.requisitionNumber}</span>
                    <h3 className="text-xs font-bold text-slate-800 mt-0.5">
                      Job Card: <span className="font-mono">{job?.jobNumber || req.jobId}</span> ({job?.registrationNumber})
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      req.status === 'Issued'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'Submitted'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                      <tr>
                        <th className="p-3">Part Name</th>
                        <th className="p-3">Part #</th>
                        <th className="p-3 text-center">Requested Qty</th>
                        <th className="p-3 text-center">Issued Qty</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Storekeeper Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {req.items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{item.partName}</td>
                          <td className="p-3 font-mono text-slate-500">{item.partNumber}</td>
                          <td className="p-3 text-center font-bold">{item.quantityRequested}</td>
                          <td className="p-3 text-center font-mono text-emerald-700 font-bold">{item.quantityIssued}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'Issued' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {item.status !== 'Issued' ? (
                              <button
                                onClick={() => handleIssueItem(req.id, item.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm"
                              >
                                Issue Part from Store
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Issued
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-3">
        <Pagination totalItems={totalReq} pageSize={reqPageSize} currentPage={reqPage} onPageChange={p => setReqPage(p)} />
      </div>
    </div>
  );
};
