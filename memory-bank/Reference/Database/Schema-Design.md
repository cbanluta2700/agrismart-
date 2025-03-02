# Database Schema Design

This document provides the database schema design for the AgriSmart platform using Prisma.

## Core Principles

*   **Relational:** The database is relational, using tables, rows, and columns.
*   **Normalization:** The database is normalized to reduce redundancy.
*   **ACID:** The database supports ACID transactions.

## Entities

*   **User:** Stores user information.
*   **Product:** Stores product information.
*   **Order:** Stores order information.
*   **Payment:** Stores payment information.
* **Reports**
* **Comments**
* **Forum Posts**
* **Groups**
* **Chat messages**
* **Articles**
* **Guides**
* **Videos**
* **Glossary**
* **Notifications**

## Relationships

*   **One-to-Many:** One User can have many Products, Orders, Reports, Comments, Forum Posts.
*   **Many-to-Many:** Many Users can be in many Groups.
*   **One-to-One**: One Order have one payment.
* Other relationship can be added.

## Example Schema (Prisma)

```prisma
//schema.prisma

//example schema
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  password  String
  username  String
  role      String  @default("BUYER") // GUEST, BUYER, SELLER, AGRI_SMART_MODERATOR, AGRI_SMART_ADMIN
  products  Product[]
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  price       Float
  quantity    Int
  category    String
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  orders      Order[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Order {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  productId Int
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int
  total     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  payment   Payment?
}

model Payment {
  id        Int      @id @default(autoincrement())
  orderId   Int      @unique
  order     Order    @relation(fields: [orderId], references: [id])
  amount    Float
  method    String
  date      DateTime @default(now())
}
```

## Related

*   [[Data-Modeling]]
*   [[Prisma]]
*   [[PostgreSQL]]
*   [[MongoDB]]
* [[System Context]]
* [[Application/Memory Bank/Architecture Decisions|Architecture Decisions]]
