# Data Requirements

This document defines the data requirements for the AgriSmart platform. It outlines the types of data that will be stored, how they relate to each other, and any constraints on the data.

## Data Entities

*   **User:**
    *   User ID
    *   Email
    *   Password (hashed)
    *   Username
    *   Role (Guest, Buyer, Seller, AgriSmart Moderator, AgriSmart Admin)
    *   Profile information
    * Other information can be added.
*   **Product:**
    *   Product ID
    *   Name
    *   Description
    *   Price
    *   Quantity
    *   Category
    *   Seller (User ID)
    *   Images
    * Other information can be added.
*   **Order:**
    *   Order ID
    *   Buyer (User ID)
    *   Seller (User ID)
    *   Product (Product ID)
    *   Quantity
    *   Total Price
    *   Status
    *   Date of creation
    *   Date of update
    * Other information can be added.
*   **Payment:**
    *   Payment ID
    *   Order (Order ID)
    *   Amount
    *   Payment Method
    *   Date
    * Other information can be added.
* **Reports**
    * Report ID
    * Content
    * Author (user id)
    * Other information can be added.
* **Comments**
    * Comment ID
    * Content
    * Author (user id)
    * Other information can be added.
* **Forum Posts**
    * Forum Post ID
    * Content
    * Author (user id)
    * Other information can be added.
* **Groups**
    * Group ID
    * Name
    * Description
    * Admin (user ID)
    * Other information can be added.
* **Chat message**:
    * Message ID
    * Sender (User ID)
    * Receiver (User ID)
    * Content
    * Date
*   **Articles:**
    *   Article ID
    *   Title
    *   Content
    *   Author (User ID)
    *   Date
*   **Guides:**
    *   Guide ID
    *   Title
    *   Content
    *   Author (User ID)
    *   Date
*   **Videos:**
    *   Video ID
    *   Title
    *   URL
    *   Author (User ID)
    *   Date
*   **Glossary:**
    *   Term ID
    *   Term
    *   Definition
* **Notifications**:
    * Notification ID
    * Receiver (user id)
    * Content
    * Date

## Data Relationships

*   One User can have multiple Products.
*   One User can have multiple Orders.
*   One Product can have multiple Orders.
*   One Order has one Payment.
* Other relationships will be added.

## Constraints

*   User email must be unique.
*   Passwords must be hashed.
*   Other constraints will be added.

## Related

* [[System Context]]
* [[Functional-Requirements]]
* [[Non-Functional-Requirements]]
* [[Application/Memory Bank/Database/Schema Design|Schema Design]]
* [[Application/Memory Bank/Database/Data-Modeling|Data Modeling]]
