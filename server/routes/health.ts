import express, { Request, Response } from 'express'
import { getClient } from '../services/ipfsService'

const router = express.Router()

interface ServiceStatus {
  status: 'up' | 'down' | 'checking'
  error?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    server: {
      status: 'up'
      uptime: number
    }
    ipfs: ServiceStatus
    blockchain: ServiceStatus
  }
}

router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const health: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        server: {
          status: 'up',
          uptime: process.uptime()
        },
        ipfs: {
          status: 'checking'
        },
        blockchain: {
          status: 'checking'
        }
      }
    }

    // Check IPFS connection
    try {
      const client = await getClient()
      health.services.ipfs.status = 'up'
    } catch (error) {
      health.services.ipfs.status = 'down'
      health.services.ipfs.error = error instanceof Error ? error.message : String(error)
    }

    // Check blockchain connection
    try {
      const rpcUrl = process.env.SEPOLIA_RPC_URL
      if (!rpcUrl) {
        throw new Error('SEPOLIA_RPC_URL not configured')
      }

      // Simple fetch to check if RPC endpoint is accessible
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: [],
        }),
      })

      if (!response.ok) {
        throw new Error(`RPC endpoint returned ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error.message || 'RPC error')
      }

      health.services.blockchain.status = 'up'
    } catch (error) {
      health.services.blockchain.status = 'down'
      health.services.blockchain.error = error instanceof Error ? error.message : String(error)
    }

    // If any service is down, mark overall status as degraded
    if (health.services.ipfs.status === 'down' || health.services.blockchain.status === 'down') {
      health.status = 'degraded'
    }

    res.status(200).json(health)
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default router