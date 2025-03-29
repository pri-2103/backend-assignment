const { ethers, upgrades } = require("hardhat");

async function main() {
  const PostManager = await ethers.getContractFactory("PostManager");
  console.log("Deploying PostManager...");
  
  const postManager = await upgrades.deployProxy(PostManager, [], {
    initializer: "initialize",
    kind: "uups"
  });
  
  await postManager.waitForDeployment();
  
  console.log("PostManager deployed to:", await postManager.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });