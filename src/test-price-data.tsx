import { useEffect } from 'react';
import { initialPriceList } from './data/seedData';
import { rawPriceListData } from './data/priceListRawData';

export function TestPriceData() {
  useEffect(() => {
    console.log('[TEST] initialPriceList.length:', initialPriceList.length);
    if (initialPriceList.length > 0) {
      const makes = new Set(initialPriceList.map(p => p.make));
      console.log('[TEST] initialPriceList makes:', makes.size, Array.from(makes).sort());
      console.log('[TEST] initialPriceList first item:', initialPriceList[0]);
      console.log('[TEST] initialPriceList last item:', initialPriceList[initialPriceList.length - 1]);
    }
    
    console.log('[TEST] rawPriceListData.length:', rawPriceListData.length);
    if (rawPriceListData.length > 0) {
      const makes = new Set(rawPriceListData.map(p => p.make));
      console.log('[TEST] rawPriceListData makes:', makes.size, Array.from(makes).sort());
    }
  }, []);

  return <div>[Test component loaded - check console]</div>;
}
