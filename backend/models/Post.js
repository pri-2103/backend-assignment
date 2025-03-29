const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'social_media_posts';

let db = null;

async function connectDB() {
    if (db) return db;
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    return db;
}

async function savePost(post) {
    const db = await connectDB();
    return db.collection('posts').updateOne(
        { contentHash: post.contentHash },
        { $set: { ...post, updatedAt: new Date() } },
        { upsert: true }
    );
}

async function getPostsByAddress(address) {
    const db = await connectDB();
    return db.collection('posts')
        .find({ 'content.author': address })
        .sort({ timestamp: -1 })
        .toArray();
}

module.exports = {
    connectDB,
    savePost,
    getPostsByAddress
};