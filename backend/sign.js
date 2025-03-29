const { ethers } = require('ethers');
const { uploadToIPFS } = require('./utils/ipfs');
require('dotenv').config();

async function generateSignature() {
    try {
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
        
        // Create post content - exactly as we want to store it
        const content = {
            content: "Hello, this is my first IPFS post!",
            timestamp: Date.now(),
            author: wallet.address
        };
        
        // Upload to IPFS first
        const contentHash = await uploadToIPFS(content);
        console.log('Content uploaded to IPFS with hash:', contentHash);

        // Create the message to sign
        const message = `Create post with content hash: ${contentHash}`;
        
        // Sign the message
        const signature = await wallet.signMessage(message);
        const address = wallet.address;

        // Log everything including the exact curl command to use
        console.log({
            content,
            contentHash,
            message,
            signature,
            address,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${contentHash}`,
            curlCommand: `curl -X POST http://localhost:3000/api/createPost \\
-H "Content-Type: application/json" \\
-d '{
    "content": ${JSON.stringify(content)},
    "contentHash": "${contentHash}",
    "signature": "${signature}",
    "address": "${address}"
}'`
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

generateSignature();