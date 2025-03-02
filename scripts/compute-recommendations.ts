/**
 * Compute Product Recommendations Script
 * 
 * This script analyzes product data, user behavior, and purchase history
 * to generate product recommendations. It's designed to be run periodically
 * (e.g., daily or weekly) via a scheduled job.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function computeRecommendations() {
  console.log('Starting recommendation computation...');
  const startTime = Date.now();

  try {
    // 1. Compute similar product recommendations
    await computeSimilarProducts();

    // 2. Compute "also bought" recommendations
    await computeAlsoBoughtProducts();

    // 3. Update seasonal products if needed
    await updateSeasonalProducts();

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Recommendation computation completed in ${duration.toFixed(2)} seconds`);
  } catch (error) {
    console.error('Error computing recommendations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Compute similar products based on category and price similarity
 */
async function computeSimilarProducts() {
  console.log('Computing similar products...');
  
  // Get all active products
  const products = await prisma.marketplaceProduct.findMany({
    where: { status: 'active' },
    select: { id: true, price: true, categoryId: true },
  });
  
  // Reset existing similar recommendations
  await prisma.productRecommendation.deleteMany({
    where: { type: 'similar' },
  });
  
  // Batch for insertion
  const recommendations = [];
  
  // For each product, find similar products
  for (const product of products) {
    const similarProducts = products.filter(p => 
      p.id !== product.id && 
      p.categoryId === product.categoryId &&
      p.price >= product.price * 0.7 && 
      p.price <= product.price * 1.3
    );
    
    // Sort by price similarity
    similarProducts.sort((a, b) => {
      const aPriceDiff = Math.abs(a.price - product.price);
      const bPriceDiff = Math.abs(b.price - product.price);
      return aPriceDiff - bPriceDiff;
    });
    
    // Take top 10 similar products
    const topSimilar = similarProducts.slice(0, 10);
    
    // Create recommendation entries
    for (const similar of topSimilar) {
      const priceSimilarity = 1 - Math.abs(similar.price - product.price) / product.price;
      recommendations.push({
        sourceProductId: product.id,
        recommendedProductId: similar.id,
        score: priceSimilarity,
        type: 'similar',
      });
    }
  }
  
  // Insert recommendations in batches
  if (recommendations.length > 0) {
    await prisma.productRecommendation.createMany({
      data: recommendations,
      skipDuplicates: true,
    });
  }
  
  console.log(`Created ${recommendations.length} similar product recommendations`);
}

/**
 * Compute "customers also bought" recommendations based on order history
 */
async function computeAlsoBoughtProducts() {
  console.log('Computing "also bought" recommendations...');
  
  // Reset existing "also bought" recommendations
  await prisma.productRecommendation.deleteMany({
    where: { type: 'also_bought' },
  });
  
  // Get all products that have been ordered
  const products = await prisma.marketplaceProduct.findMany({
    where: {
      status: 'active',
      orders: { some: {} }, // Only products with orders
    },
    select: { id: true },
  });
  
  const recommendations = [];
  
  // For each product, find other products bought by the same users
  for (const product of products) {
    // Find buyers of this product
    const buyersOfThisProduct = await prisma.marketplaceOrder.findMany({
      where: { productId: product.id },
      select: { buyerId: true },
      distinct: ['buyerId'],
    });
    
    const buyerIds = buyersOfThisProduct.map(order => order.buyerId);
    
    // Find other products bought by these buyers
    const otherProductsData = await prisma.marketplaceOrder.findMany({
      where: {
        buyerId: { in: buyerIds },
        productId: { not: product.id },
        product: { status: 'active' },
      },
      select: { productId: true },
    });
    
    // Count occurrences of each product
    const productCounts = {};
    for (const { productId } of otherProductsData) {
      productCounts[productId] = (productCounts[productId] || 0) + 1;
    }
    
    // Sort by count and take top products
    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([productId, count]) => ({
        sourceProductId: product.id,
        recommendedProductId: productId,
        score: count / buyerIds.length, // Normalize score by number of buyers
        type: 'also_bought',
      }));
    
    recommendations.push(...topProducts);
  }
  
  // Insert recommendations in batches
  if (recommendations.length > 0) {
    await prisma.productRecommendation.createMany({
      data: recommendations,
      skipDuplicates: true,
    });
  }
  
  console.log(`Created ${recommendations.length} "also bought" recommendations`);
}

/**
 * Update seasonal product tags based on current date
 */
async function updateSeasonalProducts() {
  console.log('Updating seasonal products...');
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  
  // Determine current season
  let currentSeason;
  if (currentMonth >= 3 && currentMonth <= 5) currentSeason = 'spring';
  else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = 'summer';
  else if (currentMonth >= 9 && currentMonth <= 11) currentSeason = 'fall';
  else currentSeason = 'winter';
  
  // Special holiday season check (November and December)
  const isHolidaySeason = currentMonth === 11 || currentMonth === 12;
  
  console.log(`Current season: ${currentSeason}, Holiday season: ${isHolidaySeason}`);
  
  // Check and update any seasonal products that need modification
  // This depends on your business logic for what makes a product seasonal
  
  // For demonstration, we'll just log the current seasonal categories
  const seasonalProducts = await prisma.seasonalProduct.count({
    where: { seasonName: currentSeason },
  });
  
  const holidayProducts = await prisma.seasonalProduct.count({
    where: { seasonName: 'holiday' },
  });
  
  console.log(`${seasonalProducts} products tagged for ${currentSeason}`);
  if (isHolidaySeason) {
    console.log(`${holidayProducts} products tagged for holiday season`);
  }
}

// Run the computation
computeRecommendations();
