import { rawPriceListData } from './src/data/priceListRawData.ts';

const makes = {};
rawPriceListData.forEach(item => {
  makes[item.make] = (makes[item.make] || 0) + 1;
});

console.log('Total items:', rawPriceListData.length);
console.log('Unique makes:', Object.keys(makes).length);
console.log('\nDistribution by make (top 10):');

const sorted = Object.entries(makes).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 10).forEach(([make, count]) => {
  const percent = ((count / rawPriceListData.length) * 100).toFixed(1);
  console.log(`  ${make}: ${count} items (${percent}%)`);
});

console.log('\nToyota items specifically:', makes['Toyota'] || 0);
