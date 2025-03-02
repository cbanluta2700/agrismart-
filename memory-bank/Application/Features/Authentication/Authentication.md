# Authentication System Overview

This document outlines the authentication system for the AgriSmart platform, detailing the processes for user registration, login, password management, and social login integration.

## Core Features

*   **User Registration:** Allowing new users to create accounts.
*   **User Login:** Securely authenticating existing users.
*   **Password Management:** Features for password reset and modification.
*   **Social Logins:** Integration with third-party social login providers (e.g., Google, Facebook).
* **Mobile Number Verification:** Adding a layer of security by verifying mobile numbers.
* **Role-Based Access Control:** Users will be assigned to roles, to have different access.

## Technologies

*   **JWT (JSON Web Tokens):** For secure token-based authentication.
*   **NextAuth.js:** For social login and email/password management.
*   **bcrypt:** For password hashing and security.
* **Zod**: For data validation.

## Workflow

1. Users can register using an email and password or through social login.
2. Users can log in using their email and password or through social login.
3. Upon successful login, a JWT is issued to the user.
4. The JWT is used for subsequent API requests.
5. The JWT has a short expiry time and is refreshed automatically.
6. Password reset should be implemented.
7. Mobile number should be verified.
8. Roles should be implemented.
9. The different providers for social login are to be determined.

## Related

*   [[Registration]]
*   [[Login]]
*   [[Password-Reset]]
*   [[Social-Login]]
* [[Authorization]]
* [[System Context]]
