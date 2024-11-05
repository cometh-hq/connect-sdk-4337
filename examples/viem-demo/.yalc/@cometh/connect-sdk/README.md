# Connect SDK

Cometh Connect SDK allows developers to onboard their users with a seedless, gasless experience familiar to Web2 using Biometrics and web2 logins.

Account Abstraction (AA) improves transaction user experience by using smart contract wallets as primary accounts.

If you need more information on how to use the SDK check our [documentation](https://docs.cometh.io/connect/cometh-connect/what-is-connect)

## Instanciate Wallet

```javascript
import {
  ComethWallet,
  ConnectAdaptor,
  SupportedNetworks
} from '@cometh/connect-sdk'

const walletAdaptor = new ConnectAdaptor({
  chainId: SupportedNetworks.POLYGON,
  apiKey: API_KEY
})

const wallet = new ComethWallet({
  authAdapter: walletAdaptor,
  apiKey: API_KEY,
  rpcUrl: RPC_URL
})
```

To get an API key please [Contact us](https://www.cometh.io/)

## Available methods

### Create a Wallet

```javascript
await wallet.connect()
```

This function create a new wallet and connect to the API.

### Get Address

```javascript
wallet.getAddress()
```

This function returns the address of the wallet.

### Instanciate a Wallet

```javascript
await wallet.connect(walletAddress)
```

You can also connect to a previously created wallet. You'll have to provide the wallet address of the previously created wallet.

### Logout

```javascript
await wallet.logout()
```

This function logs the user out and clears the cache.

### Send transaction

```javascript
const txParams = { to: DESTINATION, value: VALUE, data: DATA }
const tx = await wallet.sendTransaction(txParams)
const txPending = await provider.getTransaction(tx.safeTxHash); 
const txReceipt = await txPending.wait();
```

This function relays the transaction data to the target address. The transaction fees can be sponsored.

### Send Batch transactions

```javascript
const txParams = [
  { to: DESTINATION, value: VALUE, data: DATA },
  { to: DESTINATION, value: VALUE, data: DATA }
]
const tx = await wallet.sendBatchTransactions(txParams)
const txPending = await provider.getTransaction(tx.safeTxHash); 
const txReceipt = await txPending.wait();
```

This function relays a batch of transaction data to the targeted addresses. The transaction fees can be sponsored as well.

### Sign Message

```javascript
const signature = await wallet.signMessage('hello')
```

Sign the given message using the EOA, owner of the smart wallet.

## Go further

### Interact with contract interface

```javascript
import {
  ComethWallet,
  ConnectAdaptor,
  ComethProvider,
  SupportedNetworks
} from '@cometh/connect-sdk'

const walletAdaptor = new ConnectAdaptor({
  chainId: SupportedNetworks.POLYGON,
  apiKey: API_KEY,
  passkeyName: passkeyName
})

const wallet = new ComethWallet({
  authAdapter: walletAdaptor,
  apiKey: API_KEY,
  rpcUrl: RPC_URL
})

const provider = new ComethProvider(wallet)

const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  nftContractAbi,
  provider.getSigner()
)

const tx = await nftContract.count()
const txReceipt = await tx.wait()
```

You can also interact with the interface of a contract, calling directly the contract functions.

### Web3Onboard connector

```javascript
import {
  ConnectAdaptor,
  SupportedNetworks,
  ConnectOnboardConnector
} from '@cometh/connect-sdk'
import injectedModule from '@web3-onboard/injected-wallets'
import Onboard from '@web3-onboard/core'

const walletAdaptor = new ConnectAdaptor({
  chainId: SupportedNetworks.POLYGON,
  apiKey: API_KEY,
  passkeyName: passkeyName
})

const connectOnboardConnector = ConnectOnboardConnector({
  apiKey: API_KEY,
  authAdapter: walletAdaptor,
  rpcUrl: RPC_URL
})

const web3OnboardInstance = Onboard({
  wallets: [injectedModule(), connectOnboardConnector],
  chains: [
    {
      id: ethers.utils.hexlify(DEFAULT_CHAIN_ID),
      token: 'MATIC',
      label: 'Matic Mainnet',
      rpcUrl: 'https://polygon-rpc.com'
    }
  ]
})
```

You can also incorporate cometh connect to web3Onboard wallet modal solution.
