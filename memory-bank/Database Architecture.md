# Database Architecture

## Overview

AgriSmart uses a hybrid database architecture to optimize performance, scalability, and data integrity across different components of the platform. This document outlines the current database architecture and the rationale behind design decisions.

## Primary Database: PostgreSQL

PostgreSQL serves as the primary database for the AgriSmart platform, handling:

- User accounts and authentication
- Farm data and profiles
- Community content and forums
- Moderation queue and history
- Usage metrics and analytics

### Benefits of PostgreSQL for Core Data

1. **ACID Compliance**: Critical for transactional data like user accounts and financial information
2. **Relational Structure**: Well-suited for complex relationships between entities
3. **Query Capabilities**: Powerful querying for complex reports and analytics
4. **Mature Ecosystem**: Established tooling and support

### Access Pattern

PostgreSQL is accessed through Prisma ORM, which provides:
- Type-safe database access
- Migration management
- Relation handling
- Connection pooling

## Secondary Database: MongoDB

MongoDB is used for specific high-volume, append-heavy data:

- Chat conversations and messages
- Conversation metadata
- Chat context information

### Benefits of MongoDB for Chat Data

1. **Document Structure**: Flexible schema for evolving message formats
2. **Write Performance**: Optimized for high-volume append operations
3. **Scalability**: Horizontal scaling for growing conversation data
4. **Query Performance**: Fast retrieval of entire conversations

### Access Pattern

MongoDB is accessed through a custom client implementation that provides:
- Connection pooling
- Index management
- CRUD operations for conversations
- Proper error handling

## Database Interaction Models

### Cross-Database References

- User ID serves as the primary cross-reference between databases
- Conversation ID links usage metrics (PostgreSQL) with conversation content (MongoDB)

### Data Flow

1. User authenticates via PostgreSQL (NextAuth)
2. Chat interface retrieves user context from PostgreSQL
3. Conversations are stored in MongoDB
4. Usage metrics are recorded in PostgreSQL for analytics

## Schema Design Principles

### PostgreSQL

1. **Explicit Relation Naming**: All relationships between models use explicit relation names
2. **Proper Indexing**: Foreign keys and frequently queried fields are indexed
3. **Soft Deletion**: Critical data uses soft deletion (status flags) rather than hard deletes
4. **Normalization**: Data is properly normalized to minimize redundancy

### MongoDB

1. **Embedded Documents**: Related data is embedded for efficient retrieval
2. **Strategic Indexing**: Indexes on userId and updatedAt for performance
3. **Document Size Management**: Large conversations are paginated if needed
4. **Time-series Organization**: Conversations are organized chronologically

## Monitoring and Maintenance

1. **Performance Monitoring**: Both databases are monitored for query performance
2. **Backup Strategy**: Regular backups with point-in-time recovery
3. **Index Optimization**: Indexes are reviewed and optimized periodically
4. **Scaling Plan**: Vertical scaling for PostgreSQL, horizontal for MongoDB

## Future Considerations

1. **Caching Layer**: Redis caching for frequently accessed data
2. **Read Replicas**: For high-read scenarios in PostgreSQL
3. **Sharding**: MongoDB sharding for very large chat datasets
4. **Analytics Database**: Separate analytics database for complex reporting
