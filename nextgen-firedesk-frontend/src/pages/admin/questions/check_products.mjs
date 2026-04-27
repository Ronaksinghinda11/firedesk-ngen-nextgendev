import fs from 'fs';
const file = fs.readFileSync('/Users/harshringsia/newStructFiredesk/nextgen-firedesk-staging_NewStructure/nextgen-firedesk-frontend/src/pages/admin/questions/QuestionsPage.tsx', 'utf8');
console.log(file.match(/products\.filter\(/g));
