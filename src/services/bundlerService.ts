import { JsonRpcProvider } from '@ethersproject/providers'

/**
 * Retrieves the EIP-4337 bundler provider.
 * @returns The EIP-4337 bundler provider.
 */
function getEip4337BundlerProvider(): JsonRpcProvider {
  const provider = new JsonRpcProvider(
    'https://api.pimlico.io/v1/sepolia/rpc?apikey=690deb0b-19a1-4bab-8684-30b7667da883'
  )
  return provider
}

export { getEip4337BundlerProvider }
