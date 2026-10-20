const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'lib', 'api.ts');
let d = fs.readFileSync(p, 'utf8');
d = d.replace(/const API_URL\s*=\s*import\.meta\.env\.VITE_API_URL\s*\|\|\s*"http:\/\/localhost:4500";?/g, 
  'import { getApiUrl } from "./urlUtils";\n\nconst API_URL = getApiUrl();');
fs.writeFileSync(p, d);
console.log('done');
