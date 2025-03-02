# Social Login

This document describes the social login integration for the AgriSmart platform.

## Process

1.  **Provider Selection:** User selects their social login provider.
2.  **Authentication:** User authenticates with the provider.
3.  **JWT Issuance:** If authentication is successful, a JWT is issued.
4.  **Response:** The JWT is returned to the client.

## Providers

*   Google
*   Facebook
* Other providers can be added.

## Security

*   The provider authentication is used.
*   JWTs have a short expiration time.

## Related

*   [[Authentication]]
*   [[Registration]]
*   [[Login]]
* [[System Context]]
