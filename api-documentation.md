# Certify-NFT API Documentation

## Environment Variables
You can use the following environment variables in your requests:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `{{base_url}}` | Base URL of the API | `http://localhost:4000` |
| `{{api_path}}` | API path | `/api/certificate` |
| `{{contract_address}}` | Smart contract address | `0x...` |
| `{{ipfs_gateway}}` | IPFS gateway URL | `https://ipfs.io/ipfs/` |

## Base URL
```
{{base_url}}{{api_path}}
```

## Authentication
No authentication required for these endpoints.

## Endpoints

### 1. Upload Certificate
Upload image and metadata to IPFS.

**Endpoint:** `POST {{base_url}}{{api_path}}/upload`

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Name of the certificate |
| description | string | Yes | Description of the certificate |
| image | file | Yes | Certificate file (PDF/PNG/JPG) |

**Example Request:**
```json
{
  "name": "Web3 Development Certificate",
  "description": "Certificate of Completion for Web3 Development Course",
  "image": "Certificate.pdf"
}
```

**Response Codes:**

1. **201 Created**
```json
{
  "message": "Upload successful",
  "tokenURI": "{{ipfs_gateway}}QmX...",
  "urlMetadata": "https://QmX....ipfs.w3s.link/",
  "urlCertificate": "https://QmY....ipfs.w3s.link/",
  "certificateType": "Certificate of Completion for Web3 Development Course",
  "to": "0x123..."
}
```

2. **400 Bad Request**
```json
{
  "error": "Validation failed",
  "missingFields": {
    "name": "Missing name field",
    "description": "Missing description field",
    "image": "Missing image file"
  }
}
```

3. **400 Bad Request (Invalid File)**
```json
{
  "error": "Invalid file format",
  "details": "Only PDF, PNG, and JPG files are allowed"
}
```

4. **503 Service Unavailable**
```json
{
  "error": "IPFS service unavailable",
  "details": "Failed to connect to IPFS node"
}
```

5. **500 Internal Server Error**
```json
{
  "error": "Internal server error during upload",
  "details": "Error message here"
}
```

### 2. Mint Certificate
Mint a new certificate NFT.

**Endpoint:** `POST {{base_url}}{{api_path}}/mint`

**Content-Type:** `application/json`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| to | string | Yes | Recipient's wallet address |
| tokenURI | string | Yes | IPFS URI of the certificate metadata |

**Example Request:**
```json
{
  "to": "0x123...",
  "tokenURI": "{{ipfs_gateway}}QmX..."
}
```

**Response Codes:**

1. **201 Created**
```json
{
  "message": "Minting successful",
  "to": "0x123...",
  "tokenURI": "{{ipfs_gateway}}QmX...",
  "urlMetadata": "https://QmX....ipfs.w3s.link/",
  "urlCertificate": "https://QmY....ipfs.w3s.link/",
  "certificateType": "Certificate of Completion for Web3 Development Course",
  "txHash": "0xabc..."
}
```

2. **409 Conflict (Duplicate Certificate)**
```json
{
  "error": "Duplicate certificate",
  "message": "Wallet already owns a certificate with this tokenURI."
}
```

3. **400 Bad Request**
```json
{
  "error": "Validation failed",
  "missingFields": {
    "to": "Missing recipient wallet address",
    "tokenURI": "Missing tokenURI (IPFS metadata)"
  }
}
```

4. **400 Bad Request (Invalid Address)**
```json
{
  "error": "Invalid wallet address",
  "details": "Invalid Ethereum address format"
}
```

5. **400 Bad Request (Insufficient Funds)**
```json
{
  "error": "Insufficient funds for minting",
  "details": "Not enough ETH to cover gas fees"
}
```

6. **503 Service Unavailable**
```json
{
  "error": "Blockchain network unavailable",
  "details": "Failed to connect to Ethereum network"
}
```

7. **500 Internal Server Error**
```json
{
  "error": "Minting failed",
  "details": "Error message here"
}
```

### 3. Query Certificates
Get all certificates owned by an address.

**Endpoint:** `GET {{base_url}}{{api_path}}/:address`

**Example Request:**
```json
{
  "address": "0x123..."
}
```

**Response Codes:**

