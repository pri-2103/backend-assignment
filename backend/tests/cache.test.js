const { getCachedPost, cachePost, getCachedPosts, cachePosts } = require('../utils/cache');

describe('Cache System', () => {
    const testPost = {
        contentHash: 'QmTestHash',
        content: { text: 'Test post' },
        timestamp: Date.now()
    };

    beforeEach(async () => {
        await global.redisClient.flushall();
    });

    it('should cache and retrieve a post', async () => {
        await cachePost(testPost.contentHash, testPost);
        const cached = await getCachedPost(testPost.contentHash);
        expect(cached).toEqual(testPost);
    });

    it('should cache and retrieve multiple posts', async () => {
        const posts = [testPost];
        const address = process.env.TEST_ADDRESS;

        await cachePosts(address, posts);
        const cached = await getCachedPosts(address);
        expect(cached).toEqual(posts);
    });

    it('should return null for non-existent cache', async () => {
        const cached = await getCachedPost('nonexistent');
        expect(cached).toBeNull();
    });
});