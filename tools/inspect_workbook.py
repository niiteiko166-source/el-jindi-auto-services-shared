from pathlib import Path
import pandas as pd

p = Path('Workbook1.xlsx')
if not p.exists():
    print('Workbook1.xlsx not found in current directory')
    raise SystemExit(1)

xls = pd.read_excel(p, sheet_name=None)
print('Sheets:', list(xls.keys()))

# choose first sheet
sheet = list(xls.keys())[0]
df = xls[sheet]
print('\nUsing sheet:', sheet)
print('\nColumns:')
for i, c in enumerate(df.columns):
    print(f"{i:02d}: {c}")

print('\nFirst 15 rows:')
with pd.option_context('display.max_columns', None, 'display.width', 2000):
    print(df.head(15).to_string(index=False))
