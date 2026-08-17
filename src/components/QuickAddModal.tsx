import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Car, Calendar, FileText, CreditCard, TrendingDown, PackagePlus, Trash2 } from 'lucide-react';
import { Customer, Vehicle, PriceListItem } from '../types';
import { db } from '../services/db';

interface QuickAddModalProps {
  type: string; // 'customer' | 'vehicle' | 'booking' | 'payment' | 'expense' | 'part' | 'price-list'
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  vehicleToEdit?: Vehicle | null;
  customerToEdit?: Customer | null;
  priceListItemToEdit?: PriceListItem | null;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  type,
  isOpen,
  onClose,
  onRefresh,
  vehicleToEdit,
  customerToEdit,
  priceListItemToEdit
}) => {
  const customers = useMemo(() => db.getCustomers(), []);
  const vehicles = useMemo(() => db.getVehicles(), []);
  const invoices = useMemo(() => db.getInvoices(), []);

  // Customer Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // Vehicle Form
  const [vehCustId, setVehCustId] = useState(customers[0]?.id || '');
  const [vehReg, setVehReg] = useState('');
  const [vehMake, setVehMake] = useState('Toyota');
  const [vehModel, setVehModel] = useState('');
  const [vehYear, setVehYear] = useState(2023);
  const [vehMileage, setVehMileage] = useState(45000);
  const [vehVin, setVehVin] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (type === 'customer' && customerToEdit) {
      setCustName(customerToEdit.name);
      setCustPhone(customerToEdit.phone);
      setCustAddress(customerToEdit.address || '');
    } else if (type === 'customer') {
      setCustName('');
      setCustPhone('');
      setCustAddress('');
    }

    if (type === 'vehicle' && vehicleToEdit) {
      setVehCustId(vehicleToEdit.customerId);
      setVehReg(vehicleToEdit.registrationNumber);
      setVehMake(vehicleToEdit.make || 'Toyota');
      setVehModel(vehicleToEdit.model || '');
      setVehYear(vehicleToEdit.year || new Date().getFullYear());
      setVehMileage(vehicleToEdit.mileage || 0);
      setVehVin(vehicleToEdit.vin || '');
    } else if (type === 'vehicle') {
      setVehCustId(customers[0]?.id || '');
      setVehReg('');
      setVehMake('Toyota');
      setVehModel('');
      setVehYear(new Date().getFullYear());
      setVehMileage(45000);
      setVehVin('');
    }

    if (type === 'price-list' && priceListItemToEdit) {
      setPlMake(priceListItemToEdit.make || 'Toyota');
      setPlModel(priceListItemToEdit.model || 'All Models');
      setPlCategory(priceListItemToEdit.category || 'General Service');
      setPlService(priceListItemToEdit.serviceOrPart);
      setPlDescription(priceListItemToEdit.description || '');
      setPlHours(priceListItemToEdit.estimatedHours || 1.5);
      setPlPrice(priceListItemToEdit.price);
    } else if (type === 'price-list') {
      setPlMake('Toyota');
      setPlModel('All Models');
      setPlCategory('General Service');
      setPlService('');
      setPlDescription('');
      setPlHours(1.5);
      setPlPrice(350);
    }
  }, [isOpen, type, vehicleToEdit, customerToEdit, priceListItemToEdit, customers]);

  // Booking Form
  const [bkCustId, setBkCustId] = useState(customers[0]?.id || '');
  const [bkVehId, setBkVehId] = useState(vehicles[0]?.id || '');
  const [bkDate, setBkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bkTime, setBkTime] = useState('09:00');
  const [bkService, setBkService] = useState('Full Service & Inspection');

  // Payment Form
  const [payInvId, setPayInvId] = useState(invoices[0]?.id || '');
  const [payAmount, setPayAmount] = useState(500);
  const [payMethod, setPayMethod] = useState<'Mobile Money' | 'Cash' | 'Bank Transfer' | 'Card'>('Mobile Money');
  const [payRef, setPayRef] = useState('');

  // Expense Form
  const [expCat, setExpCat] = useState<'Parts' | 'Fuel' | 'Utilities' | 'Maintenance' | 'Transport' | 'Salaries' | 'Petty Cash'>('Petty Cash');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState(150);

  // Part Form
  const [partName, setPartName] = useState('');
  const [partNum, setPartNum] = useState('');
  const [partQty, setPartQty] = useState(10);
  const [partPrice, setPartPrice] = useState(200);

  // Price List Form
  const [plMake, setPlMake] = useState('Toyota');
  const [plModel, setPlModel] = useState('All Models');
  const [plCategory, setPlCategory] = useState('General Service');
  const [plService, setPlService] = useState('');
  const [plDescription, setPlDescription] = useState('');
  const [plHours, setPlHours] = useState(1.5);
  const [plPrice, setPlPrice] = useState(350);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'customer') {
      if (!custName || !custPhone) return;
      db.saveCustomer({
        id: customerToEdit?.id,
        name: custName,
        phone: custPhone,
        address: custAddress
      });
    } else if (type === 'vehicle') {
      if (!vehReg || !vehCustId) return;
      db.saveVehicle({
        id: vehicleToEdit?.id,
        customerId: vehCustId,
        registrationNumber: vehReg,
        make: vehMake,
        model: vehModel || 'Standard',
        year: vehYear,
        mileage: vehMileage,
        vin: vehVin?.trim() || undefined
      });
    } else if (type === 'booking') {
      if (!bkCustId || !bkVehId) return;
      db.saveBooking({
        customerId: bkCustId,
        vehicleId: bkVehId,
        date: bkDate,
        time: bkTime,
        serviceRequested: bkService
      });
    } else if (type === 'payment') {
      const inv = invoices.find(i => i.id === payInvId);
      if (!inv) return;
      db.recordPayment({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customerName || 'Customer',
        amount: payAmount,
        paymentMethod: payMethod,
        reference: payRef
      });
    } else if (type === 'expense') {
      if (!expDesc) return;
      db.saveExpense({
        date: new Date().toISOString().split('T')[0],
        category: expCat,
        description: expDesc,
        amount: expAmount,
        paymentMethod: 'Cash'
      });
    } else if (type === 'part') {
      if (!partName) return;
      db.saveInventoryPart({
        partName,
        partNumber: partNum || `PN-${Math.floor(Math.random()*10000)}`,
        category: 'General Spares',
        quantity: partQty,
        minStock: 5,
        sellingPrice: partPrice
      });
    } else if (type === 'price-list') {
      if (!plService) return;
      db.savePriceListItem({
        id: priceListItemToEdit?.id,
        make: plMake,
        model: plModel || 'All Models',
        category: plCategory || 'General Service',
        serviceOrPart: plService,
        description: plDescription,
        price: plPrice,
        estimatedHours: plHours
      });
    }

    onRefresh();
    onClose();
  };

  const handleDeleteVehicle = () => {
    if (!vehicleToEdit?.id) return;
    const confirmed = window.confirm('Delete this vehicle permanently? This cannot be undone.');
    if (!confirmed) return;
    db.deleteVehicle(vehicleToEdit.id);
    onRefresh();
    onClose();
  };

  const handleDeleteCustomer = () => {
    if (!customerToEdit?.id) return;
    const confirmed = window.confirm('Delete this customer permanently? This cannot be undone.');
    if (!confirmed) return;
    db.deleteCustomer(customerToEdit.id);
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="text-sm font-bold capitalize">
            {type === 'vehicle' && vehicleToEdit
              ? 'Edit Vehicle'
              : type === 'customer' && customerToEdit
              ? 'Edit Customer'
              : type === 'price-list' && priceListItemToEdit
              ? `Edit Price Item`
              : `Quick Add — ${type}`}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-medium">
          {type === 'customer' && (
            <>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                  placeholder="e.g. Kwesi Mensah"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Phone Number (+233) *</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                  placeholder="+233 24 123 4567"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Address / Location</label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  placeholder="Spintex Road, Accra"
                />
              </div>
            </>
          )}

          {type === 'vehicle' && (
            <>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Select Owner Customer *</label>
                <select
                  value={vehCustId}
                  onChange={e => setVehCustId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  value={vehReg}
                  onChange={e => setVehReg(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold font-mono uppercase"
                  placeholder="e.g. GR 1234-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Make</label>
                  <select
                    value={vehMake}
                    onChange={e => setVehMake(e.target.value)}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-semibold"
                  >
                    {['Toyota', 'Honda', 'Mercedes-Benz', 'Nissan', 'Hyundai', 'Kia', 'Ford', 'BMW', 'Volkswagen'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Model</label>
                  <input
                    type="text"
                    value={vehModel}
                    onChange={e => setVehModel(e.target.value)}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-medium"
                    placeholder="e.g. Hilux"
                  />
                </div>
              </div>
              <input
                type="text"
                value={vehVin}
                onChange={e => setVehVin(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                placeholder="VIN / VN (manual entry allowed)"
              />
            </>
          )}

          {type === 'payment' && (
            <>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Select Invoice *</label>
                <select
                  value={payInvId}
                  onChange={e => setPayInvId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold font-mono"
                >
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customerName} (Bal: GH₵ {inv.balance})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Payment Amount (GH₵) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                >
                  <option value="Mobile Money">Mobile Money (MTN MoMo / Telecel)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card / POS</option>
                </select>
              </div>
            </>
          )}

          {type === 'expense' && (
            <>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category</label>
                <select
                  value={expCat}
                  onChange={e => setExpCat(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                >
                  <option value="Petty Cash">Petty Cash</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Utilities">Utilities (ECG / Ghana Water)</option>
                  <option value="Maintenance">Equipment Maintenance</option>
                  <option value="Parts">Spare Parts Purchase</option>
                  <option value="Transport">Transport / Freight</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={e => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                  placeholder="e.g. Workshop compressor oil refill"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Amount (GH₵) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={expAmount}
                  onChange={e => setExpAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                />
              </div>
            </>
          )}

          {type === 'part' && (
            <>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Part Name *</label>
                <input
                  type="text"
                  required
                  value={partName}
                  onChange={e => setPartName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                  placeholder="e.g. Mobil 5W-30 Oil 4L"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Part Number</label>
                <input
                  type="text"
                  value={partNum}
                  onChange={e => setPartNum(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  placeholder="MOB-5W30"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Initial Qty</label>
                  <input
                    type="number"
                    value={partQty}
                    onChange={e => setPartQty(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Selling Price (GH₵)</label>
                  <input
                    type="number"
                    value={partPrice}
                    onChange={e => setPartPrice(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </>
          )}

          {type === 'price-list' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Make</label>
                  <select
                    value={plMake}
                    onChange={e => setPlMake(e.target.value)}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-semibold"
                  >
                    {['Toyota', 'Honda', 'Mercedes-Benz', 'Nissan', 'Hyundai', 'Kia', 'Ford', 'BMW', 'Volkswagen', 'All Makes'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Model</label>
                  <input
                    type="text"
                    value={plModel}
                    onChange={e => setPlModel(e.target.value)}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-medium"
                    placeholder="All Models"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category</label>
                <select
                  value={plCategory}
                  onChange={e => setPlCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                >
                  {['General Service', 'Repair & Maintenance', 'Inspection', 'Brake Service', 'Engine Service', 'Electrical', 'Body Work'].map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Service / Description *</label>
                <input
                  type="text"
                  required
                  value={plService}
                  onChange={e => setPlService(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                  placeholder="e.g. Full Service & Inspection"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Details</label>
                <textarea
                  value={plDescription}
                  onChange={e => setPlDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  placeholder="Optional detailed description"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={plHours}
                    onChange={e => setPlHours(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Standard Fee (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={plPrice}
                    onChange={e => setPlPrice(Number(e.target.value))}
                    className="w-full px-2 py-2 border rounded-xl text-xs font-bold text-teal-700"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-3 flex items-center justify-between gap-2 border-t">
            {type === 'customer' && customerToEdit ? (
            <button
              type="button"
              onClick={handleDeleteCustomer}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Customer
            </button>
          ) : type === 'vehicle' && vehicleToEdit ? (
            <button
              type="button"
              onClick={handleDeleteVehicle}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
            >
              Delete Vehicle
            </button>
          ) : (
            <div />
          )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Save Record
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
