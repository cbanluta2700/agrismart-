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
    * **Explanation**:
      * **Decision**: Use JWT (JSON Web Tokens).
      * **Context**: The need for a secure and scalable way to authenticate users. JWTs are stateless, which make them a good choice for APIs.
      * **Rationale**: JWT are widely adopted, and are easily integrated with the technologies we have chosen.
      * **Consequences**: Requires careful management of token expiration and refresh. It also add complexity to the setup.
* **Decision**: Use `NextAuth.js` for social login and email/password management.
* **Context**: Need a secure and easy way to handle social login.
* **Rationale**: `NextAuth.js` support different providers.
* **Consequences**: We are limited to the provider supported by `NextAuth.js`.
* **Explanation**:
  * **Decision**: Use `NextAuth.js`.
  * **Context**: The need to handle the social login in a secure way.
  * **Rationale**: `NextAuth.js` is a good way to handle social login and it also support email/password login.
  * **Consequences**: We are limited to the providers supported by `NextAuth.js`.
* **Decision**: Use `bcrypt` for password hashing.
* **Context**: Need a secure way to store password.
* **Rationale**: `bcrypt` is a strong hashing algorithm.
* **Consequences**: `bcrypt` is slower than other hashing algorithms.
* **Explanation**:
    * **Decision**: Use `bcrypt`.
    * **Context**: The need to store the passwords in a secure way.
    * **Rationale**: `bcrypt` is a strong algorithm.
    * **Consequences**: `bcrypt` is slower than other algorithms.
* **Decision**: Use `Zod` for data validation.
* **Context**: Need a way to validate the user inputs.
* **Rationale**: `Zod` is easy to use.
* **Consequences**: We need to add the validation on the client and the server side.
* **Explanation**:
     * **Decision**: Use `Zod`.
    * **Context**: The need to validate the user inputs.
    * **Rationale**: `Zod` is easy to use and is powerful.
    * **Consequences**: The validation should be made on the client and the server side.

### Database

*   **Decision:** Use PostgreSQL as the primary database.
*   **Context:** Need a relational database to manage complex data relationships.
*   **Rationale:** PostgreSQL is robust, scalable, and supports advanced features.
*   **Consequences:**
    *   Requires more setup and maintenance than NoSQL options.
    *   We are limited to relational database.
* **Explanation**:
     * **Decision**: Use PostgreSQL as the primary database.
     * **Context**: The need to have a relational database to handle the data.
     * **Rationale**: PostgreSQL is a solid and scalable choice for relational data. It offers good data integrity and advanced features.
     * **Consequences**: PostgreSQL requires more setup than NoSQL databases. We are limited to relational data.
*   **Decision**: Use Prisma as ORM.
*   **Context:** Need to interact with the database.
*   **Rationale**: Prisma is easy to use.
*   **Consequences**: We are limited to the database supported by prisma.
* **Explanation**:
     * **Decision**: Use Prisma as ORM.
     * **Context**: The need to have an ORM to interact with the database.
     * **Rationale**: Prisma is easy to use and type safe.
     * **Consequences**: We are limited to the databases that are supported by Prisma.

### Real time chat

*   **Decision**: Use Socket.IO and Websockets.
*   **Context**: Need to implement real time chat.
*   **Rationale**: Socket.IO and Websockets allow real time communication.
*   **Consequences**: We need to manage the connections.
* **Explanation**:
     * **Decision**: Use Socket.IO and Websockets.
     * **Context**: The need to implement real time chat in the app.
     * **Rationale**: Socket.IO and Websockets allow to have real time communication.
     * **Consequences**: We need to manage the socket connections.
* **Decision**: Use Redis to store the messages.
* **Context**: Need a fast way to store and retrieve the messages.
*   **Rationale**: Redis is a fast in memory database.
*   **Consequences**: We need to manage the redis instance.
* **Explanation**:
     * **Decision**: Use Redis to store the messages.
     * **Context**: The need to store the messages in a fast way.
     * **Rationale**: Redis is a very fast in-memory database.
     * **Consequences**: We need to manage a Redis instance.

### Payment Gateway

* **Decision:** Use Stripe as payment gateway.
* **Context:** Need to process payment.
* **Rationale:** Stripe is popular, easy to use and secure.
* **Consequences:** We are limited to the features provided by stripe.
* **Explanation**:
    * **Decision**: Use Stripe as payment gateway.
    * **Context**: The need to process payments securely.
    * **Rationale**: Stripe is very popular, secure, and easy to use.
    * **Consequences**: We are limited to the feature provided by Stripe.

### Frontend

*   **Decision:** Use Next.js as the frontend framework.
*   **Context:** Need a modern, performant, and SEO-friendly framework.
*   **Rationale:** Next.js offers server-side rendering, static site generation, and a great developer experience.
*   **Consequences:**
    *   Adds complexity compared to a simple client-side app.
    * We are limited to the features provided by Next.js.
