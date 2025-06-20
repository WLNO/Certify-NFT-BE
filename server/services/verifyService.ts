import { ethers } from 'ethers'
import dotenv from 'dotenv'
import abi from '../../artifacts/contracts/CertificateNFT.sol/CertificateNFT.json'

dotenv.config()

// Debug logging
console.log('🔧 Environment Variables Check:')
console.log('- CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS)
console.log('- SEPOLIA_RPC_URL:', process.env.SEPOLIA_RPC_URL)

if (!process.env.CONTRACT_ADDRESS) {
  throw new Error('CONTRACT_ADDRESS is not configured in .env file')
}

if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error('SEPOLIA_RPC_URL is not configured in .env file')
}

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  abi.abi,
  provider
)

export async function verifyCertificate(ownerAddress: string, tokenId: string) {
  try {
    // Debug logging
    console.log('🔧 Verification Parameters:')
    console.log('- Owner Address:', ownerAddress)
    console.log('- Token ID:', tokenId)
    console.log('- Contract Address:', process.env.CONTRACT_ADDRESS)

    // Validate input parameters
    if (!ethers.isAddress(ownerAddress)) {
      throw new Error('Invalid owner address format')
    }

    const tokenIdNumber = parseInt(tokenId)
    if (isNaN(tokenIdNumber)) {
      throw new Error('Invalid token ID format')
    }

    // Verify certificate ownership
    console.log('🔧 Verifying certificate...')
    const isValid = await contract.verifyCertificate(ownerAddress, tokenIdNumber)
    console.log('✅ Verification result:', isValid)

    // Get token URI
    console.log('🔧 Getting token URI...')
    const tokenURI = await contract.tokenURI(tokenIdNumber)
    console.log('✅ Token URI:', tokenURI)

    // Fetch metadata from IPFS
    let metadata = null
    if (tokenURI) {
      try {
        const ipfsUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
        console.log('🔧 Fetching metadata from:', ipfsUrl)
        
        const metadataRes = await fetch(ipfsUrl)
        if (metadataRes.ok) {
          metadata = await metadataRes.json()
          console.log('✅ Metadata retrieved successfully')
        } else {
          console.log('❌ Failed to fetch metadata from IPFS')
        }
      } catch (metadataError) {
        console.log('❌ Error fetching metadata:', metadataError)
      }
    }

    return {
      tokenId,
      ownerAddress,
      isValid,
      tokenURI,
      metadata,
    }
  } 
  catch (err) {
    console.error('❌ Verification error:', err)
    
    // Handle specific error types
    if (err instanceof Error) {
      if (err.message.includes('ERC721: invalid token ID')) {
        return {
          valid: false,
          error: 'Invalid token ID'
        }
      }
      
      if (err.message.includes('call revert exception')) {
        return {
          valid: false,
          error: 'Contract call failed'
        }
      }
    }
    
    // Handle generic errors
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }
  }
}