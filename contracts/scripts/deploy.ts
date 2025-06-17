const { ethers } = require("hardhat");

async function main() {
  // Get the contract owner
  const [owner] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", owner.address);

  // Deploy the contract
  const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
  const certificateNFT = await CertificateNFT.deploy();
  await certificateNFT.waitForDeployment();

  const address = await certificateNFT.getAddress();
  console.log("CertificateNFT deployed to:", address);
}

// This pattern is recommended by Hardhat
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}