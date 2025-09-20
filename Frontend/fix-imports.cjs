const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Fix LoadingSpinner imports
    if (content.includes("import { LoadingSpinner } from")) {
      content = content.replace(/import \{ LoadingSpinner \} from '([^']+)'/g, "import LoadingSpinner from '$1'");
      changed = true;
    }
    
    // Fix EmptyState imports
    if (content.includes("import { EmptyState } from")) {
      content = content.replace(/import \{ EmptyState \} from '([^']+)'/g, "import EmptyState from '$1'");
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixImportsInFile(filePath);
    }
  }
}

// Start from src directory
walkDirectory('./src');
console.log('Import fixing complete!');