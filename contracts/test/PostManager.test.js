const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");


describe("PostManager", function () {
    let PostManager;
    let postManager;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        // Get contract factory and signers
        PostManager = await ethers.getContractFactory("PostManager");
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy using upgrades plugin
        postManager = await upgrades.deployProxy(PostManager, [], {
            initializer: 'initialize',
            kind: 'uups'
        });
        
        // Wait for deployment
        await postManager.waitForDeployment();
    });

    describe("Posts", function () {
        it("Should create a post", async function () {
            const currentTime = await time.latest();
            
            await expect(postManager.connect(addr1).createPost("QmTest123"))
                .to.emit(postManager, "PostCreated")
                .withArgs(addr1.address, "QmTest123", currentTime + 1);

            const posts = await postManager.getPosts(addr1.address);
            expect(posts.length).to.equal(1);
            expect(posts[0].contentHash).to.equal("QmTest123");
        });

        it("Should revert with empty content hash", async function () {
            await expect(postManager.connect(addr1).createPost(""))
                .to.be.revertedWithCustomError(postManager, "EmptyContentHash");
        });

        it("Should get posts with pagination", async function () {
            // Create 5 posts
            for(let i = 0; i < 5; i++) {
                await postManager.connect(addr1).createPost(`QmTest${i}`);
            }

            const [posts, total] = await postManager.getPostsPaginated(addr1.address, 0, 2);
            expect(posts.length).to.equal(2);
            expect(total).to.equal(5);
            expect(posts[0].contentHash).to.equal("QmTest0");
            expect(posts[1].contentHash).to.equal("QmTest1");
        });

        it("Should handle pagination bounds correctly", async function () {
            // Create 3 posts
            for(let i = 0; i < 3; i++) {
                await postManager.connect(addr1).createPost(`QmTest${i}`);
            }

            // Test offset beyond array length
            const [posts1, total1] = await postManager.getPostsPaginated(addr1.address, 5, 2);
            expect(posts1.length).to.equal(0);
            expect(total1).to.equal(3);

            // Test limit beyond remaining posts
            const [posts2, total2] = await postManager.getPostsPaginated(addr1.address, 1, 5);
            expect(posts2.length).to.equal(2);
            expect(total2).to.equal(3);
        });
    });

    describe("Following", function () {
        it("Should toggle follow status", async function () {
            await expect(postManager.connect(addr1).toggleFollow(addr2.address))
                .to.emit(postManager, "FollowToggled")
                .withArgs(addr1.address, addr2.address, true);

            expect(await postManager.isFollowing(addr1.address, addr2.address)).to.be.true;

            const followers = await postManager.getFollowers(addr2.address);
            expect(followers.length).to.equal(1);
            expect(followers[0]).to.equal(addr1.address);

            // Test unfollow
            await expect(postManager.connect(addr1).toggleFollow(addr2.address))
                .to.emit(postManager, "FollowToggled")
                .withArgs(addr1.address, addr2.address, false);

            expect(await postManager.isFollowing(addr1.address, addr2.address)).to.be.false;
            
            const followersAfterUnfollow = await postManager.getFollowers(addr2.address);
            expect(followersAfterUnfollow.length).to.equal(0);
        });

        it("Should not allow following self", async function () {
            await expect(postManager.connect(addr1).toggleFollow(addr1.address))
                .to.be.revertedWithCustomError(postManager, "CannotFollowSelf");
        });

        it("Should not allow following zero address", async function () {
            await expect(postManager.connect(addr1).toggleFollow(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(postManager, "InvalidAddress");
        });
    });

    describe("Pausable", function () {
        it("Should pause and unpause", async function () {
            await postManager.connect(owner).pause();
            
            await expect(postManager.connect(addr1).createPost("QmTest"))
                .to.be.revertedWithCustomError(postManager, "EnforcedPause");

            await postManager.connect(owner).unpause();
            
            await expect(postManager.connect(addr1).createPost("QmTest"))
                .to.emit(postManager, "PostCreated");
        });

        it("Should only allow owner to pause", async function () {
            await expect(postManager.connect(addr1).pause())
                .to.be.revertedWithCustomError(postManager, "OwnableUnauthorizedAccount")
                .withArgs(addr1.address);
        });
    });
});