* **Explanation**:
    * **Decision**: Use Next.js as the frontend framework.
    * **Context**: The need for a modern, performant, and SEO-friendly frontend.
    * **Rationale**: Next.js allows to do server-side rendering and static site generation.
    * **Consequences**: The frontend can be more complex than a simple client-side app. We are limited to the features provided by Next.js.
* **Decision**: Use RadixUI for the UI.
* **Context**: Need a headless UI library.
* **Rationale**: RadixUI is headless and accessible.
* **Consequences**: We need to add CSS to make it look good.
* **Explanation**:
   * **Decision**: Use RadixUI for the UI.
   * **Context**: The need for a headless UI library.
   * **Rationale**: RadixUI is headless and accessible.
   * **Consequences**: We need to add style to make it look good.
* **Decision**: Use TailwindCSS for styling.
* **Context**: Need a way to style the app.
* **Rationale**: TailwindCSS is easy to use.
* **Consequences**: We need to follow the tailwindCSS conventions.
* **Explanation**:
   * **Decision**: Use TailwindCSS for styling.
   * **Context**: The need to style the app.
   * **Rationale**: TailwindCSS is very easy to use and fast.
   * **Consequences**: We need to follow the TailwindCSS conventions.
* **Decision**: Use Zustand for state management.
* **Context**: Need a simple way to manage the state.
* **Rationale**: Zustand is easy to use and fast.
* **Consequences**: We are limited to the feature provided by Zustand.
* **Explanation**:
    * **Decision**: Use Zustand for state management.
    * **Context**: The need to manage the state.
    * **Rationale**: Zustand is fast and simple.
    * **Consequences**: We are limited to the feature provided by Zustand.
* **Decision**: Use TanStack Query for data fetching.
* **Context**: Need a way to fetch data from the server.
* **Rationale**: TanStack Query is easy to use and powerful.
* **Consequences**: We are limited to the feature provided by TanStack Query.
* **Explanation**:
    * **Decision**: Use TanStack Query for data fetching.
    * **Context**: The need to fetch data from the server.
    * **Rationale**: TanStack Query is easy to use and powerful.
    * **Consequences**: We are limited to the features provided by TanStack Query.

### Analytics System Design

#### Decision
Implement a comprehensive analytics system to track user interactions and forum usage patterns.

#### Context
To improve the AgriSmart platform, we needed insights into how users interact with the forum features, which content performs best, and what moderation actions are taken. This data helps platform administrators make informed decisions about feature development and community management.

#### Solution
We've implemented a layered analytics system with the following components:

1. **Data Collection**
   - Server-side middleware to capture page views and navigation patterns
   - Client-side hooks to track user interactions (posts, comments, likes, etc.)
   - Integration points in key components like reporting and moderation tools

2. **Data Storage**
   - Created an AnalyticsEvent model in the database to store all tracked events
   - Designed a flexible schema that captures event type, affected entities, user info, and metadata
   - Implemented indexing strategies to optimize analytics queries

3. **Data Processing and Visualization**
   - Built a dedicated analytics service for aggregating and processing metrics
   - Created an admin dashboard with charts and statistics on user engagement
   - Implemented time-based filtering for different analysis periods (day, week, month, year)

#### Alternatives Considered
1. **Third-party analytics services**: We considered using external services like Google Analytics or Mixpanel but decided to build a custom solution to maintain full control over user data and integrate deeply with our domain models.
   
2. **Event sourcing architecture**: We evaluated implementing a more complex event sourcing approach but decided that a simpler event tracking model would meet our current needs while being easier to maintain.

#### Consequences
- **Positive**: The system provides valuable insights into platform usage and helps identify popular content and features.
- **Positive**: Administrators can make data-driven decisions about platform improvements.
- **Negative**: Introduces additional database queries and processing overhead.
- **Negative**: Requires maintenance of analytics-specific code and dashboard components.

#### Mitigation Strategies
- Implemented silent failure for analytics to ensure user experience is not affected if tracking fails
- Added database indexes to optimize query performance
- Designed the system to batch events where possible to reduce database load

### Analytics Testing Strategy

* **Decision**: Implement a direct mocking approach for testing analytics.
* **Context**: Need to verify that analytics events are correctly tracked without affecting production data.
* **Rationale**: Direct mocking of the analytics service provides a clean, reliable way to test event tracking without complex dependencies.
* **Consequences**: Tests are simpler to maintain but require manual updates if the analytics service interface changes.
* **Explanation**:
  * **Decision**: Instead of using complex test utilities, we implemented a direct mock replacement of the `trackEvent` method for testing.
  * **Context**: Initial testing with utility functions was unreliable and difficult to debug.
  * **Rationale**: Direct mocking allows for precise control over the test environment and clearer visibility into what's happening during tests.
  * **Consequences**: 
    * Simplified test code that's easier to understand and maintain
    * More reliable test results with clear debugging information
    * Need to update tests when analytics service interface changes
    * Better isolation from production systems

