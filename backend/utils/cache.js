const Redis = require('redis');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_DURATION = 3600; // 1 hour in seconds

let redisClient = null;

async function connectRedis() {
    if (redisClient) return redisClient;
    
    redisClient = Redis.createClient({
        url: REDIS_URL
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
    
    return redisClient;
}

async function getCachedPost(contentHash) {
    const client = await connectRedis();
    const cachedData = await client.get(`post:${contentHash}`);
    return cachedData ? JSON.parse(cachedData) : null;
}

async function cachePost(contentHash, postData) {
    const client = await connectRedis();
    await client.setEx(
        `post:${contentHash}`,
        CACHE_DURATION,
        JSON.stringify(postData)
    );
}

async function getCachedPosts(address) {
    const client = await connectRedis();
    const cachedData = await client.get(`posts:${address}`);
    return cachedData ? JSON.parse(cachedData) : null;
}

async function cachePosts(address, posts) {
    const client = await connectRedis();
    await client.setEx(
        `posts:${address}`,
        CACHE_DURATION,
        JSON.stringify(posts)
    );
}

module.exports = {
    connectRedis,
    getCachedPost,
    cachePost,
    getCachedPosts,
    cachePosts
};