#!/usr/bin/env python3
"""
Fixed importer for header-less workbook where columns are:
0: name, 1: reg, 2: make, 3: model, 4: type, 5: phone
"""
from pathlib import Path
import json
import time
from datetime import datetime
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / 'src' / 'data' / 'imported_customers.ts.fixed.json'
OUT_TS = ROOT / 'src' / 'data' / 'imported_customers.ts'

p = Path('Workbook1.xlsx')
if not p.exists():
    print('Workbook1.xlsx not found')
    raise SystemExit(1)

xls = pd.read_excel(p, sheet_name=0, header=None)
print('Sheet shape:', xls.shape)

customers = []
for i in range(len(xls)):
    row = xls.iloc[i]
    name = str(row[0]).strip() if not pd.isna(row[0]) else f'Unnamed Customer {i+1}'
    phone = ''
    # prefer column 5, else try last column
    if 5 in row.index and not pd.isna(row[5]):
        phone = str(row[5]).strip()
    else:
        phone = str(row.iloc[-1]).strip()

    ts = int(time.time() * 1000)
    cid = f'cust-fixed-{ts}-{i+1}'
    cust = {
        'id': cid,
        'name': name,
        'phone': phone,
        'email': None,
        'address': None,
        'company': None,
        'createdAt': datetime.now().strftime('%Y-%m-%d'),
        'notes': None
    }
    customers.append(cust)

OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
with OUT_JSON.open('w', encoding='utf-8') as f:
    json.dump(customers, f, indent=2, ensure_ascii=False)

# write TS file
ts_objs = []
for c in customers:
    parts = []
    for k in ['id','name','phone','email','address','company','createdAt','notes']:
        v = c[k]
        if v is None:
            parts.append(f"  {k}: undefined")
        else:
            s = str(v).replace('\\','\\\\').replace('"','\\"')
            parts.append(f"  {k}: \"{s}\"")
    ts_objs.append('{\n' + ',\n'.join(parts) + '\n}')

content = (
    "// Auto-generated (fixed) by tools/import_customers_fixed.py\n"
    "import { Customer } from '../types';\n\n"
    "export const importedCustomers: Customer[] = [\n"
    + ',\n'.join(ts_objs)
    + "\n];\n"
)
with OUT_TS.open('w', encoding='utf-8') as f:
    f.write(content)

print('Wrote fixed imported_customers.ts and JSON')
