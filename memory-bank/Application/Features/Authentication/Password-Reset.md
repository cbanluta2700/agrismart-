# Password Reset

This document outlines the password reset process for the AgriSmart platform.

## Process

1.  **Request:** User requests a password reset.
2.  **Email:** User receives an email with a reset link.
3.  **Input:** User provides a new password.
4.  **Validation:** All inputs are validated.
5.  **Update:** The user's password is changed in the database.
6. The user is redirected to the login page.

## Security

*   Temporary reset tokens are used.
*   Tokens have a short expiration time.
* The tokens can be stored in Redis.

## Related

*   [[Authentication]]
*   [[Registration]]
*   [[Login]]
* [[System Context]]
