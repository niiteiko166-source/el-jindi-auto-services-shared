import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  UserPlus,
  Car,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle,
  ShieldAlert,
  Search,
  DollarSign,
  Tag,
  Package,
  ClipboardCheck,
  Stethoscope,
  Info,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import {
  JobCard,
  Customer,
  Vehicle,
  ComplaintCategory,
  InspectionItem,
  InspectionStatus,
  JobService,
  JobPart,
  PriceListItem,
  InventoryPart,
  JobStatus
} from '../types';
import { db, calculateTotals } from '../services/db';
import { CustomerSearchModal } from './CustomerSearchModal';
import { PriceListSearchModal } from './PriceListSearchModal';

interface JobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobToEdit?: JobCard | null;
  onSaved: (job: JobCard) => void;
}

const DEFAULT_INSPECTION_ITEMS = [
  { category: 'Engine', name: 'Engine Oil & Filter Condition' },
  { category: 'Engine', name: 'Spark Plugs & Ignition Coils' },
  { category: 'Transmission', name: 'Transmission Fluid & Gear Shift' },
  { category: 'Brakes', name: 'Front & Rear Brake Pads & Rotors' },
  { category: 'Suspension', name: 'Shock Absorbers & Bushings' },
  { category: 'Electrical', name: 'Battery Health & Charging Voltage' },
  { category: 'Cooling System', name: 'Radiator, Hose & Coolant Level' },
  { category: 'AC', name: 'AC Cooling Temperature & Blower' },
  { category: 'Tyres', name: 'Tyre Tread Depth & Pressure' },
  { category: 'Lights', name: 'Headlamps, Indicators & Brake Lights' }
] as const;

const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'Engine',
  'Transmission',
  'Brakes',
  'Suspension',
  'Electrical',
  'Air Conditioning',
  'Tyres',
  'Body',
  'Service/Maintenance',
  'Other'
];

