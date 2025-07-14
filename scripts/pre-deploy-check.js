#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Running pre-deployment checks...\n');

let hasErrors = false;

// Check 1: Ensure environment variables are not committed
console.log('1. Checking for committed environment files...');
const envFiles = ['.env', '.env.local', '.env.production'];
const committedEnvFiles = envFiles.filter(file => 
  fs.existsSync(path.join(__dirname, '..', file))
);

if (committedEnvFiles.length > 0) {
  console.log('   ⚠️  Warning: Found environment files that should not be committed:');
  committedEnvFiles.forEach(file => console.log(`      - ${file}`));
  console.log('   Make sure these are in .gitignore!\n');
} else {
  console.log('   ✅ No environment files found in repository\n');
}

// Check 2: Verify build works
console.log('2. Checking if project builds successfully...');
console.log('   Run "npm run build" to verify the build works\n');

// Check 3: Check for TypeScript errors
console.log('3. TypeScript configuration check...');
if (fs.existsSync(path.join(__dirname, '..', 'tsconfig.json'))) {
  console.log('   ✅ TypeScript configuration found\n');
} else {
  console.log('   ❌ No tsconfig.json found!\n');
  hasErrors = true;
}

// Check 4: Verify required configuration files
console.log('4. Checking required configuration files...');
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'tailwind.config.ts',
  'postcss.config.mjs'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    console.log(`   ✅ ${file} found`);
  } else {
    console.log(`   ❌ ${file} missing!`);
    hasErrors = true;
  }
});
console.log('');

// Check 5: Verify Vercel configuration
console.log('5. Checking Vercel configuration...');
if (fs.existsSync(path.join(__dirname, '..', 'vercel.json'))) {
  console.log('   ✅ vercel.json found\n');
} else {
  console.log('   ℹ️  No vercel.json found (optional, Vercel will use defaults)\n');
}

// Check 6: Check for console.logs in production code
console.log('6. Checking for console.log statements...');
const srcDir = path.join(__dirname, '..', 'src');
let consoleLogCount = 0;

function checkForConsoleLogs(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.')) {
      checkForConsoleLogs(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/console\.(log|error|warn|info)/g);
      if (matches) {
        consoleLogCount += matches.length;
      }
    }
  });
}

checkForConsoleLogs(srcDir);
if (consoleLogCount > 0) {
  console.log(`   ⚠️  Found ${consoleLogCount} console statements in code`);
  console.log('   Consider removing or replacing with proper logging\n');
} else {
  console.log('   ✅ No console statements found\n');
}

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 Pre-deployment checklist:\n');
console.log('[ ] Run "npm run build" locally to ensure build succeeds');
console.log('[ ] Set up environment variables in Vercel dashboard:');
console.log('    - NEXT_PUBLIC_SUPABASE_URL');
console.log('    - NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('[ ] Add Vercel domain to Supabase allowed URLs');
console.log('[ ] Test authentication flow after deployment');
console.log('[ ] Verify all features work in production\n');

if (hasErrors) {
  console.log('❌ Some checks failed! Please fix the issues above before deploying.\n');
  process.exit(1);
} else {
  console.log('✅ All automated checks passed! Ready for deployment.\n');
  console.log('🎯 Next steps:');
  console.log('   1. Commit your changes: git add . && git commit -m "Prepare for deployment"');
  console.log('   2. Push to your repository: git push origin main');
  console.log('   3. Import project on Vercel: https://vercel.com/new');
  console.log('   4. Configure environment variables in Vercel dashboard\n');
}