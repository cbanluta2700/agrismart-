# Reporting

## Overview

The Reporting feature allows users to report issues, inappropriate content, or problems to the AgriSmart moderators.

## Features

* **User Reporting**: User can report other user.
* **Content Reporting**: User can report a comment or a thread.
*   **Report Creation:**
    *   Users can submit a report.
    *   Reports include:
        *   Description of the issue
        *   User who is being reported (if applicable)
        * Content that is being reported (if applicable)
        *   Link to the reported content (if applicable)
        *   Timestamp
    *   The report can include:
      * Inappropriate content
      * Spam
      * Harassment
      * Illegal activity
      * Other

*   **Moderator Management:**
    *   Moderators can view and manage reports.
    *   Moderators can resolve reports.
    *   Moderators can take action (e.g., delete content, ban users).

## User Access

*   All registered users (Buyers, Sellers, Moderators, and Admin) can submit reports.
*   Moderators can view and manage reports.

## Data Model

*   Reports will have:
    *   Reporter (User ID)
    *   Reported User (User ID, if applicable)
    *   Reported Content (Comment ID, Thread ID, if applicable)
    *   Description of the issue
    *   Status (open, resolved, closed)
    *   Timestamp
    *   Resolution (if resolved)

## API Endpoints

*   (Placeholder for future API documentation links)

## Related Information

*   [[Requirements/User-Roles]]
*   [[System Context#Report]]
*   [[Implementation Insights]]
* [[Active State]]

