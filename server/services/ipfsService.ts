import { create, Client } from '@web3-storage/w3up-client'
import dotenv from 'dotenv'
import path from 'path'

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') })

console.log('W3UP_TOKEN:', process.env.W3UP_TOKEN)
console.log('W3UP_SPACE:', process.env.W3UP_SPACE)

let cachedClient: Client | null = null

export async function getClient(): Promise<Client> {
  if (cachedClient) return cachedClient

  const w3upToken = process.env.W3UP_TOKEN
  if (!w3upToken) {
    throw new Error('W3UP_TOKEN missing in environment variables')
  }

  if (!w3upToken.includes('@')) {
    throw new Error('W3UP_TOKEN must be a valid email address')
  }

  const client = await create()
  await client.login(w3upToken as `${string}@${string}`)

  const spaceDID = process.env.W3UP_SPACE
  if (!spaceDID || !spaceDID.startsWith('did:key:')) {
    throw new Error('W3UP_SPACE missing or invalid in environment variables')
  }

  await client.setCurrentSpace(spaceDID as `did:key:${string}`)

  cachedClient = client
  return client
}

export async function uploadToIPFS(content: File | Blob | Uint8Array | string): Promise<string> {
  const client = await getClient()

  let data: Blob
  if (typeof content === 'string' || content instanceof Uint8Array) {
    data = new Blob([content])
  } else {
    data = content
  }

  const upload = await client.uploadFile(data)
  return upload.toString()
}

interface MetadataPayload {
  name: string
  description: string
  image: string
}

export async function generateAndUploadMetadata(
  userName: string,
  description: string,
  imageUrl: string
): Promise<string> {
  const metadata: MetadataPayload = {
    name: userName,
    description,
    image: imageUrl
  }

  const metadataJson = JSON.stringify(metadata)
  const tokenURI = await uploadToIPFS(metadataJson)

  return `ipfs://${tokenURI}`
}