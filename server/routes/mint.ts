import express, { Request, Response } from 'express'
import multer from 'multer'
import { mintCertificate } from '../services/mintService'
import { getCertificatesByOwner, insertCertificate } from '../services/certificateService'

const router = express.Router()
const upload = multer()

// POST /api/certificate/mint
router.post('/mint', upload.none(), async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === ROUTES/MINT.TS DEBUG ===')
  console.log('Full request body:', req.body)
  console.log('Request headers:', req.headers['content-type'])
  console.log('===============================')

  try {
    const { to, tokenURI, event_id } = req.body

    const errors: { [key: string]: string } = {}
    if (!to) errors.to = 'Missing recipient wallet address'
    if (!tokenURI) errors.tokenURI = 'Missing tokenURI (IPFS metadata)'
    if (!event_id) errors.event_id = 'Missing event_id'

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        missingFields: errors,
      })
      return
    }

    // Fetch metadata from IPFS and extract description for certificateType, and image for urlCertificate
    let urlMetadata = ''
    let urlCertificate = ''
    let certificateTypeFromMetadata = ''
    if (tokenURI && tokenURI.startsWith('ipfs://')) {
      const hash = tokenURI.replace('ipfs://', '')
      urlMetadata = `https://${hash}.ipfs.w3s.link/`
      try {
        const response = await fetch(urlMetadata)
        if (response.ok) {
          const metadata = await response.json()
          if (metadata.description) {
            certificateTypeFromMetadata = metadata.description
          }
          if (metadata.image && metadata.image.startsWith('ipfs://')) {
            const imageHash = metadata.image.replace('ipfs://', '')
            urlCertificate = `https://${imageHash}.ipfs.w3s.link/`
          }
        }
      } catch (err) {
        console.error('Failed to fetch or parse metadata for urlCertificate/certificateType:', err)
      }
    }

    // Anti-duplicate: check if wallet already owns NFT with same tokenURI
    const existingCertificates = await getCertificatesByOwner(to)
    const alreadyOwned = existingCertificates.some(cert => cert.tokenURI === tokenURI)
    if (alreadyOwned) {
      res.status(409).json({
        error: 'Duplicate certificate',
        message: 'Wallet already owns a certificate with this tokenURI.'
      })
      return
    }

    // Use certificateType from metadata for minting
    const txHash = await mintCertificate(to, tokenURI, certificateTypeFromMetadata)

    // Insert ke database certificates
    try {
      await insertCertificate({
        walletAddress: to,
        eventId: event_id ? Number(event_id) : undefined,
        certificateData: { to, tokenURI, urlMetadata, urlCertificate, certificateType: certificateTypeFromMetadata },
        mintStatus: 'minted',
        mintTransactionHash: txHash,
        urlMetadata,
        urlCertificate,
        certificateType: certificateTypeFromMetadata,
      })
    } catch (dbErr) {
      console.error('Gagal insert ke certificates:', dbErr)
      // Tidak perlu return, tetap lanjut response sukses minting
    }

    res.status(201).json({
      message: 'Minting successful',
      to,
      tokenURI,
      urlMetadata,
      urlCertificate,
      certificateType: certificateTypeFromMetadata,
      txHash,
    })
  } catch (error) {
    console.error('❌ === MINTING ERROR IN ROUTES ===')
    console.error('Error:', error)
    console.error('Error type:', typeof error)
    console.error('Error message:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    console.error('==================================')

    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        res.status(400).json({
          error: 'Insufficient funds for minting',
          details: error.message
        })
        return
      }
      if (error.message.includes('user rejected')) {
        res.status(400).json({
          error: 'Transaction rejected by user',
          details: error.message
        })
        return
      }
      if (error.message.includes('invalid address')) {
        res.status(400).json({
          error: 'Invalid wallet address',
          details: error.message
        })
        return
      }
      if (error.message.includes('network')) {
        res.status(503).json({
          error: 'Blockchain network unavailable',
          details: error.message
        })
        return
      }
    }

    res.status(500).json({
      error: 'Minting failed',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router