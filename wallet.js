require('dotenv').config();
const { ethers } = require('ethers');

const NETWORKS = {
  ethereum: {
    name: 'ethereum',
    chainId: 1,
    rpc: process.env.ETHEREUM_RPC || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'
  },
  optimism: {
    name: 'optimism',
    chainId: 10,
    rpc: process.env.OPTIMISM_RPC || 'https://optimism-mainnet.infura.io/v3/YOUR_INFURA_KEY'
  },
  base: {
    name: 'base',
    chainId: 8453, // Base mainnet chainId (verify before production)
    rpc: process.env.BASE_RPC || 'https://mainnet.base.org' // swap for a reliable RPC/provider
  }
};

// create or load mnemonic
function createOrLoadMnemonic() {
  if (process.env.MNEMONIC && process.env.MNEMONIC.length > 0) {
    return process.env.MNEMONIC;
  }
  const randomMnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
  console.log('Generated mnemonic (store it securely):\n', randomMnemonic);
  return randomMnemonic;
}

async function makeWalletForNetwork(networkKey, index = 0) {
  const net = NETWORKS[networkKey];
  if (!net) throw new Error('Unknown network: ' + networkKey);

  const mnemonic = createOrLoadMnemonic();
  // BIP44 path m/44'/60'/0'/0/index works for EVM
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic).derivePath(`m/44'/60'/0'/0/${index}`);
  const wallet = new ethers.Wallet(hdNode.privateKey);

  const provider = new ethers.providers.JsonRpcProvider(net.rpc, net.chainId);
  const signer = wallet.connect(provider);

  console.log(`\nNetwork: ${net.name}`);
  console.log('Address:', await signer.getAddress());
  const balance = await provider.getBalance(await signer.getAddress());
  console.log('Balance (wei):', balance.toString());
  return { signer, provider, wallet, mnemonic };
}

// Example: send a small native transfer (ETH/OP/BASE)
async function sendNative(networkKey, to, amountEther) {
  const { signer } = await makeWalletForNetwork(networkKey);
  const tx = {
    to,
    value: ethers.utils.parseEther(amountEther.toString()),
    // gasLimit / gasPrice can be added; ethers will estimate
  };
  const response = await signer.sendTransaction(tx);
  console.log('Sent tx hash:', response.hash);
  const receipt = await response.wait();
  console.log('Receipt:', receipt.transactionHash, 'status:', receipt.status);
}

// Example usage
(async () => {
  try {
    // Check wallets on all networks
    await makeWalletForNetwork('ethereum', 0);
    await makeWalletForNetwork('optimism', 0);
    await makeWalletForNetwork('base', 0);

    // Uncomment to actually send (be sure you have funds and correct RPC)
    // await sendNative('optimism', '0xRecipientAddressHere', '0.001');
  } catch (err) {
    console.error(err);
  }
})();
