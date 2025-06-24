import express, { Request, Response } from 'express'
import multer from 'multer'
import { uploadToIPFS } from '../services/ipfsService'

const router = express.Router()
const upload = multer() // Use memory storage for file uploads

router.post('/upload', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, to } = req.body
    const file = (req as any).file

    // Detailed validation
    const errors: { [key: string]: string } = {}
    if (!name) errors.name = 'Missing name field'
    if (!description) errors.description = 'Missing description field'
    if (!to) errors.to = 'Missing to (wallet address) field'
    if (!file) errors.image = 'Missing image file'

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        missingFields: errors,
      })
      return
    }

    // Upload image to IPFS
    const imageCid = await uploadToIPFS(file.buffer)
    const metadata = {
      name,
      description,
      image: `ipfs://${imageCid}`,
      to
    }

    // Upload metadata to IPFS
    const metadataCid = await uploadToIPFS(JSON.stringify(metadata))
    const tokenURI = `ipfs://${metadataCid}`

    res.status(201).json({
      message: 'Upload successful',
      tokenURI,
      certificateType: description,
      to,
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