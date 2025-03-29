const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const { uploadToIPFS, getFromIPFS } = require('./utils/ipfs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Contract ABI and address
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CONTRACT_ABI = require('./artifacts/PostManager.json').abi;

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

// EIP-191 signature verification
function verifySignature(message, signature, address) {
    try {
        const EIP191_PREFIX = "\x19Ethereum Signed Message:\n";
        const messageLength = Buffer.from(message).length.toString();
        const prefixedMessage = Buffer.concat([
            Buffer.from(EIP191_PREFIX),
            Buffer.from(messageLength),
            Buffer.from(message)
        ]);

        const msgHash = ethers.keccak256(prefixedMessage);
        const msgHashBytes = ethers.getBytes(msgHash);
        const recoveredAddress = ethers.recoverAddress(msgHashBytes, signature);

        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (err) {
        console.error('Signature verification error:', err);
        return false;
    }
}

// Create post endpoint
app.post('/api/createPost', async (req, res) => {
    try {
        const { content, signature, address } = req.body;
        
        // Upload to IPFS
        const contentHash = await uploadToIPFS(content);
        
        // Verify signature
        const message = `Create post with content hash: ${contentHash}`;
        const isValid = verifySignature(message, signature, address);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Create transaction
        const tx = await contract.createPost(contentHash);
        await tx.wait();

        // Save to MongoDB and cache
        const postData = {
            contentHash,
            content,
            timestamp: Date.now(),
            txHash: tx.hash,
            ipfsUrl: `https://cloudflare-ipfs.com/ipfs/${contentHash}`
        };

        await savePost(postData);
        await cachePost(contentHash, postData);

        res.json({ 
            success: true,
            ...postData
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get posts endpoint
app.get('/api/posts/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Try to get from Redis cache first
        const cachedPosts = await getCachedPosts(address);
        if (cachedPosts) {
            return res.json({ 
                posts: cachedPosts,
                source: 'cache'
            });
        }

        // Get posts from blockchain
        const posts = await contract.getPosts(address);
        
        const formattedPosts = [];
        
        for (const post of posts) {
            try {
                // Check cache first
                let content = await getCachedPost(post.contentHash);
                
                if (!content) {
                    // Try MongoDB
                    const dbPost = await getPostsByAddress(address);
                    if (dbPost && dbPost.length > 0) {
                        content = dbPost[0].content;
                    } else {
                        // Fetch from IPFS as last resort
                        content = await getFromIPFS(post.contentHash);
                        
                        // Save to MongoDB and cache
                        const postData = {
                            contentHash: post.contentHash,
                            content,
                            timestamp: post.timestamp.toString()
                        };
                        await savePost(postData);
                        await cachePost(post.contentHash, content);
                    }
                }

                formattedPosts.push({
                    contentHash: post.contentHash,
                    timestamp: post.timestamp.toString(),
                    content,
                    ipfsUrl: `https://cloudflare-ipfs.com/ipfs/${post.contentHash}`
                });
            } catch (error) {
                console.error(`Failed to fetch content for hash: ${post.contentHash}`, error);
                formattedPosts.push({
                    contentHash: post.contentHash,
                    timestamp: post.timestamp.toString(),
                    error: 'Content temporarily unavailable'
                });
            }
        }

        // Cache the formatted posts
        await cachePosts(address, formattedPosts);
        
        res.json({ 
            posts: formattedPosts,
            source: 'blockchain'
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
module.exports = app;