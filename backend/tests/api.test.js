
const request = require('supertest');
const { ethers } = require('ethers');
const app = require('../server');

describe('API Endpoints', () => {
    let wallet;

    beforeAll(() => {
        // Create a new random wallet for testing
        wallet = ethers.Wallet.createRandom();
        process.env.TEST_PRIVATE_KEY = wallet.privateKey;
    });

    describe('POST /api/createPost', () => {
        it('should create a new post with valid signature', async () => {
            const content = {
                text: 'Test post',
                timestamp: Date.now(),
                author: wallet.address
            };

            const message = `Create post with content hash: QmTestHash`;
            const signature = await wallet.signMessage(message);

            const response = await request(app)
                .post('/api/createPost')
                .send({
                    content,
                    contentHash: 'QmTestHash',
                    signature,
                    address: wallet.address
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should reject post with invalid signature', async () => {
            const content = {
                text: 'Test post',
                timestamp: Date.now(),
                author: wallet.address
            };

            const response = await request(app)
                .post('/api/createPost')
                .send({
                    content,
                    signature: '0x123', // Invalid signature
                    address: wallet.address
                });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Invalid signature');
        });
    });

    describe('GET /api/posts/:address', () => {
        it('should get posts for an address', async () => {
            const response = await request(app)
                .get(`/api/posts/${wallet.address}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.posts)).toBe(true);
            expect(response.body.posts.length).toBeGreaterThan(0);
        });

        it('should handle pagination', async () => {
            const response = await request(app)
                .get(`/api/posts/${wallet.address}`)
                .query({ offset: 0, limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body.posts.length).toBeLessThanOrEqual(2);
        });
    });

    describe('GraphQL API', () => {
        it('should query posts through GraphQL', async () => {
            const query = `
                query {
                    posts(address: "${wallet.address}", offset: 0, limit: 10) {
                        posts {
                            contentHash
                            content {
                                text
                                timestamp
                            }
                            author
                        }
                        totalPosts
                        hasMore
                    }
                }
            `;

            const response = await request(app)
                .post('/graphql')
                .send({ query });

            expect(response.status).toBe(200);
            expect(response.body.data.posts).toBeDefined();
            expect(Array.isArray(response.body.data.posts.posts)).toBe(true);
        });

        it('should create post through GraphQL', async () => {
            const content = {
                text: 'GraphQL Test Post',
                timestamp: Date.now(),
                author: wallet.address
            };

            const contentHash = await uploadToIPFS(content);
            const message = `Create post with content hash: ${contentHash}`;
            const signature = await wallet.signMessage(message);

            const mutation = `
                mutation {
                    createPost(
                        content: ${JSON.stringify(JSON.stringify(content))},
                        signature: "${signature}"
                    ) {
                        contentHash
                        timestamp
                        content {
                            text
                        }
                    }
                }
            `;

            const response = await request(app)
                .post('/graphql')
                .send({ query: mutation });

            expect(response.status).toBe(200);
            expect(response.body.data.createPost).toBeDefined();
            expect(response.body.data.createPost.content.text).toBe(content.text);
        });
    });
});