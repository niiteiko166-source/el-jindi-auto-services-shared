import React from 'react';
import { X, Printer } from 'lucide-react';
import { JobCard } from '../types';
import { db } from '../services/db';
import { BrandLogo } from './BrandLogo';

interface PrintableJobCardModalProps {
  job: JobCard;
  onClose: () => void;
}

export const PrintableJobCardModal: React.FC<PrintableJobCardModalProps> = ({ job, onClose }) => {
  const settings = db.getSettings();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-area fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none">
        {/* Control Bar */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <span className="text-xs font-bold font-mono">Workshop Job Card — {job.jobNumber}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print Job Sheet
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE WORKSHOP SHEET */}
        <div className="p-8 space-y-6 bg-white text-slate-900 text-xs font-sans print:p-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <BrandLogo compact className="w-75 max-w-full -ml-3" />
              <p className="text-xs font-bold text-blue-700">WORKSHOP JOB CARD & INSPECTION SHEET</p>
              <p className="text-[10px] text-slate-600">{settings.address} | Tel: {settings.phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-900 font-mono">{job.jobNumber}</h2>
              <p className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded inline-block mt-1 font-mono">
                REG: {job.registrationNumber}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Date Opened: {job.createdDate}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p><strong className="text-slate-500">Customer:</strong> <span className="font-bold text-slate-900">{job.customerName}</span></p>
              <p><strong className="text-slate-500">Phone:</strong> {job.customerPhone}</p>
            </div>
            <div>
              <p><strong className="text-slate-500">Vehicle:</strong> {job.vehicleDetails}</p>
              <p><strong className="text-slate-500">Lead Mechanic:</strong> <span className="font-bold text-blue-800">{job.technicianName || 'Yaw Boadu'}</span></p>
            </div>
          </div>

          {/* Customer Complaint */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <h3 className="font-bold text-amber-900 text-xs uppercase mb-1">Customer Reported Complaint:</h3>
            <p className="text-xs font-semibold text-slate-800">{job.complaint}</p>
          </div>

          {/* Inspection Checklist */}
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase mb-2 border-b border-slate-200 pb-1">Vehicle Inspection Checklist:</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {(job.inspectionChecklist || []).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="font-semibold text-slate-700">{item.name}</span>
                  <span className="font-bold font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border">{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis & Repairs */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase">Diagnosis & Technician Action Plan:</h3>
            <p className="text-xs text-slate-700">{job.diagnosis || 'Diagnosis in progress.'}</p>
            {job.recommendedRepairs && (
              <p className="text-xs text-blue-900 font-semibold bg-blue-50 p-2 rounded">
                Plan: {job.recommendedRepairs}
              </p>
            )}
          </div>

          {/* Services & Parts List */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-[11px] uppercase mb-1">Labour Services:</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                {job.services.map(s => (
                  <li key={s.id}>{s.serviceName} ({s.estimatedHours} hrs)</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-[11px] uppercase mb-1">Parts Issued:</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                {job.parts.map(p => (
                  <li key={p.id}>{p.partName} (Qty: {p.quantity})</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-[10px]">
            <div>
              <div className="border-b border-slate-900 pb-1 mb-1 font-bold">Technician Sign-Off</div>
              <span>Work completed & tested</span>
            </div>
            <div>
              <div className="border-b border-slate-900 pb-1 mb-1 font-bold">Workshop Manager Quality Check</div>
              <span>Approved for vehicle release</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