export const JobCardModal: React.FC<JobCardModalProps> = ({
  isOpen,
  onClose,
  jobToEdit,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'complaint' | 'inspection' | 'diagnosis' | 'services' | 'parts' | 'summary'>('customer');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  // Price list removed from quick-select to prevent seeded services being added automatically
  const [inventory, setInventory] = useState<InventoryPart[]>([]);

  // Modal States
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showPriceListSearch, setShowPriceListSearch] = useState(false);

  // Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // New Customer Inline Form
  const [showNewCustForm, setShowNewCustForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // New Vehicle Inline Form
  const [showNewVehForm, setShowNewVehForm] = useState(false);
  const [newVehReg, setNewVehReg] = useState('');
  const [newVehMake, setNewVehMake] = useState('Toyota');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState(2023);
  const [newVehMileage, setNewVehMileage] = useState(50000);
  const [newVehVin, setNewVehVin] = useState('');
  const [dvlaLookupLoading, setDvlaLookupLoading] = useState(false);
  const [dvlaLookupError, setDvlaLookupError] = useState<string | null>(null);

  // Job Details
  const [complaint, setComplaint] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ComplaintCategory[]>([]);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendedRepairs, setRecommendedRepairs] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [technicianName, setTechnicianName] = useState('Yaw Boadu');
  const [vehicleMileage, setVehicleMileage] = useState<number | undefined>(undefined);
  const [jobStatus, setJobStatus] = useState<JobStatus>('Received');

  // Services & Parts List
  const [services, setServices] = useState<JobService[]>([]);
  const [parts, setParts] = useState<JobPart[]>([]);
  // Manual part entry fields (inventory quick-add removed)
  const [manualPartName, setManualPartName] = useState('');
  const [manualPartNumber, setManualPartNumber] = useState('');
  const [manualPartQty, setManualPartQty] = useState(1);
  const [manualPartUnitPrice, setManualPartUnitPrice] = useState<number | ''>('');
  const [manualPartDiscount, setManualPartDiscount] = useState(0);

  // Financials
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');

  // Local Storage Auto-Save & Recovery States
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);

  const getDraftKey = (jobId?: string | null) => {
    return jobId ? `job_card_draft_${jobId}` : 'job_card_draft_new';
  };

  const clearDraft = (jobId?: string | null) => {
    const key = getDraftKey(jobId !== undefined ? jobId : jobToEdit?.id);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error clearing draft:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const custs = db.getCustomers();
      const vehs = db.getVehicles();
      const inv = db.getInventory();
      setCustomers(custs);
      setVehicles(vehs);
      setInventory(inv);

      const draftKey = getDraftKey(jobToEdit?.id);
      let draftParsed: any = null;
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          draftParsed = JSON.parse(savedDraft);
        }
      } catch (e) {
        console.error('Error reading draft from localStorage', e);
      }

      if (draftParsed && typeof draftParsed === 'object') {
        setSelectedCustomerId(draftParsed.selectedCustomerId || custs[0]?.id || '');
        setSelectedVehicleId(draftParsed.selectedVehicleId || vehs[0]?.id || '');
        setComplaint(draftParsed.complaint || '');
        setSelectedCategories(draftParsed.selectedCategories || []);
        setInspectionItems(draftParsed.inspectionItems || []);
        setDiagnosis(draftParsed.diagnosis || '');
        setRecommendedRepairs(draftParsed.recommendedRepairs || '');
        setTechnicianId(draftParsed.technicianId || '');
        setTechnicianName(draftParsed.technicianName || 'Yaw Boadu');
        setVehicleMileage(draftParsed.vehicleMileage);
        setJobStatus(draftParsed.jobStatus || 'Received');
        setServices(draftParsed.services || []);
        setParts(draftParsed.parts || []);
        setDiscount(draftParsed.discount || 0);
        setVatRate(draftParsed.vatRate !== undefined ? draftParsed.vatRate : (db.getSettings().defaultVatRate || 20));
        setAmountPaid(draftParsed.amountPaid || 0);
        setNotes(draftParsed.notes || '');
        if (draftParsed.activeTab) setActiveTab(draftParsed.activeTab);
        if (draftParsed.showNewCustForm !== undefined) setShowNewCustForm(draftParsed.showNewCustForm);
        if (draftParsed.newCustName !== undefined) setNewCustName(draftParsed.newCustName);
        if (draftParsed.newCustPhone !== undefined) setNewCustPhone(draftParsed.newCustPhone);
        if (draftParsed.newCustAddress !== undefined) setNewCustAddress(draftParsed.newCustAddress);
        if (draftParsed.showNewVehForm !== undefined) setShowNewVehForm(draftParsed.showNewVehForm);
        if (draftParsed.newVehReg !== undefined) setNewVehReg(draftParsed.newVehReg);
        if (draftParsed.newVehMake !== undefined) setNewVehMake(draftParsed.newVehMake);
        if (draftParsed.newVehModel !== undefined) setNewVehModel(draftParsed.newVehModel);
        if (draftParsed.newVehYear !== undefined) setNewVehYear(draftParsed.newVehYear);
        if (draftParsed.newVehMileage !== undefined) setNewVehMileage(draftParsed.newVehMileage);
        if (draftParsed.vehicleMileage !== undefined) setVehicleMileage(draftParsed.vehicleMileage);

        setHasRestoredDraft(true);
        setDraftTimestamp(draftParsed.savedAt || 'previous session');
      } else if (jobToEdit) {
        setHasRestoredDraft(false);
        setDraftTimestamp(null);
        setSelectedCustomerId(jobToEdit.customerId);
        setSelectedVehicleId(jobToEdit.vehicleId);
        setComplaint(jobToEdit.complaint);
        setSelectedCategories(jobToEdit.complaintCategories || []);
        setInspectionItems(jobToEdit.inspectionChecklist || []);
        setDiagnosis(jobToEdit.diagnosis || '');
        setRecommendedRepairs(jobToEdit.recommendedRepairs || '');
        setTechnicianId(jobToEdit.technicianId || '');
        setTechnicianName(jobToEdit.technicianName || 'Yaw Boadu');
        setVehicleMileage(jobToEdit.vehicleMileage);
        setJobStatus(jobToEdit.status);
        setServices(jobToEdit.services || []);
        setParts(jobToEdit.parts || []);
        setDiscount(jobToEdit.discount || 0);
        setVatRate(jobToEdit.vatRate !== undefined ? jobToEdit.vatRate : (db.getSettings().defaultVatRate || 20));
        setAmountPaid(jobToEdit.amountPaid || 0);
        setNotes(jobToEdit.notes || '');
      } else {
        const defaultRate = db.getSettings().defaultVatRate || 20;
        setHasRestoredDraft(false);
        setDraftTimestamp(null);
        setSelectedCustomerId(custs[0]?.id || '');
        setSelectedVehicleId(vehs[0]?.id || '');
        setComplaint('');
        setSelectedCategories(['Service/Maintenance']);
        setInspectionItems(
          DEFAULT_INSPECTION_ITEMS.map((item, idx) => ({
            id: `insp-${idx}`,
            category: item.category as any,
            name: item.name,
            status: 'Not Checked',
            notes: ''
          }))
        );
        setDiagnosis('');
        setRecommendedRepairs('');
        setTechnicianName('Yaw Boadu');
        setVehicleMileage(undefined);
        setJobStatus('Received');
        setServices([]);
        setParts([]);
        setDiscount(0);
        setVatRate(defaultRate);
        setAmountPaid(0);
        setNotes('');
      }

      setIsInitialized(true);
    } else {
      setIsInitialized(false);
      setHasRestoredDraft(false);
      setLastAutoSavedAt(null);
    }
  }, [isOpen, jobToEdit]);

  // Auto-Save Effect
  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    const draftKey = getDraftKey(jobToEdit?.id);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const draftData = {
      selectedCustomerId,
      selectedVehicleId,
      complaint,
      selectedCategories,
      inspectionItems,
      diagnosis,
      recommendedRepairs,
      technicianId,
      technicianName,
      vehicleMileage,
      jobStatus,
      services,
      parts,
      discount,
      vatRate,
      amountPaid,
      notes,
      activeTab,
      showNewCustForm,
      newCustName,
      newCustPhone,
      newCustAddress,
      showNewVehForm,
      newVehReg,
      newVehMake,
      newVehModel,
      newVehYear,
      newVehMileage,
      savedAt: nowTime
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastAutoSavedAt(nowTime);
    } catch (e) {
      console.error('Error saving draft:', e);
    }
  }, [isOpen, jobToEdit, selectedCustomerId, selectedVehicleId, complaint, selectedCategories, inspectionItems, diagnosis, recommendedRepairs, technicianId, technicianName, vehicleMileage, jobStatus, services, parts, discount, vatRate, amountPaid, notes, activeTab, showNewCustForm, newCustName, newCustPhone, newCustAddress, showNewVehForm, newVehReg, newVehMake, newVehModel, newVehYear, newVehMileage]);

  const handleDiscardDraft = () => {
    clearDraft();
    setHasRestoredDraft(false);
    setDraftTimestamp(null);

    const custs = db.getCustomers();
    const vehs = db.getVehicles();

    if (jobToEdit) {
      setSelectedCustomerId(jobToEdit.customerId);
      setSelectedVehicleId(jobToEdit.vehicleId);
      setComplaint(jobToEdit.complaint);
      setSelectedCategories(jobToEdit.complaintCategories || []);
      setInspectionItems(jobToEdit.inspectionChecklist || []);
      setDiagnosis(jobToEdit.diagnosis || '');
      setRecommendedRepairs(jobToEdit.recommendedRepairs || '');
      setTechnicianId(jobToEdit.technicianId || '');
      setTechnicianName(jobToEdit.technicianName || 'Yaw Boadu');
      setVehicleMileage(jobToEdit.vehicleMileage);
      setJobStatus(jobToEdit.status);
      setServices(jobToEdit.services || []);
      setParts(jobToEdit.parts || []);
      setDiscount(jobToEdit.discount || 0);
      setVatRate(jobToEdit.vatRate !== undefined ? jobToEdit.vatRate : (db.getSettings().defaultVatRate || 20));
      setAmountPaid(jobToEdit.amountPaid || 0);
      setNotes(jobToEdit.notes || '');
    } else {
      const defaultRate = db.getSettings().defaultVatRate || 20;
      setSelectedCustomerId(custs[0]?.id || '');
      setSelectedVehicleId(vehs[0]?.id || '');
      setComplaint('');
      setSelectedCategories(['Service/Maintenance']);
      setInspectionItems(
        DEFAULT_INSPECTION_ITEMS.map((item, idx) => ({
          id: `insp-${idx}`,
          category: item.category as any,
          name: item.name,
          status: 'Not Checked',
          notes: ''
        }))
      );
      setDiagnosis('');
      setRecommendedRepairs('');
      setTechnicianName('Yaw Boadu');
      setJobStatus('Received');
      setServices([]);
      setParts([]);
      setDiscount(0);
      setVatRate(defaultRate);
      setAmountPaid(0);
      setNotes('');
    }
  };

  if (!isOpen) return null;

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerVehicles = vehicles.filter(v => v.customerId === selectedCustomerId);
  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Past jobs for this vehicle
  const pastJobs = db.getJobCards().filter(j => j.vehicleId === selectedVehicleId && j.id !== jobToEdit?.id);

  // Add new customer inline
  const handleCreateCustomer = () => {
    if (!newCustName || !newCustPhone) return;
    const created = db.saveCustomer({
      name: newCustName,
      phone: newCustPhone,
      address: newCustAddress
    });
    setCustomers(db.getCustomers());
    setSelectedCustomerId(created.id);
    setShowNewCustForm(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  // Add new vehicle inline
  const handleCreateVehicle = () => {
    if (!newVehReg || !selectedCustomerId) return;
    const created = db.saveVehicle({
      customerId: selectedCustomerId,
      registrationNumber: newVehReg,
      make: newVehMake,
      model: newVehModel || 'Standard',
      year: newVehYear,
      mileage: newVehMileage,
      vin: newVehVin?.trim() || undefined
    });
    setVehicles(db.getVehicles());
    setSelectedVehicleId(created.id);
    setShowNewVehForm(false);
    setNewVehReg('');
    setNewVehModel('');
    setNewVehYear(new Date().getFullYear());
    setNewVehMileage(0);
    setNewVehVin('');
    setDvlaLookupError(null);
  };

  // Toggle Category
  const toggleCategory = (cat: ComplaintCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Update inspection status
  const updateInspectionStatus = (id: string, status: InspectionStatus) => {
    setInspectionItems(
      inspectionItems.map(item => (item.id === id ? { ...item, status } : item))
    );
  };

  // Add Service from Price List
  const handleAddService = (priceItem?: PriceListItem) => {
    const newService: JobService = {
      id: `srv-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      serviceName: priceItem ? priceItem.serviceOrPart : 'Custom Service / Maintenance',
      description: priceItem ? priceItem.description : '',
      technicianName,
      estimatedHours: priceItem?.estimatedHours || 1,
      labourRate: priceItem ? priceItem.price : 200,
      total: priceItem ? priceItem.price : 200
    };
    setServices([...services, newService]);
  };

  const updateService = (id: string, field: keyof JobService, value: any) => {
    setServices(
      services.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === 'estimatedHours' || field === 'labourRate') {
          updated.total = (updated.estimatedHours || 1) * (updated.labourRate || 0);
        }
        return updated;
      })
    );
  };

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  // Add Part from Inventory
  const handleAddPart = (partItem?: InventoryPart) => {
    if (!partItem) return;
    const existing = parts.find(p => p.partId === partItem.id);
    if (existing) {
      setParts(
        parts.map(p =>
          p.partId === partItem.id
            ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unitPrice - p.discount }
            : p
        )
      );
    } else {
      const newPart: JobPart = {
        id: `jpart-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        partId: partItem.id,
        partName: partItem.partName,
        partNumber: partItem.partNumber,
        quantity: 1,
        unitPrice: partItem.sellingPrice,
        discount: 0,
        total: partItem.sellingPrice,
        issued: false,
        stockAvailable: partItem.quantity
      };
      setParts([...parts, newPart]);
    }
  };

  // Manual add part (used by manual form)
  const handleAddPartManual = () => {
    if (!manualPartName || !manualPartUnitPrice) return;
    const newPart: JobPart = {
      id: `jpart-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      partId: `manual-${Date.now()}`,
      partName: manualPartName,
      partNumber: manualPartNumber || 'N/A',
      quantity: Math.max(1, manualPartQty),
      unitPrice: Number(manualPartUnitPrice),
      discount: manualPartDiscount || 0,
      total: Math.max(0, Math.max(1, manualPartQty) * Number(manualPartUnitPrice) - (manualPartDiscount || 0)),
      issued: false,
      stockAvailable: undefined
    };
    setParts([...parts, newPart]);
    setManualPartName('');
    setManualPartNumber('');
    setManualPartQty(1);
    setManualPartUnitPrice('');
    setManualPartDiscount(0);
  };

  const updatePart = (id: string, field: keyof JobPart, value: any) => {
    setParts(
      parts.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
          updated.total = Math.max(0, updated.quantity * updated.unitPrice - (updated.discount || 0));
        }
        return updated;
      })
    );
  };

  const removePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
  };

  // Totals
  const labourTotal = services.reduce((sum, s) => sum + s.total, 0);
  const partsTotal = parts.reduce((sum, p) => sum + p.total, 0);
  const calc = calculateTotals(labourTotal, partsTotal, discount, vatRate, true, amountPaid);

  // Save Job
  const handleSave = () => {
    if (!selectedCustomerId || !selectedVehicleId) {
      setActiveTab('customer');
      alert('Please select or create a Customer and Vehicle before saving.');
      return;
    }

    const hasEstimate = diagnosis.trim() || recommendedRepairs.trim() || services.length > 0 || parts.length > 0;
    const wantApproval = jobStatus === 'Waiting for Approval' || (jobStatus === 'Received' && hasEstimate);
    const saveStatus: JobStatus = wantApproval ? 'Waiting for Approval' : jobStatus;

    const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const selectedMileage = vehicleMileage !== undefined ? vehicleMileage : currentVehicle?.mileage;
    if (currentVehicle && selectedMileage !== undefined && selectedMileage < currentVehicle.mileage) {
      setActiveTab('customer');
      alert(`Job mileage ${selectedMileage} km cannot be lower than current vehicle mileage ${currentVehicle.mileage} km.`);
      return;
    }

    let saved: any = null;
    try {
      saved = db.saveJobCard({
      id: jobToEdit?.id,
      customerId: selectedCustomerId,
      vehicleId: selectedVehicleId,
      complaint: complaint || 'General inspection and service',
      complaintCategories: selectedCategories,
      inspectionChecklist: inspectionItems,
      diagnosis,
      recommendedRepairs,
      technicianName,
      vehicleMileage: selectedMileage,
      services,
      parts,
      status: saveStatus,
      discount,
      vatRate,
      amountPaid,
      notes
      });
      console.info('Job saved:', saved);
      try { alert('Job saved successfully.'); } catch (e) { /* noop */ }
    } catch (err) {
      console.error('Error saving job:', err);
      try { alert('Error saving job: ' + (err instanceof Error ? err.message : String(err))); } catch (e) {}
      return;
    }

    if (wantApproval) {
      const quoteNotes = [
        diagnosis ? `Diagnostics:
${diagnosis}` : '',
        recommendedRepairs ? `Recommended Repairs:
${recommendedRepairs}` : ''
      ]
        .filter(Boolean)
        .join('\n\n');

      const existingQuote = db.getQuotations().find((q) => q.jobId === saved.id);
      const quotePayload = {
        id: existingQuote?.id,
        customerId: selectedCustomerId,
        vehicleId: selectedVehicleId,
        jobId: saved.id,
        services,
        parts,
        discount,
        vatRate,
        status: 'Sent' as const,
        notes: quoteNotes || 'Quotation created from job diagnostics and scope of work.'
      };

      const quote = existingQuote ? db.saveQuotation(quotePayload) : db.saveQuotation(quotePayload);
      db.saveJobCard({ ...saved, quotationId: quote.id, status: 'Waiting for Approval' });
      alert('Quotation created and sent to customer. Awaiting customer approval.');
    }

    clearDraft();
    setHasRestoredDraft(false);
    setIsInitialized(false);
    onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold tracking-tight">
                  {jobToEdit ? `Edit Job Card — ${jobToEdit.jobNumber}` : 'New Workshop Job Card'}
                </h2>
                {lastAutoSavedAt && (
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-800/60 flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Auto-saved {lastAutoSavedAt}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                El-Jindi Auto Services — Service Intake & Workshop Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Draft Recovered Banner */}
        {hasRestoredDraft && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Unsaved Draft Recovered:</strong> Restored progress from {draftTimestamp || 'a previous session'}.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Discard Draft
            </button>
          </div>
        )}

        {/* Workflow Tabs Bar */}
        <div className="px-6 pt-3 bg-slate-100/80 border-b border-slate-200 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'customer', label: '1. Customer & Vehicle', icon: UserPlus },
            { id: 'complaint', label: '2. Complaint', icon: AlertCircle },
            { id: 'inspection', label: '3. Inspection', icon: ClipboardCheck },
            { id: 'diagnosis', label: '4. Diagnosis', icon: Stethoscope },
            { id: 'services', label: '5. Services/Labour', icon: Tag },
            { id: 'parts', label: '6. Spare Parts', icon: Package },
            { id: 'summary', label: '7. Summary & Totals', icon: DollarSign },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-blue-600 border-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CUSTOMER & VEHICLE */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Section */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                      Customer Details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewCustForm(!showNewCustForm)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {showNewCustForm ? 'Select Existing' : '+ Add New Customer'}
                    </button>
                  </div>

                  {!showNewCustForm ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCustomerSearch(true)}
                          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                          <Search className="w-4 h-4" />
                          Search & Select Customer
                        </button>
                      </div>

                      {currentCustomer && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-blue-900">{currentCustomer.name}</p>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId('')}
                              className="text-blue-600 hover:text-blue-700 font-bold"
                            >
                              ✕ Change
                            </button>
                          </div>
                          {currentCustomer.company && <p className="text-blue-700">{currentCustomer.company}</p>}
                          <p className="flex items-center gap-1 text-blue-700"><Phone className="w-3.5 h-3.5" /> {currentCustomer.phone}</p>
                          {currentCustomer.email && <p className="flex items-center gap-1 text-blue-700"><Mail className="w-3.5 h-3.5" /> {currentCustomer.email}</p>}
                          {currentCustomer.address && <p className="flex items-center gap-1 text-blue-700"><MapPin className="w-3.5 h-3.5" /> {currentCustomer.address}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Customer / Company Name *"
                        value={newCustName}
                        onChange={e => setNewCustName(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number (+233...) *"
                        value={newCustPhone}
                        onChange={e => setNewCustPhone(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Address / Location"
                        value={newCustAddress}
                        onChange={e => setNewCustAddress(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                      >
                        Save & Select Customer
                      </button>
                    </div>
                  )}
                </div>

                {/* Vehicle Section */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Car className="w-4 h-4 text-indigo-600" />
                      Vehicle Information
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewVehForm(!showNewVehForm)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      {showNewVehForm ? 'Select Existing' : '+ Register New Vehicle'}
                    </button>
                  </div>

                  {!showNewVehForm ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Select Vehicle</label>
                      <select
                        value={selectedVehicleId}
                        onChange={e => setSelectedVehicleId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                      >
                        {customerVehicles.length === 0 ? (
                          <option value="">No vehicle for this customer yet</option>
                        ) : (
                          customerVehicles.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.registrationNumber} — {v.make} {v.model} ({v.year})
                            </option>
                          ))
                        )}
                      </select>

                      {currentVehicle && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                          <p><span className="font-semibold text-slate-500">Registration:</span> <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-mono">{currentVehicle.registrationNumber}</span></p>
                          <p><span className="font-semibold text-slate-500">Make/Model:</span> {currentVehicle.make} {currentVehicle.model} ({currentVehicle.year})</p>
                          <p><span className="font-semibold text-slate-500">VIN:</span> {currentVehicle.vin || 'N/A'}</p>
                          <p><span className="font-semibold text-slate-500">Mileage:</span> {currentVehicle.mileage.toLocaleString()} km</p>
                          <div className="mt-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Job Odometer Reading (km)</label>
                            <input
                              type="number"
                              min={0}
                              value={vehicleMileage !== undefined ? vehicleMileage : currentVehicle.mileage}
                              onChange={e => setVehicleMileage(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                            />
                            <p className="text-[10px] text-slate-400 mt-2">If this reading is higher than the current vehicle record, it will update the vehicle mileage on save.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Registration Number (e.g. GR 1234-24) *"
                        value={newVehReg}
                        onChange={e => setNewVehReg(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold uppercase font-mono"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newVehMake}
                          onChange={e => setNewVehMake(e.target.value)}
                          className="px-2 py-1.5 border rounded-lg text-xs font-semibold"
                        >
                          {['Toyota', 'Honda', 'Mercedes-Benz', 'Nissan', 'Hyundai', 'Kia', 'Ford', 'BMW', 'Volkswagen'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Model (e.g. Hilux)"
                          value={newVehModel}
                          onChange={e => setNewVehModel(e.target.value)}
                          className="px-2 py-1.5 border rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Year (e.g. 2022)"
                          value={newVehYear}
                          onChange={e => setNewVehYear(Number(e.target.value))}
                          className="px-2 py-1.5 border rounded-lg text-xs font-medium"
                        />
                        <input
                          type="number"
                          placeholder="Mileage (km)"
                          value={newVehMileage}
                          onChange={e => setNewVehMileage(Number(e.target.value))}
                          className="px-2 py-1.5 border rounded-lg text-xs font-medium"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="VIN / VN (manual entry or lookup)"
                        value={newVehVin}
                        onChange={e => setNewVehVin(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!newVehReg || dvlaLookupLoading}
                          onClick={async () => {
                            if (!newVehReg) return;
                            setDvlaLookupError(null);
                            setDvlaLookupLoading(true);
                            try {
                              const res = await fetch(`/api/dvla/vehicle?registration=${encodeURIComponent(newVehReg)}`);
                              const result = await res.json();
                              if (!res.ok) {
                                setDvlaLookupError(result.error || 'DVLA lookup failed');
                              } else if (result.data && result.data.vin) {
                                setNewVehVin(result.data.vin);
                              } else {
                                setDvlaLookupError('DVLA response did not include a VIN');
                              }
                            } catch (err) {
                              setDvlaLookupError(err instanceof Error ? err.message : String(err));
                            } finally {
                              setDvlaLookupLoading(false);
                            }
                          }}
                          className="flex-1 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {dvlaLookupLoading ? 'Looking up...' : 'Lookup VIN from DVLA'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewVehVin('')}
                          className="py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                        >
                          Clear
                        </button>
                      </div>
                      {dvlaLookupError && (
                        <p className="text-rose-600 text-[11px]">{dvlaLookupError}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleCreateVehicle}
                        className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                      >
                        Register & Select Vehicle
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Historical Vehicle Intelligence Banner */}
              {currentVehicle && (
                <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    Vehicle Service History & Record
                  </h4>
                  <p className="text-slate-700">
                    Total Previous Visits: <span className="font-bold">{pastJobs.length}</span> | Last Mileage Logged: <span className="font-bold">{currentVehicle.mileage.toLocaleString()} km</span>
                  </p>
                  {pastJobs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {pastJobs.slice(0, 2).map(pj => (
                        <div key={pj.id} className="text-[11px] text-slate-600 flex items-center justify-between bg-white px-2.5 py-1 rounded border border-blue-100">
                          <span><strong className="font-mono text-blue-700">{pj.jobNumber}</strong> — {pj.complaint.substring(0, 60)}...</span>
                          <span className="font-semibold text-slate-500">{pj.createdDate.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPLAINT */}
          {activeTab === 'complaint' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Customer Complaint / Service Request *
                </label>
                <textarea
                  rows={4}
                  value={complaint}
                  onChange={e => setComplaint(e.target.value)}
                  placeholder="Describe vehicle issues as reported by customer (e.g. Engine knocking at 2,000 RPM, AC blowing warm air, brake squeal)..."
                  className="w-full p-3.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Complaint Categories (Multi-select)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {COMPLAINT_CATEGORIES.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INSPECTION CHECKLIST */}
          {activeTab === 'inspection' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Workshop Vehicle Inspection Checklist</h3>
                  <p className="text-xs text-slate-500">Record quick visual check before beginning service</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {inspectionItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase font-mono">{item.category}</span>
                        <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {(['OK', 'Needs Attention', 'Critical', 'Not Checked'] as InspectionStatus[]).map(st => {
                        const isSel = item.status === st;
                        let colorClass = 'bg-slate-200 text-slate-700';
                        if (st === 'OK') colorClass = isSel ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-100 text-emerald-800';
                        if (st === 'Needs Attention') colorClass = isSel ? 'bg-amber-500 text-white' : 'hover:bg-amber-100 text-amber-800';
                        if (st === 'Critical') colorClass = isSel ? 'bg-rose-600 text-white' : 'hover:bg-rose-100 text-rose-800';
                        if (st === 'Not Checked') colorClass = isSel ? 'bg-slate-600 text-white' : 'hover:bg-slate-200 text-slate-600';

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateInspectionStatus(item.id, st)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${colorClass}`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNOSIS */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Master Technician</label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={e => setTechnicianName(e.target.value)}
                    placeholder="Enter technician name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Status</label>
                  <select
                    value={jobStatus}
                    onChange={e => setJobStatus(e.target.value as JobStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-blue-700"
                  >
                    <option value="Received">Received</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Waiting for Approval">Waiting for Approval</option>
                    <option value="Waiting for Parts">Waiting for Parts</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Quality Check">Quality Check</option>
                    <option value="Completed">Completed</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Technician Diagnostic Findings</label>
                <textarea
                  rows={3}
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="Enter diagnostic report, error scan codes, physical measurements..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recommended Repairs & Action Plan</label>
                <textarea
                  rows={3}
                  value={recommendedRepairs}
                  onChange={e => setRecommendedRepairs(e.target.value)}
                  placeholder="Detail recommended component replacements, flushing, or adjustments..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          )}

          {/* TAB 5: SERVICES / LABOUR */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Labour & Service Charges</h3>
                  <p className="text-xs text-slate-500">Select from Price List or add custom labour charges</p>
                </div>
              </div>

              {/* Quick Add Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPriceListSearch(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search Price List
                </button>
                <button
                  type="button"
                  onClick={() => handleAddService()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Custom Labour Entry
                </button>
              </div>

              {/* Services Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Service Name</th>
                      <th className="p-3">Hours</th>
                      <th className="p-3">Rate (GH₵)</th>
                      <th className="p-3">Total (GH₵)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          No labour services added yet. Click "+ Add Labour Item" or choose from Price List above.
                        </td>
                      </tr>
                    ) : (
                      services.map(srv => (
                        <tr key={srv.id} className="hover:bg-slate-50">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={srv.serviceName}
                              onChange={e => updateService(srv.id, 'serviceName', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-xs font-bold"
                            />
                          </td>
                          <td className="p-2.5 w-20">
                            <input
                              type="number"
                              min={0.5}
                              step={0.5}
                              value={srv.estimatedHours}
                              onChange={e => updateService(srv.id, 'estimatedHours', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-xs font-semibold text-center"
                            />
                          </td>
                          <td className="p-2.5 w-28">
                            <input
                              type="number"
                              value={srv.labourRate}
                              onChange={e => updateService(srv.id, 'labourRate', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-xs font-semibold text-right"
                            />
                          </td>
                          <td className="p-2.5 w-32 font-bold text-slate-900 text-right">
                            GH₵ {srv.total.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center w-12">
                            <button
                              type="button"
                              onClick={() => removeService(srv.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SPARE PARTS */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Spare Parts & Consumables</h3>
                  <p className="text-xs text-slate-500">Pick genuine parts directly from Workshop Inventory</p>
                </div>
              </div>

              {/* Inventory quick-select removed; manual part entry only */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Add Spare Part Manually
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Part Name *"
                    value={manualPartName}
                    onChange={e => setManualPartName(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-xs col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Part #"
                    value={manualPartNumber}
                    onChange={e => setManualPartNumber(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={manualPartQty}
                    onChange={e => setManualPartQty(Number(e.target.value))}
                    className="px-3 py-2 border rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price *"
                    value={manualPartUnitPrice as any}
                    onChange={e => setManualPartUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-3 py-2 border rounded-lg text-xs col-span-2"
                  />
                  <input
                    type="number"
                    placeholder="Discount"
                    value={manualPartDiscount}
                    onChange={e => setManualPartDiscount(Number(e.target.value))}
                    className="px-3 py-2 border rounded-lg text-xs"
                  />
                  <div className="col-span-4 sm:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddPartManual}
                      className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                    >
                      Add Part
                    </button>
                  </div>
                </div>
              </div>

              {/* Parts Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Part Name</th>
                      <th className="p-3">Part #</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3 w-16">Qty</th>
                      <th className="p-3 w-24">Unit Price</th>
                      <th className="p-3 w-24">Discount</th>
                      <th className="p-3 text-right">Total (GH₵)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          No spare parts added to this job card yet. Select from dropdown above.
                        </td>
                      </tr>
                    ) : (
                      parts.map(pt => (
                        <tr key={pt.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">{pt.partName}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-500">{pt.partNumber}</td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                (pt.stockAvailable || 0) > 5
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {pt.stockAvailable || 0}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              min={1}
                              value={pt.quantity}
                              onChange={e => updatePart(pt.id, 'quantity', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-xs font-bold text-center"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={pt.unitPrice}
                              onChange={e => updatePart(pt.id, 'unitPrice', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-xs font-bold text-right"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={pt.discount}
                              onChange={e => updatePart(pt.id, 'discount', Number(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-xs font-semibold text-right"
                            />
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 text-right">
                            GH₵ {pt.total.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removePart(pt.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: SUMMARY & TOTALS */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Job Cost Breakdown</h3>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Labour Services ({services.length} items):</span>
                      <span className="font-bold text-slate-900">GH₵ {labourTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Spare Parts ({parts.length} items):</span>
                      <span className="font-bold text-slate-900">GH₵ {partsTotal.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                      <span>Subtotal:</span>
                      <span>GH₵ {(labourTotal + partsTotal).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Discount Amount (GH₵)</label>
                      <input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={e => setDiscount(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">VAT/NHIL/GETFund Rate (%)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={vatRate}
                        onChange={e => setVatRate(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Advance Payment / Deposit Paid (GH₵)</label>
                      <input
                        type="number"
                        min={0}
                        value={amountPaid}
                        onChange={e => setAmountPaid(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Grand Totals Card */}
                <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col justify-between shadow-xl space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                      Final Financial Total
                    </span>
                    <h3 className="text-3xl font-extrabold text-white font-mono">
                      GH₵ {calc.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Subtotal: GH₵ {calc.subtotal.toFixed(2)}
                    </p>
                    {vatRate === 20 ? (
                      <div className="mt-2 text-[11px] text-slate-400 space-y-0.5 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                        <div className="flex justify-between">
                          <span>NHIL (2.5%):</span>
                          <span className="font-mono">GH₵ {(calc.subtotal * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GETFund (2.5%):</span>
                          <span className="font-mono">GH₵ {(calc.subtotal * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>VAT (15.0%):</span>
                          <span className="font-mono">GH₵ {(calc.subtotal * 0.15).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-200 border-t border-slate-700 pt-1 mt-1">
                          <span>Total Tax (20.0%):</span>
                          <span className="font-mono text-blue-400">GH₵ {calc.taxAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">
                        Includes Tax ({vatRate}%): GH₵ {calc.taxAmount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-800 text-xs">
                    <div className="flex justify-between text-emerald-400">
                      <span>Amount Received / Deposit:</span>
                      <span className="font-bold">GH₵ {calc.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-bold text-sm">
                      <span>Balance Due on Delivery:</span>
                      <span>GH₵ {calc.balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-300 text-xs">
                    <span className="font-bold text-blue-300">Payment Status: </span>
                    <span className="font-semibold">{calc.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{jobToEdit ? 'Save Changes' : 'Open Workshop Job Card'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Search Modal */}
      <CustomerSearchModal
        isOpen={showCustomerSearch}
        onClose={() => setShowCustomerSearch(false)}
        customers={customers}
        onSelectCustomer={(customer) => {
          setSelectedCustomerId(customer.id);
          const matchingVeh = vehicles.find(v => v.customerId === customer.id);
          if (matchingVeh) setSelectedVehicleId(matchingVeh.id);
        }}
        onAddNewCustomer={() => {
          setShowCustomerSearch(false);
          setShowNewCustForm(true);
        }}
      />

      {/* Price List Search Modal */}
      <PriceListSearchModal
        isOpen={showPriceListSearch}
        onClose={() => setShowPriceListSearch(false)}
        onSelectItem={(priceItem) => {
          handleAddService(priceItem);
          setShowPriceListSearch(false);
        }}
        excludeIds={[]} // Could filter out already added services if needed
      />
    </div>
  );
};
