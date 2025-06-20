import { uploadToIPFS } from './ipfsService'

export async function createAndUploadMetadata(name: string, description: string, imageCid: string): Promise<string> {
  const metadata = {
    name,
    description,
    image: `ipfs://${imageCid}`
  }

  const jsonBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  const cid = await uploadToIPFS(jsonBlob)
  return `ipfs://${cid}` // final tokenURI
}

import { ethers } from 'ethers'
import CertificateNFTJson from '../../artifacts/contracts/CertificateNFT.sol/CertificateNFT.json'

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || ''

export async function getCertificatesByOwner(ownerAddress: string): Promise<{ tokenId: string; tokenURI: string }[]> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address missing in env')
  }

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CertificateNFTJson.abi, provider)
  

  // Fetch balance of NFTs owned
  const balance = await contract.balanceOf(ownerAddress)

  const tokens = []
  for (let i = 0; i < balance; i++) {
    const tokenId = await contract.tokenOfOwnerByIndex(ownerAddress, i)
    const tokenURI = await contract.tokenURI(tokenId)
    tokens.push({ tokenId: tokenId.toString(), tokenURI })
  }
  return tokens
}