import { uploadToIPFS } from './ipfsService'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({ connectionString: process.env.DATABASE_DSN })

pool.connect()
  .then(() => console.log('✅ PostgreSQL connected (certificateService.ts)'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err))

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

export async function insertCertificate({
  walletAddress,
  eventId, // optional
  certificateData,
  mintStatus,
  mintTransactionHash,
  urlMetadata,
  urlCertificate,
  certificateType,
}: {
  walletAddress: string,
  eventId?: number,
  certificateData: any,
  mintStatus: string,
  mintTransactionHash: string,
  urlMetadata: string,
  urlCertificate: string,
  certificateType: string,
}) {
  // Lookup user_id
  const userRes = await pool.query(
    'SELECT id FROM users WHERE wallet_address = $1',
    [walletAddress]
  )
  if (userRes.rowCount === 0) throw new Error('User not found')
  const userId = userRes.rows[0].id

  // Insert ke certificates
  await pool.query(
    `INSERT INTO certificates
      (user_id, event_id, certificate_data, mint_status, mint_transaction_hash, url_metadata, url_certificate, certificate_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      eventId || null,
      JSON.stringify(certificateData),
      mintStatus,
      mintTransactionHash,
      urlMetadata,
      urlCertificate,
      certificateType,
    ]
  )
}