#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running quick ESLint fixes...\n');

// Common fixes for build errors
const fixes = [
  // Fix apostrophes
  {
    pattern: /Don't/g,
    replacement: "Don&apos;t",
    description: "Fix apostrophes"
  },
  {
    pattern: /can't/g,
    replacement: "can&apos;t",
    description: "Fix apostrophes"
  },
  {
    pattern: /won't/g,
    replacement: "won&apos;t",
    description: "Fix apostrophes"
  },
  {
    pattern: /doesn't/g,
    replacement: "doesn&apos;t",
    description: "Fix apostrophes"
  }
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Files to fix
const filesToFix = [
  'src/components/auth/LoginForm.tsx',
  'src/components/auth/SignupForm.tsx'
];

let totalFixed = 0;
filesToFix.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fixFile(fullPath)) {
    totalFixed++;
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files!`);
console.log('\nRemaining issues need manual fixing:');
console.log('- Remove unused imports/variables');
console.log('- Fix TypeScript any types');
console.log('- Add missing React hook dependencies');