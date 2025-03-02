# AgriSmart Architecture Documentation

## Overview
This directory contains automatically generated and manually maintained architecture documentation for the AgriSmart platform. The documentation includes component diagrams, relationship maps, and implementation details.

## Structure
```
docs/
├── architecture.mmd              # Main Mermaid diagram source
├── architecture.svg             # Generated SVG diagram
├── component-relationships.md   # Component dependency documentation
├── YYYY-MM-DD__HH-MM-SS__log.md     # Update logs
└── YYYY-MM-DD__HH-MM-SS__diagram.md  # Point-in-time diagrams
```

## Maintaining Documentation

### Automatic Updates
The architecture documentation is automatically updated when you run:
```bash
./scripts/update-architecture.sh
```

This will:
1. Generate new architecture diagrams
2. Create relationship documentation
3. Save a timestamped snapshot
4. Update the main architecture files

### Manual Updates
For manual updates:
1. Edit the corresponding documentation files
2. Run the update script to ensure consistency
3. Commit both the generated and manual changes

## Component Organization

### Core Components
- **Authentication Module**: User management and security
- **State Management**: Global and local state handling
- **API Layer**: Backend communication
- **UI Components**: Reusable interface elements

### Feature Modules
- Authentication & Authorization
- Marketplace
- Community Features
- Dashboard

### Infrastructure
- Security Framework
- Session Management
- Email System
- Data Storage

## Relationships and Dependencies

### Key Patterns
1. **State Flow**
   - Recoil for complex state
   - Zustand for simple state
   - React Context for theme/auth

2. **Data Flow**
   - API Client → Hooks → Components
   - State Updates → UI Updates
   - Event Handlers → Actions

3. **Security Flow**
   - JWT Authentication
   - Role-Based Access Control
   - Session Management

## Best Practices

### Adding New Components
1. Place in appropriate directory
2. Update imports/exports
3. Run architecture update
4. Review generated documentation

### Modifying Relationships
1. Update component dependencies
2. Run architecture update
3. Verify relationship diagram
4. Update manual documentation if needed

### Code Organization
1. Follow established patterns
2. Maintain clean dependencies
3. Document significant changes
4. Keep modules focused

## Monitoring and Maintenance

### Regular Tasks
1. Run architecture updates weekly
2. Review component relationships
3. Clean up unused dependencies
4. Update documentation for major changes

### Quality Checks
1. Verify generated diagrams
2. Check for circular dependencies
3. Review component organization
4. Validate security patterns

## Contributing

### Documentation Updates
1. Run the update script
2. Review generated files
3. Add manual annotations if needed
4. Commit all changes together

### Architecture Changes
1. Discuss major changes
2. Update implementation
3. Run documentation update
4. Review and verify changes

## Troubleshooting

### Common Issues
1. **Missing Dependencies**
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

2. **Diagram Generation Fails**
   - Verify Mermaid syntax
   - Check file permissions
   - Review component structure

3. **Relationship Errors**
   - Check import/export statements
   - Verify file paths
   - Review circular dependencies

### Support
For issues with architecture documentation:
1. Check existing logs
2. Review recent changes
3. Update dependencies
4. Run with debug flags