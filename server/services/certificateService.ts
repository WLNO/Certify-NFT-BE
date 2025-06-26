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
    'SELECT id FROM users WHERE LOWER(wallet_address) = $1',
    [walletAddress.toLowerCase()]
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

export async function generateMetadataForMint(walletAddress: string, eventId: number): Promise<{
  tokenURI: string,
  urlMetadata: string,
  urlCertificate: string,
  certificateType: string
}> {
  // Ambil nama user
  const userRes = await pool.query(
    'SELECT name FROM users WHERE LOWER(wallet_address) = $1',
    [walletAddress.toLowerCase()]
  )
  if (userRes.rowCount === 0) throw new Error('User not found')
  const userName = userRes.rows[0].name

  // Ambil url_certificate dan description dari event_certificates
  const certRes = await pool.query(
    'SELECT url_certificate, description FROM event_certificates WHERE event_id = $1',
    [eventId]
  )
  if (certRes.rowCount === 0) throw new Error('No certificate uploaded for this event')
  const urlCertificate = certRes.rows[0].url_certificate
  const description = certRes.rows[0].description || `Certificate for Event ID ${eventId}`

  // Buat metadata dan upload
  const certificateType = description
  const metadata = {
    name: userName,
    description: certificateType,
    image: urlCertificate
  }

  const tokenURI = await uploadToIPFS(JSON.stringify(metadata))

  return {
    tokenURI: `ipfs://${tokenURI}`,
    urlMetadata: `https://${tokenURI}.ipfs.w3s.link/`,
    urlCertificate,
    certificateType
  }
}

export async function checkEventHasCertificate(eventId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM event_certificates WHERE event_id = $1',
    [eventId]
  )
  return (result.rowCount ?? 0) > 0
}

export async function isUserEligibleForMint(walletAddress: string, eventId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT u.id FROM users u
     INNER JOIN whitelist w ON u.id = w.user_id AND w.event_id = $1
     INNER JOIN attendance a ON u.id = a.user_id AND a.event_id = $1
     WHERE LOWER(u.wallet_address) = $2`,
    [eventId, walletAddress.toLowerCase()]
  )
  return (result.rowCount ?? 0) > 0
}