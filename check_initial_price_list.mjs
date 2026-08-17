import { initialPriceList } from './src/data/seedData.ts';

console.log('initialPriceList length:', initialPriceList.length);

const makes = new Set();
initialPriceList.forEach(item => makes.add(item.make));
console.log('Unique makes in initialPriceList:', makes.size);
console.log('Makes:', Array.from(makes).sort());

console.log('\nFirst 3 items:');
initialPriceList.slice(0, 3).forEach(item => {
  console.log(`  ${item.make} - ${item.model}: ${item.serviceOrPart} (${item.price})`);
});
