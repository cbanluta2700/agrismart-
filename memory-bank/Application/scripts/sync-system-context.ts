// sync-system-context.ts

/**
 * This script is intended to synchronize the System Context (System Context.md)
 * file with other relevant files in the Memory Bank.
 *
 * It can be used to update the technology stack, core features, or
 * architectural considerations in System Context.md based on changes
 * in other files.
 *
 * This script is just a example.
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the paths to the relevant files and directories
const SYSTEM_CONTEXT_PATH = path.join(__dirname, '../../System Context.md');

/**
 *  A function to update the System Context.
 *  @param systemContextPath : the path to the System Context file.
 */
function updateSystemContext(systemContextPath: string) {
  // 1. Read the content of System Context.md
  let systemContextContent = fs.readFileSync(systemContextPath, 'utf-8');

  // 2. Update sections of System Context.md (example)
  systemContextContent = updateTechnologyStack(systemContextContent);

  // 3. Write the updated content back to System Context.md
  fs.writeFileSync(systemContextPath, systemContextContent, 'utf-8');

  console.log('System Context.md synchronized successfully.');
}

/**
 * Update the Technology Stack in System Context.md
 * @param content The current content of the file.
 * @returns The updated content of the file.
 */
function updateTechnologyStack(content: string): string {
  // You would implement logic here to update the Technology Stack
  // based on changes in other files. This is a simplified example.
  const newTechnologyStack = `
## Technology Stack

### Frontend

*   **Framework:** Next.js
*   **UI Library:** React, Radix UI
* **Styling**: TailwindCSS
* **State management**: Zustand
* **Data fetching**: TanStack Query

### Backend

*   **Framework:** Node.js, Express.js
*   **Language:** TypeScript
*   **API:** REST API

### Database

*   **ORM:** Prisma
*   **Database:** PostgreSQL

### Other

*   **Authentication:** JWT, NextAuth.js, bcrypt
*   **Payment Gateway:** Stripe
* **Real time chat**: Socket.io, WebSockets, Redis
* **Testing**: Jest, Cypress, Postman
* **Cloud**: AWS
* **Version Control**: Git, Github
* **Continuous integration**: Travis CI
* **Task Management**: Notion
* **Monitoring**: Sentry
`;

  //replace the old stack by the new stack
  const startMarker = '## Technology Stack';
  const start = content.indexOf(startMarker);
  const end = content.indexOf('## Architecture');
  const oldStack = content.substring(start, end);
  content = content.replace(oldStack, newTechnologyStack);
  return content;
}

// Execute the update function
updateSystemContext(SYSTEM_CONTEXT_PATH);