1. **200 OK**
```json
{
  "certificates": [
    {
      "tokenId": "1",
      "tokenURI": "{{ipfs_gateway}}QmX...",
      "certificateType": "Certificate of Completion",
      "metadata": {
        "name": "Web3 Development Certificate",
        "description": "Certificate of Completion for Web3 Development Course",
        "image": "{{ipfs_gateway}}QmY..."
      }
    }
  ]
}
```

2. **400 Bad Request**
```json
{
  "error": "Invalid address format",
  "details": "Invalid Ethereum address format"
}
```

3. **404 Not Found**
```json
{
  "error": "No certificates found",
  "address": "0x123..."
}
```

4. **503 Service Unavailable**
```json
{
  "error": "Blockchain network unavailable",
  "details": "Failed to connect to Ethereum network"
}
```

5. **500 Internal Server Error**
```json
{
  "error": "Failed to fetch certificates"
}
```

### 4. Verify Certificate
Verify the authenticity of a certificate.

**Endpoint:** `GET {{base_url}}{{api_path}}/verify`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | string | Yes | Owner's wallet address |
| tokenId | string | Yes | Certificate token ID |

**Example Request:**
```json
{
  "address": "0x123...",
  "tokenId": "1"
}
```

**Response Codes:**

1. **200 OK**
```json
{
  "valid": true,
  "tokenId": "1",
  "address": "0x123...",
  "tokenURI": "{{ipfs_gateway}}QmX...",
  "metadata": {
    "name": "Web3 Development Certificate",
    "description": "Certificate of Completion for Web3 Development Course",
    "image": "{{ipfs_gateway}}QmY..."
  }
}
```

2. **400 Bad Request**
```json
{
  "error": "Missing address or tokenId"
}
```

3. **400 Bad Request (Invalid Address)**
```json
{
  "error": "Invalid wallet address",
  "details": "Invalid Ethereum address format"
}
```

4. **404 Not Found**
```json
{
  "error": "Certificate not found",
  "details": "Invalid token ID or certificate does not exist"
}
```

5. **503 Service Unavailable**
```json
{
  "error": "Blockchain network unavailable",
  "details": "Failed to connect to Ethereum network"
}
```

6. **500 Internal Server Error**
```json
{
  "error": "Verification failed"
}
```

### 5. Health Check
Check the status of the server and its dependencies.

**Endpoint:** `GET {{base_url}}{{api_path}}/health`

**Example Request:**
```json
GET {{base_url}}{{api_path}}/health
```

**Response Codes:**

1. **200 OK**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-21T12:34:56.789Z",
  "services": {
    "server": {
      "status": "up",
      "uptime": 123.45
    },
    "ipfs": {
      "status": "up"
    },
    "blockchain": {
      "status": "up"
    }
  }
}
```

2. **200 OK (Degraded)**
```json
{
  "status": "degraded",
  "timestamp": "2024-03-21T12:34:56.789Z",
  "services": {
    "server": {
      "status": "up",
      "uptime": 123.45
    },
    "ipfs": {
      "status": "down",
      "error": "Failed to connect to IPFS node"
    },
    "blockchain": {
      "status": "up"
    }
  }
}
```

3. **500 Internal Server Error**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-03-21T12:34:56.789Z",
  "error": "Internal server error"
}
```

**Status Meanings:**
- `healthy`: All services are running normally
- `degraded`: Some services are having issues but the server is still operational
- `unhealthy`: Server is experiencing serious issues

## Error Handling
All endpoints follow a consistent error response format:

```json
{
  "error": "Error message",
  "details": "Detailed error information (if available)"
}
```

## Rate Limiting
No rate limiting implemented.

## Notes
- All timestamps are in UTC
- All addresses should be valid Ethereum addresses
- Certificate files can be in PDF, PNG, or JPG format
- Maximum file size for uploads is 5MB

## Environment Setup
To use these environment variables in APIdog:

1. Create a new environment
2. Add the following variables:
   - `base_url`: Your API base URL
   - `api_path`: API path
   - `contract_address`: Your deployed contract address
   - `ipfs_gateway`: Your preferred IPFS gateway

Example environment values:
```json
{
  "base_url": "http://localhost:4000",
  "api_path": "/api/certificate",
  "contract_address": "0x...",
  "ipfs_gateway": "https://ipfs.io/ipfs/"
}
``` 