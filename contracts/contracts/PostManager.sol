// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title PostManager
 * @dev A decentralized social media post management system
 * @custom:security-contact security@example.com
 */
contract PostManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    /// @dev Struct to store post information
    struct Post {
        string contentHash;
        uint256 timestamp;
    }

    error CannotFollowSelf();
    error EmptyContentHash();
    error InvalidAddress();

    /// @dev Mapping of user address to their posts
    mapping(address => Post[]) private userPosts;
    /// @dev Mapping of follower address to followed address to following status
    mapping(address => mapping(address => bool)) private following;
    /// @dev Mapping of user address to their followers
    mapping(address => address[]) private followers;
    
    event PostCreated(address indexed user, string contentHash, uint256 timestamp);
    event FollowToggled(address indexed follower, address indexed followed, bool isFollowing);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Pausable_init();
    }

    /**
     * @dev Creates a new post
     * @param contentHash IPFS hash of the post content
     */
    function createPost(string calldata contentHash) external whenNotPaused {
        if (bytes(contentHash).length == 0) revert EmptyContentHash();
        
        Post memory newPost = Post({
            contentHash: contentHash,
            timestamp: block.timestamp
        });
        
        userPosts[msg.sender].push(newPost);
        
        emit PostCreated(msg.sender, contentHash, block.timestamp);
    }

    /**
     * @dev Gets all posts for a user
     * @param user Address of the user
     * @return Post[] Array of posts
     */
    function getPosts(address user) external view returns (Post[] memory) {
        if (user == address(0)) revert InvalidAddress();
        return userPosts[user];
    }

    /**
     * @dev Gets paginated posts for a user
     * @param user Address of the user
     * @param offset Starting index
     * @param limit Maximum number of posts to return
     * @return posts Array of posts
     * @return totalPosts Total number of posts
     */
    function getPostsPaginated(
        address user, 
        uint256 offset, 
        uint256 limit
    ) external view returns (Post[] memory posts, uint256 totalPosts) {
        if (user == address(0)) revert InvalidAddress();
        
        Post[] storage allPosts = userPosts[user];
        totalPosts = allPosts.length;
        uint256 actualLimit = limit;

        if (offset >= totalPosts) {
            return (new Post[](0), totalPosts);
        }

        if (offset + limit > totalPosts) {
            actualLimit = totalPosts - offset;
        }

        posts = new Post[](actualLimit);
        for (uint256 i = 0; i < actualLimit; i++) {
            posts[i] = allPosts[offset + i];
        }

        return (posts, totalPosts);
    }

    /**
     * @dev Toggles following status for a user
     * @param userToFollow Address of the user to follow/unfollow
     */
    function toggleFollow(address userToFollow) external whenNotPaused {
        if (userToFollow == msg.sender) revert CannotFollowSelf();
        if (userToFollow == address(0)) revert InvalidAddress();
        
        bool isCurrentlyFollowing = following[msg.sender][userToFollow];
        
        if (!isCurrentlyFollowing) {
            following[msg.sender][userToFollow] = true;
            followers[userToFollow].push(msg.sender);
        } else {
            following[msg.sender][userToFollow] = false;
            _removeFollower(userToFollow, msg.sender);
        }
        
        emit FollowToggled(msg.sender, userToFollow, !isCurrentlyFollowing);
    }

    /**
     * @dev Gets all followers for a user
     * @param user Address of the user
     * @return address[] Array of follower addresses
     */
    function getFollowers(address user) external view returns (address[] memory) {
        if (user == address(0)) revert InvalidAddress();
        return followers[user];
    }

    /**
     * @dev Checks if one user is following another
     * @param follower Address of the potential follower
     * @param followed Address of the potentially followed user
     * @return bool Following status
     */
    function isFollowing(address follower, address followed) external view returns (bool) {
        if (follower == address(0) || followed == address(0)) revert InvalidAddress();
        return following[follower][followed];
    }

    /**
     * @dev Removes a follower from a user's followers array
     * @param user Address of the user
     * @param followerToRemove Address of the follower to remove
     */
    function _removeFollower(address user, address followerToRemove) private {
        address[] storage userFollowers = followers[user];
        uint256 length = userFollowers.length;
        
        for (uint256 i = 0; i < length;) {
            if (userFollowers[i] == followerToRemove) {
                userFollowers[i] = userFollowers[length - 1];
                userFollowers.pop();
                break;
            }
            unchecked { ++i; }
        }
    }

    /**
     * @dev Pauses all post creation and following actions
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all post creation and following actions
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract
     */
    function _authorizeUpgrade(address) internal override onlyOwner {}
}