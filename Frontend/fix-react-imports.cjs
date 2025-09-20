const fs = require('fs');
const path = require('path');

// Files that need React import removed (they don't use JSX)
const filesToRemoveReact = [
  'Frontend/src/hooks/useAccessibility.ts',
  'Frontend/src/hooks/useAdminAnalytics.ts',
  'Frontend/src/hooks/useAdminDashboard.ts',
  'Frontend/src/hooks/useAdminRetry.ts',
  'Frontend/src/hooks/useAdminWebSocket.ts',
  'Frontend/src/hooks/useAgentAnalytics.ts',
  'Frontend/src/hooks/useAgents.ts',
  'Frontend/src/hooks/useApiRetry.ts',
  'Frontend/src/hooks/useBilling.ts',
  'Frontend/src/hooks/useCalls.ts',
  'Frontend/src/hooks/useConfirmation.ts',
  'Frontend/src/hooks/useContacts.ts',
  'Frontend/src/hooks/useDashboard.ts',
  'Frontend/src/hooks/useDataAccessSecurity.ts',
  'Frontend/src/hooks/useEmptyState.ts',
  'Frontend/src/hooks/useLeadProfile.ts',
  'Frontend/src/hooks/useLeads.ts',
  'Frontend/src/hooks/useOptimizedPagination.ts',
  'Frontend/src/hooks/useResponsive.ts',
  'Frontend/src/hooks/useSettingsErrorHandling.ts',
  'Frontend/src/hooks/useSettingsLoadingStates.ts'
];

// Files that need React import added (they use JSX but missing import)
const filesToAddReact = [
  'Frontend/src/components/admin/AdminDashboard.tsx',
  'Frontend/src/components/admin/AdminHeader.tsx',
  'Frontend/src/components/admin/AdminLayout.tsx',
  'Frontend/src/components/admin/AdminPanel.tsx',
  'Frontend/src/components/admin/AdminRoute.tsx',
  'Frontend/src/components/admin/AdminSidebar.tsx'
];

function removeUnusedReactImports() {
  filesToRemoveReact.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove React import lines
      content = content.replace(/^import React.*from 'react';\s*\n/gm, '');
      content = content.replace(/^import \{ React.*\} from 'react';\s*\n/gm, '');
      
      // Remove unused React hooks imports if they're not used
      const lines = content.split('\n');
      const updatedLines = lines.map(line => {
        if (line.includes('import {') && line.includes('from \'react\'')) {
          // Check if the imported hooks are actually used in the file
          const importMatch = line.match(/import \{([^}]+)\} from 'react'/);
          if (importMatch) {
            const imports = importMatch[1].split(',').map(imp => imp.trim());
            const usedImports = imports.filter(imp => {
              const regex = new RegExp(`\\b${imp}\\b`, 'g');
              const matches = content.match(regex);
              return matches && matches.length > 1; // More than just the import
            });
            
            if (usedImports.length === 0) {
              return ''; // Remove the entire import line
            } else if (usedImports.length < imports.length) {
              return `import { ${usedImports.join(', ')} } from 'react';`;
            }
          }
        }
        return line;
      });
      
      content = updatedLines.filter(line => line !== '').join('\n');
      
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
    }
  });
}

function addMissingReactImports() {
  filesToAddReact.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if React import already exists
      if (!content.includes('import React') && !content.includes('import { React')) {
        // Add React import at the top
        const lines = content.split('\n');
        const firstImportIndex = lines.findIndex(line => line.startsWith('import'));
        
        if (firstImportIndex !== -1) {
          lines.splice(firstImportIndex, 0, 'import React from \'react\';');
        } else {
          lines.unshift('import React from \'react\';');
        }
        
        content = lines.join('\n');
        fs.writeFileSync(filePath, content);
        console.log(`Added React import to: ${filePath}`);
      }
    }
  });
}

console.log('Fixing React imports...');
removeUnusedReactImports();
addMissingReactImports();
console.log('Done!');