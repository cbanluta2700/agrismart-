# Data Modeling

This document describes the data modeling for the AgriSmart platform.

## Core Entities

*   **User:** Represents a user of the platform.
*   **Product:** Represents a product listed on the marketplace.
*   **Order:** Represents an order placed by a buyer.
*   **Payment:** Represents a payment made for an order.
* **Reports**: Represents a report made by a user.
* **Comments**: Represents a comment made by a user.
* **Forum posts**: Represents a post in the forum.
* **Groups**: Represents a group of users.
* **Chat message**: Represents a message in the chat.
* **Articles**: Represents an article.
* **Guides**: Represents a guide.
* **Videos**: Represents a video.
* **Glossary**: Represents a glossary term.
* **Notifications**: Represents a notification.

## Relationships

*   **User to Product:** One-to-many (a User can have multiple Products).
*   **User to Order:** One-to-many (a User can have multiple Orders).
*   **Product to Order:** One-to-many (a Product can be in multiple Orders).
* **One Order have one Payment.**
* Other relationships will be added.

## Data Dictionary

*   **User:**
    *   `id` (Int, Primary Key)
    *   `email` (String, Unique)
    *   `password` (String)
    * `username` (String)
    * `role`(String)
    *   `createdAt` (DateTime)
    * `updatedAt`(DateTime)
*   **Product:**
    *   `id` (Int, Primary Key)
    *   `name` (String)
    *   `description` (String)
    *   `price` (Float)
    *   `quantity` (Int)
    * `category` (String)
    *   `userId` (Int, Foreign Key to User)
    * `createdAt` (DateTime)
    * `updatedAt`(DateTime)
*   **Order:**
    *   `id` (Int, Primary Key)
    *   `userId` (Int, Foreign Key to User)
    *   `productId` (Int, Foreign Key to Product)
    *   `quantity` (Int)
    * `total`(Float)
    * `createdAt` (DateTime)
    * `updatedAt`(DateTime)
* **Payment**:
    * `id` (Int, Primary Key)
    * `orderId` (Int, Foreign Key to Order, Unique)
    * `amount` (Float)
    * `method` (String)
    * `date` (DateTime)
* Other entities and fields will be added.

## Related

*   [[Schema Design]]
* [[System Context]]
* [[Application/Memory Bank/Architecture Decisions|Architecture Decisions]]
