# Community

## Overview

The Community feature allows users (Buyers, Sellers, and Moderators) to interact with each other through threads and comments.

## Features

### Threads

*   Users can create new threads.
*   Users can edit and delete their own threads.
*   Moderators can delete threads that violate the rules.
*   Threads can be categorized or tagged.

### Comments

*   Users can comment on existing threads.
*   Users can edit and delete their own comments.
*  Moderators can delete comments that violates the rules.

### User Interaction

*   Users can reply to comments.
* Users can create polls.
*   Users can react to comments.
* Users can react to threads.

### Permissions

*   Guests can only view threads and comments.
*   Buyers, Sellers, and Moderators can create, edit, and delete threads and comments.
*   Moderators can delete any thread or comment.
*  Only the user can edit or delete their own content.

## Data Model

*   Threads will have:
    *   Title
    *   Content
    *   Author (User ID)
    *   Creation timestamp
    *   Modification timestamp
    *   Category/tags
*   Comments will have:
    *   Content
    *   Author (User ID)
    *   Creation timestamp
    *   Modification timestamp
    *   Reference to the parent thread.

## API Endpoints

*   (Placeholder for future API documentation links)

## Related Information

*   [[Requirements/User-Roles]]
*   [[System Context#Community]]
*   [[Implementation Insights]]
* [[Active State]]
