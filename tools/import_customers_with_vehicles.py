#!/usr/bin/env python3
"""
Importer that reads Workbook1.xlsx (header-less) with columns:
0: name, 1: registration, 2: make, 3: model, 4: company, 5: phone
Generates:
- src/data/imported_customers.ts
- src/data/imported_vehicles.ts
and JSON variants.
"""
from pathlib import Path
import json
import time
from datetime import datetime
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT_CUSTOMERS_JSON = ROOT / 'src' / 'data' / 'imported_customers_with_vehicles.json'
OUT_CUSTOMERS_TS = ROOT / 'src' / 'data' / 'imported_customers.ts'
OUT_VEHICLES_TS = ROOT / 'src' / 'data' / 'imported_vehicles.ts'

p = Path('Workbook1.xlsx')
if not p.exists():
    print('Workbook1.xlsx not found')
    raise SystemExit(1)

xls = pd.read_excel(p, sheet_name=0, header=None)
print('Sheet shape:', xls.shape)

customers = []
vehicles = []

for i in range(len(xls)):
    row = xls.iloc[i]
    name = str(row[0]).strip() if not pd.isna(row[0]) else f'Unnamed Customer {i+1}'
    reg = str(row[1]).strip() if not pd.isna(row[1]) else 'UNREGISTERED'
    make = str(row[2]).strip() if not pd.isna(row[2]) else ''
    model = str(row[3]).strip() if not pd.isna(row[3]) else ''
    company = str(row[4]).strip() if not pd.isna(row[4]) else None
    phone = ''
    if 5 in row.index and not pd.isna(row[5]):
        phone = str(row[5]).strip()
    else:
        phone = ''

    ts = int(time.time() * 1000)
    cid = f'cust-fixed-veh-{ts}-{i+1}'
    customer = {
        'id': cid,
        'name': name,
        'phone': phone,
        'email': None,
        'address': None,
        'company': company,
        'createdAt': datetime.now().strftime('%Y-%m-%d'),
        'notes': None
    }
    customers.append(customer)

    vid = f'veh-fixed-{ts}-{i+1}'
    vehicle = {
        'id': vid,
        'customerId': cid,
        'registrationNumber': reg,
        'make': make if make else 'Unknown',
        'model': model if model else 'Unknown',
        'year': 2020,
        'vin': None,
        'mileage': 0,
        'color': None,
        'fuelType': None,
        'notes': None,
        'createdAt': datetime.now().strftime('%Y-%m-%d')
    }
    vehicles.append(vehicle)

OUT_CUSTOMERS_JSON.parent.mkdir(parents=True, exist_ok=True)
with OUT_CUSTOMERS_JSON.open('w', encoding='utf-8') as f:
    json.dump({'customers': customers, 'vehicles': vehicles}, f, indent=2, ensure_ascii=False)

# Write customers TS
cust_ts_objs = []
for c in customers:
    parts = []
    for k in ['id','name','phone','email','address','company','createdAt','notes']:
        v = c[k]
        if v is None:
            parts.append(f"  {k}: undefined")
        else:
            s = str(v).replace('\\','\\\\').replace('"','\\"')
            parts.append(f"  {k}: \"{s}\"")
    cust_ts_objs.append('{\n' + ',\n'.join(parts) + '\n}')

cust_content = (
    "// Auto-generated (fixed with vehicles) by tools/import_customers_with_vehicles.py\n"
    "import { Customer } from '../types';\n\n"
    "export const importedCustomers: Customer[] = [\n"
    + ',\n'.join(cust_ts_objs)
    + "\n];\n"
)
with OUT_CUSTOMERS_TS.open('w', encoding='utf-8') as f:
    f.write(cust_content)

# Write vehicles TS
veh_ts_objs = []
for v in vehicles:
    parts = []
    for k in ['id','customerId','registrationNumber','make','model','year','vin','mileage','color','fuelType','notes','createdAt']:
        val = v.get(k)
        if val is None:
            parts.append(f"  {k}: undefined")
        elif isinstance(val, int):
            parts.append(f"  {k}: {val}")
        else:
            s = str(val).replace('\\','\\\\').replace('"','\\"')
            parts.append(f"  {k}: \"{s}\"")
    veh_ts_objs.append('{\n' + ',\n'.join(parts) + '\n}')

veh_content = (
    "// Auto-generated (fixed with customers) by tools/import_customers_with_vehicles.py\n"
    "import { Vehicle } from '../types';\n\n"
    "export const importedVehicles: Vehicle[] = [\n"
    + ',\n'.join(veh_ts_objs)
    + "\n];\n"
)
with OUT_VEHICLES_TS.open('w', encoding='utf-8') as f:
    f.write(veh_content)

print('Wrote customers and vehicles TS and JSON')
