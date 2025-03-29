const { MongoMemoryServer } = require('mongodb-memory-server');
const Redis = require('redis-mock');
const { ethers } = require('ethers');
require('dotenv').config();

let mongoServer;
let redisClient;

beforeAll(async () => {
    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    
    // Setup Redis Mock
    redisClient = Redis.createClient();
    process.env.REDIS_URL = 'redis://localhost:6379';

    // Setup test wallet
    const wallet = ethers.Wallet.createRandom();
    process.env.TEST_PRIVATE_KEY = wallet.privateKey;
    process.env.TEST_ADDRESS = wallet.address;

    // Mock contract address
    process.env.CONTRACT_ADDRESS = '0x4B1c960D78a1a0766A47a6D2970a679277EB2462';
});

afterAll(async () => {
    if (mongoServer) {
        await mongoServer.stop();
    }
    if (redisClient) {
        redisClient.quit();
    }
});

global.redisClient = redisClient;