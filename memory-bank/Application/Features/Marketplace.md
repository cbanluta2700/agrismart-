# Marketplace

## Overview

The Marketplace feature allows users (Buyers and Sellers) to list and purchase agricultural products.

## Features

### Product Listings

*   Sellers can list products for sale.
*   Product listings include:
    *   Product name
    *   Description
    *   Price
    *   Quantity available
    *   Images
    *   Seller information
*   Product listings must be approved by a Moderator before they are visible to all users.
* The product list include a filtering system.
* The product list have a search input.

### Product Details

*   Users can view detailed information about a product.
*   The product details include:
    * All the product information
    * Seller Information.
    * Link to contact the seller.
    * Reviews

### Purchase Flow

*   Buyers can add products to a cart.
*   Buyers can proceed to purchase.
*   Payment integration will be added later.

### Seller Management

*   Sellers can manage their listings (add, edit, delete).
*   Moderators can approve or reject product listings.
*   Moderators can delete products.
*   Sellers must first upgrade their account and be approved by a moderator.

## Permissions

*   Guests can browse but not purchase.
*   Buyers can browse and purchase.
*   Sellers can list and manage products but cannot purchase.
*   Moderators can approve/reject/delete products.

## Data Model

*   Products will have:
    *   Name
    *   Description
    *   Price
    *   Quantity
    *   Images (links to image storage)
    *   Seller (User ID)
    *   Approval status (pending, approved, rejected)
    *   Creation timestamp
    *   Modification timestamp

## API Endpoints

*   (Placeholder for future API documentation links)

## Related Information

*   [[Requirements/User-Roles]]
*   [[System Context#Marketplace]]
*   [[Implementation Insights]]
* [[Active State]]

