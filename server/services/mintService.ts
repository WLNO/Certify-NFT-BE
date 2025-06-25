import { ethers } from 'ethers'
import { isAddress } from 'ethers'
import dotenv from 'dotenv'
import abi from '../../artifacts/contracts/CertificateNFT.sol/CertificateNFT.json'

dotenv.config()

const contractAddress = process.env.CONTRACT_ADDRESS || ''
const privateKey = process.env.PRIVATE_KEY || ''
const rpcUrl = process.env.SEPOLIA_RPC_URL || ''

console.log('🚀 === MINTSERVICE.TS LOADED ===')
console.log('Contract Address:', contractAddress)
console.log('RPC URL:', rpcUrl)
console.log('Private Key length:', privateKey.length)
console.log('===================================')

const provider = new ethers.JsonRpcProvider(rpcUrl)
const wallet = new ethers.Wallet(privateKey, provider)
const contract = new ethers.Contract(contractAddress, abi.abi, wallet)

export async function mintCertificate(
  user_address: string,
  tokenURI: string,
  certificateType: string
): Promise<string> {
  console.log('🔥 === MINT CERTIFICATE FUNCTION CALLED ===')
  console.log('Arguments received:', arguments)
  console.log('user_address:', user_address, typeof user_address)
  console.log('tokenURI:', tokenURI, typeof tokenURI)
  console.log('certificateType:', certificateType, typeof certificateType)
  console.log('=============================================')
  
  try {
    // Force validation
    if (user_address === 'mint') {
      console.error('🚨 FOUND THE BUG: user_address parameter is "mint"!')
      throw new Error('Parameter "user_address" cannot be "mint" - it must be an Ethereum address')
    }

    if (!isAddress(user_address)) {
      console.error('🚨 Invalid address:', user_address)
      throw new Error(`Invalid Ethereum address: ${user_address}`)
    }

    console.log('✅ Validation passed, calling contract.mint()...')
    
    const tx = await contract["mint(address,string,string)"](user_address, tokenURI, certificateType)
    await tx.wait()

    console.log(`✅ Minted NFT to ${user_address} with tx hash: ${tx.hash}`)
    return tx.hash
  } catch (err) {
    console.error('❌ === MINT ERROR ===')
    console.error('Error:', err)
    console.error('Error type:', typeof err)
    console.error('Error constructor:', err?.constructor?.name)
    if (err instanceof Error) {
      console.error('Error message:', err.message)
      console.error('Error stack:', err.stack)
    }
    console.error('==================')
    
    throw err
  }
}

// Test function untuk debug
export function testMintService() {
  console.log('🧪 Test MintService called')
  return 'MintService is working'
}