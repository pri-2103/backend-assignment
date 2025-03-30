const { ethers, upgrades } = require("hardhat");
require('dotenv').config();

async function main() {
    if (!process.env.CONTRACT_ADDRESS) {
        throw new Error("CONTRACT_ADDRESS not set in environment");
    }

    const PROXY_ADDRESS = process.env.CONTRACT_ADDRESS;
    console.log("Current Proxy address:", PROXY_ADDRESS);

    const PostManagerV2 = await ethers.getContractFactory("PostManagerV2");
    console.log("Deploying PostManager V2...");
    
    try {
        console.log("Upgrading PostManager at address:", PROXY_ADDRESS);
        const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, PostManagerV2, { 
            kind: 'uups'
        });
        await upgraded.waitForDeployment();
        
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
        console.log("Upgrade successful!");
        console.log("New implementation address:", newImplementationAddress);
        console.log("Proxy address (unchanged):", PROXY_ADDRESS);
    } catch (error) {
        console.error("Error during upgrade:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });