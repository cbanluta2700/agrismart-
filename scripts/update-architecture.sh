#!/bin/bash

# Install dependencies if not present
if ! command -v mmdc &> /dev/null; then
    echo "Installing Mermaid CLI..."
    npm install -g @mermaid-js/mermaid-cli
fi

# Create docs directory if it doesn't exist
mkdir -p docs

# Run the diagram generator
echo "Generating architecture diagrams..."
bun run scripts/generate-architecture-diagram.ts

# Generate timestamp for the documentation
timestamp=$(date +"%Y-%m-%d__%H-%M-%S")

# Create a log file for the update
echo "# Architecture Update Log - ${timestamp}

## Changes Detected
- Generated updated component diagram
- Updated relationship documentation
- Created SVG visualization

## Key Components
- Authentication Module
- State Management
- API Layer
- Security Framework

## Next Steps
1. Review generated diagrams
2. Verify component relationships
3. Update documentation if needed
" > "docs/${timestamp}__log.md"

# Create a new diagram markdown file
echo "# AgriSmart Architecture Diagram - ${timestamp}

## System Overview
\`\`\`mermaid
$(cat docs/architecture.mmd)
\`\`\`

## Component Relationships
$(cat docs/component-relationships.md)

## Notes
- Generated automatically by architecture analyzer
- Review and update manually if needed
- Last updated: ${timestamp}
" > "docs/${timestamp}__diagram.md"

echo "Architecture documentation updated successfully!"
echo "Check the docs directory for generated files."