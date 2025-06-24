## Certify-NFT Backend Directory Structure


```
Certify-NFT-BE/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow for CI/CD
├── contracts/
│   └── CertificateNFT.sol  # Main Smart Contract for NFT certificates
├── server/
│   ├── controllers/
│   │   └── mintControllers.ts
│   ├── routes/
│   │   ├── certificateQuery.ts
│   │   ├── certificateUpload.ts
│   │   ├── certificateVerify.ts
│   │   ├── health.ts
│   │   └── mint.ts
│   ├── services/
│   │   ├── certificateService.ts
│   │   ├── ipfsService.ts
│   │   ├── mintService.ts
│   │   └── verifyService.ts
│   ├── server.ts
│   ├── package.json
│   └── tsconfig.json
├── subgraph/
│   ├── schema.graphql      # GraphQL schema for The Graph
│   ├── subgraph.yaml       # Subgraph manifest file
│   └── mappings.ts         # Mappings from blockchain events to entities
├── test/
│   └── Lock.ts             # Test files for smart contracts
├── docker-compose.yml      # Docker Compose configuration for deployment
├── Dockerfile              # Docker configuration for the application
├── hardhat.config.ts       # Hardhat configuration for Ethereum development
├── package.json            # Root project dependencies and scripts
└── README.md               # Project documentation
``` 