# Functional Requirements

This document details the functional requirements for the AgriSmart platform. Functional requirements describe the core features and functionalities of the platform.

## Core Features

*   **Authentication:** User registration, login, and password management.
*   **Community:** Forums, groups, and user profiles.
*   **Marketplace:** Product listings, search, ordering, payments, and shipping.
*   **Resources:** Articles, guides, videos, and glossary.
* **Reporting**: Allow users to do reports.
* **Chat**: Allow users to communicate in real time.
* **Notifications**: Notify users when something occurs.
* **Dashboard**: Display information for the users.
* **Chatbot**: Allow users to interact with a chatbot.

## Detailed Requirements

*   **User Registration:**
    *   Users can register with an email and password.
    *   Users can register with social login.
    *   The system validates the user inputs.
*   **User Login:**
    *   Users can log in with an email and password.
    *   Users can log in with social login.
    *   The system authenticates the user's credentials.
    * The user should receive a JWT if the login is successfull.
*   **User Roles:**
    *   The system should support different user roles (Guest, Buyer, Seller, AgriSmart Moderator, AgriSmart Admin).
    *   Each user role has a set of privileges.
*   **Product Listings:**
    *   Sellers can create product listings.
    *   Listings include product name, description, price, quantity, images, etc.
    *   Products are organized into categories.
*   **Product Search:**
    *   Buyers can search for products using keywords.
    *   Buyers can filter products by category, price, location, etc.
    *   Buyers can sort products by various criteria.
*   **Orders:**
    *   Buyers can place orders.
    *   Buyers can track their orders.
    *   Sellers can manage their orders.
* **Payments**:
    * Buyers should be able to pay for their orders.
    * Sellers should receive the payment.
* **Reporting**:
    * User should be able to do reports.
    * AgriSmart Moderator and Admin should be able to manage the reports.
* **Chat**:
    * Users should be able to chat in real time.
* **Notifications**:
    * Users should receive notifications.
* **Dashboard**:
    * Users should have a dashboard.
* **Chatbot**:
    * Users should be able to interact with a chatbot.

## Related

* [[System Context]]
* [[User-Roles]]
* [[User-Stories]]
* [[Non-Functional-Requirements]]
* [[Data-Requirements]]
