const fs = require('fs');
const p = 'src/lib/socket.ts';
let d = fs.readFileSync(p, 'utf8');
d = d.replace("import { jwtDecode } from \"jwt-decode\";\n\ntype TokenPayload = {\n  id?: string;\n  _id?: string;\n  userId?: string;\n};\n\nconst SOCKET_URL =\n  import.meta.env.VITE_API_URL || \"http://localhost:4500\";",
  "import { jwtDecode } from \"jwt-decode\";\nimport { getApiUrl } from \"./urlUtils\";\n\ntype TokenPayload = {\n  id?: string;\n  _id?: string;\n  userId?: string;\n};\n\nconst SOCKET_URL = getApiUrl();");
fs.writeFileSync(p, d);
console.log('ok');
