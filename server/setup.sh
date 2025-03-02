#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting AgriSmart Server Setup...${NC}"

# Create necessary directories
echo -e "\n${BLUE}Creating directory structure...${NC}"
mkdir -p logs
mkdir -p uploads/temp
mkdir -p src/{controllers,models,routes,services,utils,middleware,types,validations,config}
mkdir -p __tests__/{unit,integration,e2e}

# Check if .env exists, if not create from example
if [ ! -f ".env" ]; then
    echo -e "\n${BLUE}Creating .env file from template...${NC}"
    cp .env.example .env 2>/dev/null || echo "WARNING: .env.example not found"
    echo -e "${GREEN}Created .env file. Please update with your configuration.${NC}"
else
    echo -e "\n${YELLOW}.env file already exists. Skipping...${NC}"
fi

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install --save express mongoose @types/mongoose cors helmet compression dotenv winston \
    express-rate-limit multer @types/multer @google-cloud/storage jsonwebtoken bcrypt \
    zod express-validator cookie-parser express-session morgan nodemailer

# Install dev dependencies
echo -e "\n${BLUE}Installing development dependencies...${NC}"
npm install --save-dev typescript @types/node @types/express vitest supertest @types/supertest \
    @types/jsonwebtoken @types/bcrypt @types/nodemailer eslint prettier @typescript-eslint/parser \
    @typescript-eslint/eslint-plugin nodemon ts-node ts-node-dev webpack webpack-cli webpack-node-externals \
    clean-webpack-plugin fork-ts-checker-webpack-plugin ts-loader

# Initialize TypeScript configuration if not exists
if [ ! -f "tsconfig.json" ]; then
    echo -e "\n${BLUE}Initializing TypeScript configuration...${NC}"
    npx tsc --init
    
    # Update tsconfig.json with proper settings
    node -e '
    const fs = require("fs");
    const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf8"));
    
    tsconfig.compilerOptions = {
      ...tsconfig.compilerOptions,
      "target": "es2017",
      "module": "commonjs",
      "lib": ["es2017", "esnext.asynciterable"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"]
      }
    };
    
    fs.writeFileSync("tsconfig.json", JSON.stringify(tsconfig, null, 2));
    '
fi

# Create tsconfig.build.json
echo -e "\n${BLUE}Creating tsconfig.build.json...${NC}"
cat > tsconfig.build.json << EOL
{
  "extends": "./tsconfig.json",
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.test.ts",
    "**/*.spec.ts",
    "vitest.config.ts",
    "scripts",
    "__tests__"
  ],
  "compilerOptions": {
    "sourceMap": false,
    "inlineSourceMap": false,
    "declaration": true,
    "noEmit": false,
    "outDir": "dist"
  }
}
EOL

# Create webpack.config.ts
echo -e "\n${BLUE}Creating webpack configuration...${NC}"
cat > webpack.config.ts << EOL
import path from 'path';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const config: webpack.Configuration = {
  target: 'node',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/server.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'server.js',
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new ForkTsCheckerWebpackPlugin(),
  ],
};

export default config;
EOL

# Create logs directory with proper permissions
echo -e "\n${BLUE}Setting up logs directory...${NC}"
mkdir -p logs
touch logs/app.log logs/error.log
chmod 755 logs
chmod 644 logs/app.log logs/error.log

# Update package.json scripts
echo -e "\n${BLUE}Updating package.json scripts...${NC}"
if [ -f "package.json" ]; then
    # Create temporary file
    TMP_FILE=$(mktemp)
    node -e '
    const fs = require("fs");
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    
    packageJson.scripts = {
      ...packageJson.scripts,
      "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
      "build": "webpack --config webpack.config.ts",
      "build:tsc": "tsc -p tsconfig.build.json",
      "start": "node dist/server.js",
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage",
      "lint": "eslint . --ext .ts",
      "format": "prettier --write \"src/**/*.ts\"",
      "validate": "tsc --noEmit",
      "clean": "rm -rf dist coverage"
    };
    
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
    '
    echo -e "${GREEN}Updated package.json scripts${NC}"
else
    echo -e "${RED}package.json not found. Cannot update scripts.${NC}"
fi

# Create nodemon configuration
echo -e "\n${BLUE}Creating nodemon configuration...${NC}"
cat > nodemon.json << EOL
{
  "watch": ["src"],
  "ext": ".ts,.js",
  "ignore": [],
  "exec": "ts-node ./src/server.ts"
}
EOL

# Create basic server file
echo -e "\n${BLUE}Creating basic server file...${NC}"
mkdir -p src
cat > src/server.ts << EOL
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
EOL

# Create vitest configuration
echo -e "\n${BLUE}Creating vitest configuration...${NC}"
cat > vitest.config.ts << EOL
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
EOL

# Create .eslintrc.js
echo -e "\n${BLUE}Creating ESLint configuration...${NC}"
cat > .eslintrc.js << EOL
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
EOL

# Create .prettierrc
echo -e "\n${BLUE}Creating Prettier configuration...${NC}"
cat > .prettierrc << EOL
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
EOL

# Setup git hooks if git is initialized
if [ -d ".git" ]; then
    echo -e "\n${BLUE}Setting up git hooks...${NC}"
    npm install --save-dev husky lint-staged
    npx husky install
    npx husky add .husky/pre-commit "npx lint-staged"
    
    # Create lint-staged.config.js
    cat > lint-staged.config.js << EOL
module.exports = {
  '*.{ts,js}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
EOL
    echo -e "${GREEN}Git hooks set up successfully${NC}"
fi

# Create basic README.md
echo -e "\n${BLUE}Creating README.md...${NC}"
cat > README.md << EOL
# AgriSmart API Server

## Getting Started

### Installation

\`\`\`bash
npm install
\`\`\`

### Development

\`\`\`bash
npm run dev
\`\`\`

### Production Build

\`\`\`bash
npm run build
npm start
\`\`\`

### Testing

\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Project Structure

- \`src/\`: Source code
  - \`controllers/\`: Request handlers
  - \`models/\`: Database models
  - \`routes/\`: API routes
  - \`services/\`: Business logic
  - \`middleware/\`: Express middleware
  - \`utils/\`: Utility functions
  - \`types/\`: TypeScript type definitions
  - \`validations/\`: Request validation schemas
  - \`config/\`: Configuration files
- \`__tests__/\`: Test files
  - \`unit/\`: Unit tests
  - \`integration/\`: Integration tests
  - \`e2e/\`: End-to-end tests
- \`dist/\`: Compiled JavaScript files
- \`logs/\`: Application logs
- \`uploads/\`: File uploads

## API Documentation

API documentation is available at \`/api/docs\` when the server is running.
EOL

# Create sample .env.example
echo -e "\n${BLUE}Creating .env.example...${NC}"
cat > .env.example << EOL
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/agrismart

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@agrismart.com

# Storage Configuration
STORAGE_TYPE=local # or 'gcs' for Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# Logging
LOG_LEVEL=info
EOL

# Final message
echo -e "\n${GREEN}Server setup completed successfully!${NC}"
echo -e "You can now start the development server with: ${BLUE}npm run dev${NC}"
echo -e "Or build for production with: ${BLUE}npm run build${NC}"