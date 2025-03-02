# User Login

This document describes the user login process for the AgriSmart platform.

## Process

1.  **Input:** User provides their email and password.
2.  **Validation:** All inputs are validated.
3.  **Authentication:** User's credentials are used to check the database.
4.  **JWT Issuance:** If authentication is successful, a JWT is issued.
5.  **Response:** The JWT is returned to the client.
6. The client will store the JWT.

## Security

*   Passwords are not stored in plain text.
*   JWTs have a short expiration time.
* The API should be protected.
* Refresh tokens are used.

## Related

*   [[Authentication]]
*   [[Registration]]
* [[System Context]]
