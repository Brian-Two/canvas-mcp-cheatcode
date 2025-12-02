// Test imports one by one
console.log('Starting import test...');

console.log('1. Importing dotenv...');
await import('dotenv/config');
console.log('✅ dotenv OK');

console.log('2. Importing express...');
const { default: express } = await import('express');
console.log('✅ express OK');

console.log('3. Importing cors...');
const { default: cors } = await import('cors');
console.log('✅ cors OK');

console.log('4. Importing graph...');
const { buildGraph } = await import('./src/graph.js');
console.log('✅ graph OK');

console.log('5. Importing canvasMCP...');
const { canvasClient } = await import('./src/canvasMCP.js');
console.log('✅ canvasMCP OK');

console.log('6. Importing mcpManager...');
const { mcpManager } = await import('./src/mcp/mcpManager.js');
console.log('✅ mcpManager OK');

console.log('7. Importing assignmentAnalysisService...');
const { analyzeAssignment } = await import('./src/services/assignmentAnalysisService.js');
console.log('✅ assignmentAnalysisService OK');

console.log('\n🎉 All imports successful!');
process.exit(0);

