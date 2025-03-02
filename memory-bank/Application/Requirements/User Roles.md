# User Roles

## Overview

This document defines the different user roles within the AgriSmart platform and their respective permissions.

## Guest

### Description

*   A user who has not logged in or created an account.
*   They have limited access to the platform's features.

### Permissions

*   **View:**
    *   Homepage
    *   About page
    *   Contact page
    *   Resources (guides, research, tutorials, how-tos)
    *   Community threads (view only)
    *   Marketplace products (view only)
*   **Limitations:**
    *   Cannot interact with the Community (post, comment, like, create threads, polls, react).
    *   Cannot purchase products in the Marketplace.
    * Cannot use the Chat.
    * Cannot use the Report system.
*   **Trigger Login:**
    *   Any attempt to interact (comment, like, add to cart, contact a seller) will trigger a prompt to log in or sign up.

## Buyer

### Description

*   A registered user who can purchase products in the Marketplace and fully participate in the Community.

### Permissions

*   **View:**
    *   All pages accessible to Guests.
    *   Dashboard (marketplace, community, notifications).
*   **Marketplace:**
    *   Browse and search products.
    *   View product details.
    *   Add products to cart.
    *   Purchase products.
    * Contact sellers.
*   **Community:**
    *   View, create, edit, and delete their own threads.
    *   Comment on threads.
    *   Like, create polls and react to threads and comments.
*  **Chat**:
   * Access the Chat
   * Send message to other users.
* **Reports**:
  * Send reports.
* **Account**:
   * Edit their profile.
*   **Limitations:**
    *   Cannot list products in the Marketplace.
    *   Cannot manage resources.

## Seller

### Description

*   A registered user who has been upgraded from a Buyer and approved by a Moderator. They can list products for sale and purchase products in the Marketplace and participate in the community.

### Permissions

*   All permissions of a Buyer.
*   **Marketplace:**
    *   List products for sale.
    *   Manage their own product listings (add, edit, delete).
* **Limitations**:
  * Cannot manage resources.

## AgriSmart Moderator

### Description

*   A user with administrative privileges to manage content and user accounts.

### Permissions

*   All permissions of a Buyer.
*   **Marketplace:**
    *   Approve or reject product listings.
    *   Delete product listings.
*   **Community:**
    *   Delete threads that violate the rules.
    *   Delete comments that violate the rules.
*   **User Management:**
    *   Approve account upgrades from Buyer to Seller.
* **Resources**:
  * Add new resources.
  * Edit existing resources.
  * Delete resources.
* **Chat**:
   * Access the Chat
   * Send message to other users.
* **Report**:
   * Manage all the reports.
*  **Limitations**:
   * Cannot update the application.
   * Cannot manage the application.

## AgriSmart Admin

### Description

*   The superuser with full control over the application.

### Permissions

*   All permissions of a Moderator.
*   **Application Management:**
    *   Update the application's functionalities.
    *   Monitor application performance.
    *  Manage the application
    * Manage all the users.

## Related Information

*   [[Authentication]]
*   [[Marketplace]]
*   [[Community]]
* [[Resources]]
* [[Chat]]
* [[Reporting]]
* [[System Context]]
