import express, { Request, Response } from 'express'
import multer from 'multer'
import { uploadToIPFS } from '../services/ipfsService'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()
const upload = multer() // Use memory storage for file uploads

const pool = new Pool({ connectionString: process.env.DATABASE_DSN })

router.post('/upload', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, user_address, event_id, vendor_address } = req.body
    const file = (req as any).file

    // Detailed validation
    const errors: { [key: string]: string } = {}
    if (!name) errors.name = 'Missing name field'
    if (!description) errors.description = 'Missing description field'
    if (!user_address) errors.user_address = 'Missing user_address (wallet address) field'
    if (!file) errors.image = 'Missing image file'
    if (!event_id) errors.event_id = 'Missing event_id'
    if (!vendor_address) errors.vendor_address = 'Missing vendor wallet address'

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        missingFields: errors,
      })
      return
    }

    // Log file buffer info untuk debug
    console.log('File buffer length:', file.buffer.length)
    console.log('File originalname:', file.originalname)
    console.log('File first 16 bytes:', file.buffer.slice(0, 16))
    // Upload image to IPFS
    const imageCid = await uploadToIPFS(file.buffer)
    const imageIpfsUrl = `ipfs://${imageCid}`

    // Simpan ke event_certificates (ambil vendor.id dari wallet_address)
    const vendorResult = await pool.query(  
      'SELECT id FROM vendors WHERE LOWER(wallet_address) = $1',
      [vendor_address.toLowerCase()]
    )
    if (vendorResult.rows.length === 0) {
      res.status(404).json({ error: 'Vendor not found' })
      return
    }
    const vendorId = vendorResult.rows[0].id

    await pool.query(`
      INSERT INTO event_certificates (event_id, url_certificate, uploaded_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (event_id) DO UPDATE SET url_certificate = EXCLUDED.url_certificate
    `, [event_id, imageIpfsUrl, vendorId])

    const metadata = {
      name,
      description,
      image: imageIpfsUrl,
      user_address
    }

    // Upload metadata to IPFS
    const metadataCid = await uploadToIPFS(JSON.stringify(metadata))
    const tokenURI = `ipfs://${metadataCid}`

    // Convert tokenURI to gateway URL
    let urlMetadata = ''
    if (tokenURI.startsWith('ipfs://')) {
      const hash = tokenURI.replace('ipfs://', '')
      urlMetadata = `https://${hash}.ipfs.w3s.link/`
    }

    // Convert image field in metadata to gateway URL for urlCertificate
    let urlCertificate = ''
    if (metadata.image && metadata.image.startsWith('ipfs://')) {
      const imageHash = metadata.image.replace('ipfs://', '')
      urlCertificate = `https://${imageHash}.ipfs.w3s.link/`
    }

    res.status(201).json({
      message: 'Upload successful',
      event_id,
      tokenURI,
      urlCertificate: imageIpfsUrl
    })
  } catch (error) {
    console.error('Upload failed:', error)
    if (error instanceof Error) {
      if (error.message.includes('IPFS')) {
        res.status(503).json({
          error: 'IPFS service unavailable',
          details: error.message
        })
        return
      }
      if (error.message.includes('invalid file')) {
        res.status(400).json({
          error: 'Invalid file format',
          details: error.message
        })
        return
      }
    }
    res.status(500).json({
      error: 'Internal server error during upload',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router