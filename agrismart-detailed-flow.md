# AgriSmart Codebase Flow

## 1. Analysis Process
- **Server Structure Analysis**
  - `check-server.js` recursively analyzes the server directory structure
  - Identifies imports, exports, and potential circular dependencies
  - Focuses on services in `server/express/services` and `server/express/src/services`

- **Service Analysis**
  - `check-services.js` and `analyze-services.ts` identify service implementations
  - Track service dependencies and usage across the codebase
  - Detect duplicate service implementations

- **Dependency Analysis**
  - `analyze-deps.ts` examines package dependencies
  - Calculates size and usage metrics
  - Identifies unused or oversized dependencies

- **Style Analysis**
  - `cleanup-styles.ts` analyzes component styles
  - Identifies duplicate classes and non-Tailwind classes
  - Generates optimization suggestions

## 2. Documentation Generation
- **Architecture Diagram Creation**
  - `generate-architecture-diagram.ts` builds a file tree representation
  - Converts the tree to a Mermaid diagram
  - Analyzes component relationships

- **Report Generation**
  - `report-generator.ts` creates standardized reports
  - Supports multiple output formats (MD, JSON)
  - Includes git information and timestamps

- **Documentation Updates**
  - `update-architecture.sh` runs the diagram generator
  - Creates timestamped snapshots
  - Updates main architecture files

## 3. Task Management
- **Task Initialization**
  - `init-task.ts` initializes tasks
  - Checks current architecture
  - Updates memory bank with task information

## 4. Data Flow
1. Scripts analyze the codebase structure and relationships
2. Analysis data is transformed into diagrams and documentation
3. Reports are generated with optimization suggestions
4. Timestamped snapshots track changes over time