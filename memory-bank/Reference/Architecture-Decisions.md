# Architecture Decisions

This document records significant architectural decisions made for the AgriSmart platform. Each entry includes the decision, the context, the rationale, and the consequences.

## Decisions

### Authentication System

*   **Decision:** Use JWT (JSON Web Tokens) for authentication.
*   **Context:** Need a secure and scalable way to authenticate users and protect API endpoints.
*   **Rationale:** JWTs are stateless, widely adopted, and can be easily integrated with our chosen technologies.
*   **Consequences:**
    *   Requires careful management of token expiration and refresh.
    *   Adds complexity to the initial setup.
* **Decision**: Use `NextAuth.js` for social login and email/password management.
* **Context**: Need a secure and easy way to handle social login.
* **Rationale**: `NextAuth.js` support different providers.
* **Consequences**: We are limited to the provider supported by `NextAuth.js`.
* **Decision**: Use `bcrypt` for password hashing.
* **Context**: Need a secure way to store password.
* **Rationale**: `bcrypt` is a strong hashing algorithm.
* **Consequences**: `bcrypt` is slower than other hashing algorithms.
* **Decision**: Use `Zod` for data validation.
* **Context**: Need a way to validate the user inputs.
* **Rationale**: `Zod` is easy to use.
* **Consequences**: We need to add the validation on the client and the server side.

### Database

*   **Decision:** Use PostgreSQL as the primary database.
*   **Context:** Need a relational database to manage complex data relationships.
*   **Rationale:** PostgreSQL is robust, scalable, and supports advanced features.
*   **Consequences:**
    *   Requires more setup and maintenance than NoSQL options.
    * We are limited to relational database.
*   **Decision**: Use Prisma as ORM.
*   **Context:** Need to interact with the database.
*   **Rationale**: Prisma is easy to use.
*   **Consequences**: We are limited to the database supported by prisma.

### Real time chat

*   **Decision**: Use Socket.IO and Websockets.
*   **Context**: Need to implement real time chat.
*   **Rationale**: Socket.IO and Websockets allow real time communication.
*   **Consequences**: We need to manage the connections.
* **Decision**: Use Redis to store the messages.
* **Context**: Need a fast way to store and retrieve the messages.
* **Rationale**: Redis is a fast in memory database.
* **Consequences**: We need to manage the redis instance.

### Payment Gateway

* **Decision:** Use Stripe as payment gateway.
* **Context:** Need to process payment.
* **Rationale:** Stripe is popular, easy to use and secure.
* **Consequences:** We are limited to the features provided by stripe.

### Frontend

*   **Decision:** Use Next.js as the frontend framework.
*   **Context:** Need a modern, performant, and SEO-friendly framework.
*   **Rationale:** Next.js offers server-side rendering, static site generation, and a great developer experience.
*   **Consequences:**
    *   Adds complexity compared to a simple client-side app.
    * We are limited to the features provided by Next.js.
* **Decision**: Use RadixUI for the UI.
* **Context**: Need a headless UI library.
* **Rationale**: RadixUI is headless and accessible.
* **Consequences**: We need to add CSS to make it look good.
* **Decision**: Use TailwindCSS for styling.
* **Context**: Need a way to style the app.
* **Rationale**: TailwindCSS is easy to use.
* **Consequences**: We need to follow the tailwindCSS conventions.
* **Decision**: Use Zustand for state management.
* **Context**: Need a simple way to manage the state.
* **Rationale**: Zustand is easy to use and fast.
* **Consequences**: We are limited to the feature provided by Zustand.
* **Decision**: Use TanStack Query for data fetching.
* **Context**: Need a way to fetch data from the server.
* **Rationale**: TanStack Query is easy to use and powerful.
* **Consequences**: We are limited to the feature provided by TanStack Query.

## Related

* [[System Context]]
* [[Active State]]
