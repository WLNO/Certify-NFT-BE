import express, { Request, Response } from 'express'
import multer from 'multer'
import { mintCertificate } from '../services/mintService'
import { getCertificatesByOwner, insertCertificate, checkEventHasCertificate, isUserEligibleForMint, generateMetadataForMint } from '../services/certificateService'

const router = express.Router()
const upload = multer()

// POST /api/certificate/mint
router.post('/mint', upload.none(), async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 === ROUTES/MINT.TS DEBUG ===')
  console.log('Full request body:', req.body)
  console.log('Request headers:', req.headers['content-type'])
  console.log('===============================')

  try {
    const { user_address, event_id } = req.body

    const errors: { [key: string]: string } = {}
    if (!user_address) errors.user_address = 'Missing recipient wallet address'
    if (!event_id) errors.event_id = 'Missing event_id'

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

    // Generate metadata on-the-fly
    const { tokenURI, urlMetadata, urlCertificate, certificateType } = await generateMetadataForMint(user_address, Number(event_id));

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
        certificateData: {
            tokenURI: tokenURI,
            urlMetadata: urlMetadata,
            urlCertificate: urlCertificate,
            certificateType: certificateType,
            user_address: user_address
        },
        mintStatus: 'minted',
        mintTransactionHash: txHash,
        urlMetadata: urlMetadata,
        urlCertificate: urlCertificate,
        certificateType: certificateType
      })
    } catch (dbErr) {
      // Log the error but don't block the user response
      console.error('Failed to save certificate to DB:', dbErr)
    }

    res.status(201).json({
      message: 'Minting successful',
      user_address,
      txHash,
      tokenURI,
      urlMetadata,
      urlCertificate,
      certificateType
    })
  } catch (error) {
    console.error('Minting failed:', error)
    if (error instanceof Error) {
      if (error.message.includes('User not found') || error.message.includes('No certificate uploaded')) {
        res.status(404).json({ error: 'Minting precondition failed', details: error.message })
        return
      }
    }
    res.status(500).json({
      error: 'Internal server error during minting',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router