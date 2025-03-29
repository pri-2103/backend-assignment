```bash
# Install contract dependencies
cd contracts
npm install

# Install backend dependencies
cd ../backend
npm install
```

```env
# Environment variables
PRIVATE_KEY=your_private_key
REDIS_URL=redis://localhost:6379
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
CONTRACT_ADDRESS=your_contract_address
```

```bash
# Compile and deploy contracts
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```


```bash
# Start backend
cd backend
node server.js
```

```bash
# Run contract tests
cd contracts
npx hardhat test

## API Endpoints

### Create a New Post
```http
POST http://localhost:3000/api/createPost
Content-Type: application/json

{
    "content": {
        "text": "Hello, this is my first IPFS post!",
        "timestamp": 1710831600000,
        "author": "0x123..."
    },
    "signature": "0x2b12b5f21cc23c87d9741b2b2eb4f79cd1b89f1a4030fb3f2c33ee159ca7d66c42...",
    "address": "0x123..."
}
```

### Get User's Posts
```http
GET http://localhost:3000/api/posts/0x123...
```

## Features
- On-chain post management
- IPFS content storage
- EIP-191 signature verification
- Follower system
- Pagination support

## License
ISC
