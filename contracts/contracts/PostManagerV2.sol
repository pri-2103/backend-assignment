// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract PostManagerV2 is Initializable, OwnableUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    struct Post {
        string contentHash;
        uint256 timestamp;
    }
    
    mapping(address => Post[]) private userPosts;
    mapping(address => mapping(address => bool)) private following;
    mapping(address => address[]) private followers;  // Keep the same type as original

    event PostCreated(address indexed user, string contentHash);
    event FollowToggled(address indexed follower, address indexed followed, bool status);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Pausable_init();
    }

    function createPost(string memory contentHash) external whenNotPaused {
        Post memory newPost = Post({
            contentHash: contentHash,
            timestamp: block.timestamp
        });
        userPosts[msg.sender].push(newPost);
        emit PostCreated(msg.sender, contentHash);
    }

    function getPosts(address user) external view returns (Post[] memory) {
        return userPosts[user];
    }

    // New function to toggle pause
    function togglePause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}