"""
AGMARKNET cleaning pipeline  -  NO DATA ROWS ARE DELETED.
Every modified value keeps its original in <col>_original; every touched row gets
machine-readable codes in `cleaning_notes`.
Input : agmarknet/<group>/*.csv   Output: clean_out/<group>.csv + logs
"""
import pandas as pd, numpy as np, glob, os

SRC, OUT = 'agmarknet', 'clean_out'
os.makedirs(OUT, exist_ok=True)
COLS = ['state','district','commodity_group','commodity','date','msp','arrival_qty',
        'arrival_unit','min_price','modal_price','max_price','price_unit']
NUM = ['arrival_qty','min_price','modal_price','max_price']
ORDER = ['state','district','commodity_group','commodity','date','msp','arrival_qty','arrival_unit',
         'min_price','modal_price','max_price','price_unit',
         'arrival_qty_original','min_price_original','modal_price_original','max_price_original',
         'cleaning_notes','source_file','source_row']

def clean_group(d):
    codes = {}
    def tag(mask, code):
        mask = np.asarray(mask, dtype=bool)
        if mask.any(): codes[code] = mask

    for c in ['state','district','commodity_group','commodity','arrival_unit','price_unit']:
        d[c] = d[c].str.replace(r'\s+', ' ', regex=True).str.strip()
    d['date'] = pd.to_datetime(d['date'], format='%d-%m-%Y')
    for c in NUM: d[c] = pd.to_numeric(d[c])
    d['msp'] = pd.to_numeric(d['msp'].replace('-', np.nan))
    d.loc[d.msp == 0, 'msp'] = np.nan                       # '-' and 0.00 both = "no MSP"
    orig = {c: d[c].copy() for c in NUM}

    m = d.min_price == 0; d.loc[m,'min_price'] = np.nan; tag(m,'ZERO_MIN_TO_NULL')
    m = d.max_price == 0; d.loc[m,'max_price'] = np.nan; tag(m,'ZERO_MAX_TO_NULL')
    m = d.arrival_qty < 0; d.loc[m,'arrival_qty'] = np.nan; tag(m,'NEGATIVE_ARRIVAL_TO_NULL')
    tag(d.arrival_qty == 0, 'ZERO_ARRIVAL_KEPT')

    win = (d.state=='Tamil Nadu') & (d.price_unit=='Rs./Quintal') & d.date.between('2024-06-18','2024-07-07')
    ref_out = (d[~win].groupby(['commodity','state'], observed=True).modal_price.median().rename('ref_out'))
    ro = d[['commodity','state']].join(ref_out, on=['commodity','state']).ref_out
    closer_x100 = (np.log(d.modal_price*100/ro).abs() < np.log(d.modal_price/ro).abs()) | ro.isna()
    tn = win & closer_x100                                  # only rows that really are in Rs/kg
    for c in ['min_price','modal_price','max_price']: d.loc[tn,c] = d.loc[tn,c]*100
    tag(tn,'TN_UNIT_FIX_X100')

    ym = d.date.dt.to_period('M')
    ref = d.groupby(['commodity','state','price_unit',ym], observed=True).modal_price.transform('median')
    ref = ref.fillna(d.groupby(['commodity','price_unit']).modal_price.transform('median'))
    for c in ['min_price','modal_price','max_price']:
        p = d[c]; bad = (p/ref) > 10
        fixed = pd.Series(np.nan, index=d.index)
        for k in (10,100,1000,10000):
            cand = p/k; ok = bad & fixed.isna() & (cand/ref).between(0.5,2.0); fixed[ok] = cand[ok]
        corr = bad & fixed.notna(); d.loc[corr,c] = fixed[corr]; tag(corr, f'{c.upper()}_DECIMAL_CORRECTED')
        unres = bad & fixed.isna();  d.loc[unres,c] = np.nan;     tag(unres, f'{c.upper()}_OUTLIER_TO_NULL')

    # swap min/max only if the swap restores min <= modal <= max (or modal is missing)
    sw = d.min_price.notna() & d.max_price.notna() & (d.min_price > d.max_price) & \
         (d.modal_price.isna() | ((d.max_price <= d.modal_price) & (d.modal_price <= d.min_price)))
    d.loc[sw,['min_price','max_price']] = d.loc[sw,['max_price','min_price']].values; tag(sw,'MIN_MAX_SWAPPED')
    m = d.min_price.notna() & d.modal_price.notna() & (d.min_price > d.modal_price)
    d.loc[m,'min_price'] = np.nan; tag(m,'MIN_ABOVE_MODAL_TO_NULL')
    m = d.max_price.notna() & d.modal_price.notna() & (d.max_price < d.modal_price)
    d.loc[m,'max_price'] = np.nan; tag(m,'MAX_BELOW_MODAL_TO_NULL')

    tag((d.price_unit=='Rs./Quintal') & ((d.modal_price/ref) < 0.1), 'LOW_PRICE_SUSPECT_KEPT')
    tag(d.max_price.notna() & d.modal_price.notna() & (d.max_price/d.modal_price > 10), 'MAX_GT_10X_MODAL_KEPT')
    tag(d.min_price.notna() & d.modal_price.notna() & (d.min_price/d.modal_price < 0.1), 'MIN_LT_10PCT_MODAL_KEPT')

    notes = np.full(len(d), '', dtype=object)
    for code, mask in codes.items():
        idx = np.where(mask)[0]
        notes[idx] = np.where(notes[idx]=='', code, notes[idx] + ';' + code)
    d['cleaning_notes'] = notes
    for c in NUM:
        changed = ~((d[c]==orig[c]) | (d[c].isna() & orig[c].isna()))
        d[c+'_original'] = orig[c].where(changed)
        rec = d[c].where(d[c+'_original'].isna(), d[c+'_original'])            # reconcile: nothing lost
        assert ((rec==orig[c]) | (rec.isna() & orig[c].isna())).all(), c
    return d[ORDER]

banners, junk_parts, stats = [], [], []
for folder in sorted(os.listdir(SRC)):
    frames = []
    for f in sorted(glob.glob(f'{SRC}/{folder}/*.csv')):
        with open(f, encoding='utf-8') as fh: banners.append((os.path.relpath(f,SRC), fh.readline().strip().strip(',')))
        df = pd.read_csv(f, skiprows=2, header=None, names=COLS, dtype=str, keep_default_na=False, skip_blank_lines=False)
        df['source_file'] = os.path.relpath(f, SRC); df['source_row'] = np.arange(1, len(df)+1)
        frames.append(df)
    raw = pd.concat(frames, ignore_index=True); del frames
    junk = raw.commodity_group.str.strip().eq('')
    junk_parts.append(raw[junk]); d = raw[~junk].copy(); del raw
    n_in = len(d)
    out = clean_group(d)
    assert len(out) == n_in
    out = out.sort_values(['date','state','district','commodity']).reset_index(drop=True)
    out.assign(date=out.date.dt.strftime('%Y-%m-%d')).to_csv(f'{OUT}/{folder}.csv', index=False)
    stats.append((folder, n_in, len(out), int((out.cleaning_notes!='').sum())))
    print(folder, n_in, len(out), flush=True); del d, out

pd.DataFrame(banners, columns=['source_file','banner_text']).to_csv(f'{OUT}/log_source_banners.csv', index=False)
pd.concat(junk_parts).to_csv(f'{OUT}/log_removed_footer_rows.csv', index=False)
pd.DataFrame(stats, columns=['group','rows_in','rows_out','rows_with_notes']).to_csv('stats.csv', index=False)
