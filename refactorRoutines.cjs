const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'views', 'RoutinesView.tsx');
let content = fs.readFileSync(file, 'utf8');

const components = [
    { name: 'SwipeableCommitment', regex: /const SwipeableCommitment[\s\S]*?(?=const LoadRoutineModal)/ },
    { name: 'LoadRoutineModal', regex: /const LoadRoutineModal[\s\S]*?(?=const SaveRoutineModal)/ },
    { name: 'SaveRoutineModal', regex: /const SaveRoutineModal[\s\S]*?(?=const HistoryModal)/ },
    { name: 'HistoryModal', regex: /const HistoryModal[\s\S]*?(?=const Onboarding)/ },
    { name: 'Onboarding', regex: /const Onboarding[\s\S]*?(?=const ContractSetup)/ },
    { name: 'ContractSetup', regex: /const ContractSetup[\s\S]*?(?=const ActiveContractView)/ },
    { name: 'ActiveContractView', regex: /const ActiveContractView[\s\S]*?(?=export default RoutinesView;)/ }
];

let importsStr = `import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';
`;

for (const comp of components) {
    const match = content.match(comp.regex);
    if (match) {
        let compCode = match[0];
        // Export the component
        compCode = compCode.replace(/^const/, 'export const');
        const filepath = path.join(__dirname, 'src', 'components', 'routines', `${comp.name}.tsx`);
        fs.writeFileSync(filepath, importsStr + '\n' + compCode, 'utf8');
        content = content.replace(comp.regex, '');
    }
}

const importsToAdd = components.map(c => `import { ${c.name} } from '@/components/routines/${c.name}';`).join('\n');
content = content.replace("import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';", "import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';\n" + importsToAdd);

// Remove the // --- Sub Components --- line
content = content.replace('// --- Sub Components ---', '');

fs.writeFileSync(file, content, 'utf8');
console.log("RoutinesView refactored!");
