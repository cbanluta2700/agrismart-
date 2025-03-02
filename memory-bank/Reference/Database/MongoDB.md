# MongoDB

This document contains notes and information about MongoDB, a NoSQL document database that was considered for the AgriSmart platform.

## Core Concepts

*   **Document-Oriented:** Data is stored in JSON-like documents.
*   **Schema-less:** Documents in a collection can have different structures.
*   **Scalability:** Horizontally scalable.
*   **Flexible:** Easy to change the data structure.
* **Fast**: Fast for reading and writing.

## Use Cases

*   Storing large amounts of unstructured data.
*   Rapid development and iteration.

## Considerations

*   **Transactions:** ACID transactions are not fully supported.
*   **Joins:** Joins are not as efficient as in relational databases.
* **Data Integrity**: Data integrity can be more difficult to maintain.
* **Learning Curve**: MongoDB has a learning curve.

## Resources

*   [MongoDB Documentation](https://www.mongodb.com/docs/)
*   [MongoDB GitHub](https://github.com/mongodb/mongo)

## Related

*   [[PostgreSQL]]
*   [[Prisma]]
* [[System Context]]
* [[Application/Memory Bank/Architecture Decisions|Architecture Decisions]]
* [[Application/Memory Bank/Database/Data-Modeling|Data Modeling]]
* [[Application/Memory Bank/Database/Schema Design|Schema Design]]
