import express, { Request, Response } from 'express'
import { verifyCertificate } from '../services/verifyService'

const router = express.Router()

router.get('/verifycertificate', async (req: Request, res: Response): Promise<void> => {
  console.log('=== VERIFY CERTIFICATE ENDPOINT HIT ===')
  console.log('Full URL:', req.url)
  console.log('Method:', req.method)
  
  const { ownerAddress, tokenId } = req.query
  
  console.log('Raw query:', req.query)
  console.log('ownerAddress received:', ownerAddress)
  console.log('TokenId received:', tokenId)
  
  if (!ownerAddress || !tokenId) {
    res.status(400).json({ error: 'Missing ownerAddress or tokenId' })
    return
  }
  
  try {
    const result = await verifyCertificate(ownerAddress as string, tokenId as string)
    
    if (!result) {
      res.status(404).json({
        error: 'Certificate verification failed',
        details: 'No result returned from verification service'
      })
      return
    }

    if (!result.valid) {
      res.status(404).json({
        error: 'Certificate not found or invalid',
        details: result.error
      })
      return
    }

    res.status(200).json(result)
  } catch (err) {
    console.error('Verification failed:', err)
    if (err instanceof Error) {
      if (err.message.includes('invalid token ID')) {
        res.status(404).json({ 
          error: 'Certificate not found',
          details: err.message 
        })
        return
      }
      if (err.message.includes('invalid ownerAddress')) {
        res.status(400).json({
          error: 'Invalid wallet ownerAddress',
          details: err.message
        })
        return
      }
      if (err.message.includes('network')) {
        res.status(503).json({
          error: 'Blockchain network unavailable',
          details: err.message
        })
        return
      }
    }
    res.status(500).json({ error: 'Verification failed' })
  }
})

export default router