### Resources Section Implementation

#### Decision
Implement the Resources Section using Vercel SDK and Content Management System (CMS) integration.

#### Context
Need to create a scalable and maintainable system for managing various types of content including articles, guides, videos, and glossary terms. The system must support content creation, editing, and delivery with optimal performance.

#### Solution
1. **Vercel Integration**
   - Utilize Vercel SDK for content deployment and delivery
   - Implement edge caching for improved performance
   - Use Vercel's image optimization for media content
   - Leverage Vercel's serverless functions for dynamic content

2. **Content Management**
   - Create a structured content model for different resource types
   - Implement versioning and content scheduling
   - Support rich media integration (images, videos, embeds)
   - Enable content categorization and tagging

3. **Performance Optimization**
   - Implement static generation for content pages
   - Use incremental static regeneration for dynamic content
   - Optimize media delivery through Vercel's CDN
   - Implement client-side caching strategies

#### Consequences
- **Positive**: Improved content delivery performance through Vercel's infrastructure
- **Positive**: Simplified deployment and content updates
- **Negative**: Dependency on Vercel's platform
- **Negative**: Learning curve for content creators

#### Implementation Strategy
1. Set up Vercel project integration
2. Create content models and schemas
3. Implement content management interfaces
4. Set up automated deployment workflows

### Moderation Analytics System

#### Decision
Implement a comprehensive moderation analytics system using Vercel SDK and KV store for efficient caching and performance monitoring.

#### Context
Need to create a robust system for tracking, analyzing, and visualizing moderation activities on the platform. The system should provide insights into moderation efficiency, content quality trends, and moderator performance while maintaining high performance.

#### Solution
1. **Vercel SDK Integration**
   - Utilize Vercel SDK for analytics tracking and data visualization
   - Implement KV store for efficient caching of analytics data
   - Configure edge functions with optimized memory settings
   - Set up daily cron job for maintenance tasks using Vercel's cron functionality

2. **Caching Strategy**
   - Implement stale-while-revalidate pattern for moderation analytics data
   - Create tiered caching system with short, medium, and long-term expiration policies
   - Develop cache invalidation triggers for content updates
   - Configure edge caching headers for optimal delivery

3. **Analytics Components**
   - Build moderation analytics dashboard with data visualization
   - Implement period-based filtering (24h, 7d, 30d, 90d)
   - Track moderator performance metrics
   - Monitor content quality trends

#### Consequences
- **Positive**: Significantly improved analytics data access performance
- **Positive**: Reduced database load through efficient caching
- **Positive**: Better insights into moderation activities and performance
- **Negative**: Increased complexity in cache management
- **Negative**: Dependency on Vercel's infrastructure

#### Implementation Strategy
1. Create cache control utilities for moderation-specific data
2. Enhance API endpoints to leverage caching system
3. Configure Vercel cron job for maintenance tasks
4. Update analytics visualization components

#### AI-Powered Moderation Implementation

**Decision:** Implement an AI-powered content moderation system using the Vercel AI SDK and OpenAI's moderation capabilities.

**Context:**
- Manual moderation is time-consuming and cannot scale with platform growth
- User-generated content needs to be screened for policy violations in real-time
- Moderators need assistance to handle increasing content volume
- A consistent, unbiased approach to content screening is required
- Performance considerations are critical for a seamless user experience

**Solution:**
- Create a middleware layer using the Vercel AI SDK for content moderation
- Implement pre-generation screening to prevent inappropriate prompts
- Add post-generation validation to ensure AI outputs meet guidelines
- Develop a React hook for easy frontend integration
- Build UI components for displaying moderation status and actions
- Integrate with existing analytics system for comprehensive tracking

**Consequences:**
- **Positive**: Reduced moderation workload for human moderators
- **Positive**: Real-time content screening without performance degradation
- **Positive**: Consistent application of moderation policies
- **Positive**: Enhanced user safety through proactive content screening
- **Negative**: Potential for false positives/negatives in AI moderation
- **Negative**: Dependency on third-party AI services (OpenAI)
- **Negative**: Additional complexity in request/response lifecycle

**Implementation Strategy:**
- Use a middleware pattern with the Vercel AI SDK for seamless integration
- Implement dedicated API endpoints for content moderation
- Create React hooks and components for frontend integration
- Add strict rate limiting to prevent abuse of AI services
- Implement fallback mechanisms for when AI services are unavailable
- Track all AI moderation decisions for continuous improvement
- Ensure human review capabilities for edge cases and appeals

## Related

* [[System Context]]
* [[Active State]]
