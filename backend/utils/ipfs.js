const pinataSDK = require('@pinata/sdk');
const axios = require('axios');
require('dotenv').config();

const pinata = new pinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_API_SECRET
);

async function uploadToIPFS(content) {
    try {
        const result = await pinata.pinJSONToIPFS(content, {
            pinataMetadata: {
                name: `Post-${Date.now()}`
            }
        });
        return result.IpfsHash;
    } catch (error) {
        console.error('IPFS Upload Error:', error);
        throw new Error('Failed to upload to IPFS');
    }
}

async function getFromIPFS(hash) {
    try {
        // Use Pinata's data endpoint
        const response = await axios.get(`https://api.pinata.cloud/data/pinList?status=pinned&hashContains=${hash}`, {
            headers: {
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_API_SECRET
            }
        });

        if (response.data.rows && response.data.rows.length > 0) {
            // Get the metadata
            const metadata = response.data.rows[0].metadata;
            
            // Fetch the actual content using the hash
            const contentResponse = await axios.get(`https://cloudflare-ipfs.com/ipfs/${hash}`);
            return contentResponse.data;
        } else {
            throw new Error('Content not found on IPFS');
        }
    } catch (error) {
        console.error(`IPFS Fetch Error for hash ${hash}:`, error.message);
        
        // Try multiple IPFS gateways
        const gateways = [
            'https://cloudflare-ipfs.com',
            'https://ipfs.io',
            'https://gateway.ipfs.io'
        ];

        for (const gateway of gateways) {
            try {
                const response = await axios.get(`${gateway}/ipfs/${hash}`, {
                    timeout: 5000
                });
                return response.data;
            } catch (err) {
                console.error(`Failed to fetch from ${gateway}:`, err.message);
                continue;
            }
        }
        
        throw new Error('Failed to fetch from IPFS');
    }
}

module.exports = {
    uploadToIPFS,
    getFromIPFS
};