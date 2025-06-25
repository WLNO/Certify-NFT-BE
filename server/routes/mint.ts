import express, { Request, Response } from 'express'
import multer from 'multer'
import { mintCertificate } from '../services/mintService'
import { getCertificatesByOwner, insertCertificate, generateMetadataForMint, checkEventHasCertificate, isUserEligibleForMint } from '../services/certificateService'

const router = express.Router()
const upload = multer()

// POST /api/certificate/mint
router.post('/mint', upload.none(), async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === ROUTES/MINT.TS DEBUG ===')
  console.log('Full request body:', req.body)
  console.log('Request headers:', req.headers['content-type'])
  console.log('===============================')

  try {
    const { user_address, event_id, tokenURI } = req.body

    const errors: { [key: string]: string } = {}
    if (!user_address) errors.user_address = 'Missing recipient wallet address'
    if (!event_id) errors.event_id = 'Missing event_id'
    if (!tokenURI) errors.tokenURI = 'Missing tokenURI (IPFS metadata)'

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        missingFields: errors,
      })
      return
    }

    // Validasi: pastikan event memiliki sertifikat
    const hasCert = await checkEventHasCertificate(Number(event_id))
    if (!hasCert) {
      res.status(400).json({
        error: 'No certificate uploaded for this event',
        message: 'The event does not have a certificate template uploaded by vendor yet.'
      })
      return
    }

    // Validasi: pastikan user ada di whitelist dan attendance untuk event
    const eligible = await isUserEligibleForMint(user_address, Number(event_id))
    if (!eligible) {
      res.status(403).json({
        error: 'User not eligible',
        message: 'User must be whitelisted and marked present before minting.'
      })
      return
    }

    // Fetch metadata from IPFS berdasarkan tokenURI
    let urlMetadata = ''
    let urlCertificate = ''
    let certificateType = ''
    if (tokenURI && tokenURI.startsWith('ipfs://')) {
      const hash = tokenURI.replace('ipfs://', '')
      urlMetadata = `https://${hash}.ipfs.w3s.link/`
      try {
        const response = await fetch(urlMetadata)
        if (response.ok) {
          const metadata = await response.json()
          if (metadata.description) {
            certificateType = metadata.description
          }
          if (metadata.image) {
            if (metadata.image.startsWith('ipfs://')) {
              const imageHash = metadata.image.replace('ipfs://', '')
              urlCertificate = `https://${imageHash}.ipfs.w3s.link/`
            } else if (metadata.image.startsWith('https://')) {
              urlCertificate = metadata.image
            } else {
              // fallback: treat as raw hash
              urlCertificate = `https://${metadata.image}.ipfs.w3s.link/`
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch or parse metadata for urlCertificate/certificateType:', err)
      }
    }

    // Anti-duplicate: check if wallet already owns NFT with same tokenURI
    const existingCertificates = await getCertificatesByOwner(user_address)
    const alreadyOwned = existingCertificates.some(cert => cert.tokenURI === tokenURI)
    if (alreadyOwned) {
      res.status(409).json({
        error: 'Duplicate certificate',
        message: 'Wallet already owns a certificate with this tokenURI.'
      })
      return
    }

    // Use certificateType for minting
    const txHash = await mintCertificate(user_address, tokenURI, certificateType)

    // Insert ke database certificates
    try {
      await insertCertificate({
        walletAddress: user_address,
        eventId: Number(event_id),
        certificateData: { user_address, tokenURI, urlMetadata, urlCertificate, certificateType },
        mintStatus: 'minted',
        mintTransactionHash: txHash,
        urlMetadata,
        urlCertificate,
        certificateType,
      })
    } catch (dbErr) {
      console.error('Gagal insert ke certificates:', dbErr)
    }

    res.status(201).json({
      message: 'Minting successful',
      user_address,
      tokenURI,
      urlMetadata,
      urlCertificate,
      certificateType,
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