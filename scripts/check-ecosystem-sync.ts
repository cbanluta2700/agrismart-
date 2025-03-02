import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Define pattern checks based on React ecosystem
const ecosystemPatterns = {
  stateManagement: {
    recoil: {
      required: [
        'atom(',
        'selector(',
        'useRecoilState',
        'useRecoilValue',
        'RecoilRoot'
      ],
      preferred: [
        'atomFamily',
        'selectorFamily',
        'useRecoilCallback'
      ]
    },
    zustand: {
      required: [
        'create(',
        'useStore'
      ]
    }
  },
  components: {
    patterns: [
      'export interface *Props',
      'export const * = ({',
      'const [*, set*] = useState',
      'useEffect(',
      'return (',
    ],
    naming: [
      /.+Props$/,
      /^[A-Z][a-zA-Z]+$/,
      /^use[A-Z]/
    ]
  },
  auth: {
    required: [
      'useAuth',
      'withAuth',
      'ProtectedRoute',
      'AuthProvider'
    ],
    security: [
      'validatePassword',
      'validateEmail',
      'sanitizeUser'
    ]
  }
};

const checkFile = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const issues: string[] = [];

  // Check state management patterns
  if (content.includes('useRecoil')) {
    const missingRecoil = ecosystemPatterns.stateManagement.recoil.required
      .filter(pattern => !content.includes(pattern));
    
    if (missingRecoil.length > 0) {
      issues.push(
        `Missing Recoil patterns: ${missingRecoil.join(', ')}`
      );
    }
  }

  // Check component patterns
  if (filePath.includes('components/')) {
    const missingPatterns = ecosystemPatterns.components.patterns
      .filter(pattern => !content.includes(pattern));
    
    if (missingPatterns.length > 0) {
      issues.push(
        `Missing component patterns: ${missingPatterns.join(', ')}`
      );
    }

    // Check naming conventions
    const componentName = fileName.replace(/\.[jt]sx?$/, '');
    const validName = ecosystemPatterns.components.naming
      .some(pattern => pattern.test(componentName));
    
    if (!validName) {
      issues.push(
        `Invalid component name: ${componentName} (should follow PascalCase)`
      );
    }
  }

  // Check auth patterns
  if (filePath.includes('auth/')) {
    const missingAuth = ecosystemPatterns.auth.required
      .filter(pattern => !content.includes(pattern));
    
    const missingSecurity = ecosystemPatterns.auth.security
      .filter(pattern => !content.includes(pattern));
    
    if (missingAuth.length > 0) {
      issues.push(
        `Missing auth patterns: ${missingAuth.join(', ')}`
      );
    }

    if (missingSecurity.length > 0) {
      issues.push(
        `Missing security patterns: ${missingSecurity.join(', ')}`
      );
    }
  }

  return {
    file: fileName,
    issues,
    synced: issues.length === 0
  };
};

const checkDirectory = (dir: string) => {
  const results: ReturnType<typeof checkFile>[] = [];

  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results.push(...checkDirectory(filePath));
    } else if (/\.[jt]sx?$/.test(file)) {
      results.push(checkFile(filePath));
    }
  });

  return results;
};

const reportResults = (results: ReturnType<typeof checkFile>[]) => {
  console.log('\nReact Ecosystem Pattern Sync Check');
  console.log('================================\n');

  const syncedFiles = results.filter(r => r.synced);
  const outOfSyncFiles = results.filter(r => !r.synced);

  console.log(chalk.green(`✓ ${syncedFiles.length} files in sync`));
  
  if (outOfSyncFiles.length > 0) {
    console.log(chalk.red(`✗ ${outOfSyncFiles.length} files out of sync\n`));
    
    outOfSyncFiles.forEach(result => {
      console.log(chalk.red(`File: ${result.file}`));
      result.issues.forEach(issue => {
        console.log(chalk.yellow(`  - ${issue}`));
      });
      console.log('');
    });
  }

  console.log('Summary:');
  console.log('--------');
  console.log(`Total files checked: ${results.length}`);
  console.log(`Files in sync: ${syncedFiles.length}`);
  console.log(`Files out of sync: ${outOfSyncFiles.length}`);
};

// Run the check
const targetDir = process.argv[2] || './src';
const results = checkDirectory(targetDir);
reportResults(results);

// Exit with appropriate code
process.exit(results.every(r => r.synced) ? 0 : 1);