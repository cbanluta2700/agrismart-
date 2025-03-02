const fs = require('fs');
const path = require('path');

// Source and destination directories
const sourceDir = path.resolve(__dirname, 'moderation-schemas');
const destDir = path.resolve(__dirname, 'memory-mesh/dist/data/schemas');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy all schema files
const schemaFiles = fs.readdirSync(sourceDir);
schemaFiles.forEach(file => {
  if (file.endsWith('.schema.json')) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    
    // Read the file content
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Write to destination
    fs.writeFileSync(destPath, content);
    
    console.log(`Copied ${file} to ${destPath}`);
  }
});

console.log('All moderation schemas copied successfully!');
