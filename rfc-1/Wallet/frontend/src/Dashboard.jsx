import { useState, useEffect } from 'react';
import axios from 'axios';
import AllWallets from './components/AllWallets'


function Dashboard() {
  const [mnemonic, setMnemonic] = useState('');
  const [wallets, setWallets] = useState([]);
  const [privateKey, setPrivateKey] = useState('');
  const [balance, setBalance] = useState(0);
  const [currentWallet, setCurrentWallet] = useState(null);
  // input done
  const [amount, setAmount] = useState(0);
  const [receiverPubKey, setReceiverPubKey] = useState('');
  const [feePreference, setFeePreference] = useState('low-fee');

  const WALLET_URL = "http://localhost:3004";
  const NODE_URL = "http://localhost:3002";

  useEffect(() => {
    const storedMnemonic = localStorage.getItem('mnemonic');
    if (storedMnemonic) {
      setMnemonic(storedMnemonic);
    }
    fetchAllWallets();
  }, []);

  const fetchAllWallets = async () => {
    const token = localStorage.getItem('token');

    try {
      const username = localStorage.getItem('username');
      const response = await axios.post(`${WALLET_URL}/wallets`, { username }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setWallets(response.data);
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const handleCreateWallet = async () => {
    const currentIndex = parseInt(localStorage.getItem('index'), 10);
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    try {
      const response = await axios.post(
        `${WALLET_URL}/create-wallet`,
        { mnemonic, currentIndex, username },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const walletData = response.data;
      localStorage.setItem('index', (currentIndex + 1).toString());
      setWallets([...wallets, walletData]);

      const balanceResponse = await axios.post(
        `${NODE_URL}/total-balance`,
        { sender_pub_id: walletData.publicKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBalance(balanceResponse.data.totalBalance);
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  const handleGetWalletsFromMnemonic = async () => {
    const token = localStorage.getItem('token');

    try {
      if (!localStorage.getItem('mnemonic') && mnemonic) {
        localStorage.setItem('mnemonic', mnemonic);
      }

      const response = await axios.post(
        `${WALLET_URL}/derive-from-mnemonic`,
        { mnemonic, currentIndex: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWallets([response.data]);
    } catch (error) {
      console.error('Error retrieving wallets:', error);
    }
  };

  const handleGetWalletFromPrivateKey = async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${WALLET_URL}/derive-from-private`,
        { privateKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const walletData = response.data;
      setCurrentWallet(walletData);

      await axios.post(
        `${WALLET_URL}/save-wallet`,
        {
          username: localStorage.getItem('username'),
          public_key: walletData.publicKey,
          private_key: walletData.privateKey,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error retrieving wallet:', error);
    }
  };

  const handleSubmitTransaction = async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${WALLET_URL}/wallet/submit-transaction`,
        {
          sender_pub_id: currentWallet.publicKey,
          receiver_pub_id: receiverPubKey,
          amount,
          privateKey: currentWallet.privateKey,
          feePreference,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Transaction submitted');
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }
  };

  return (
    <main className="">
      <div className="flex justify-between px-4 py-2">
        <h1 className="text-3xl font-bold text-center mb-8">Wallet Dashboard</h1>
        {/* Create Wallet */}
        <div className="mb-8">
          <button
            onClick={handleCreateWallet}
            className="w-full bg-green-500 text-white py-2 px-4 rounded mb-4"
          >
            Create New Wallet
          </button>
        </div>
      </div>
      <div className="h-full">
        <AllWallets allwallets={wallets} />
      </div>
      {/* Get Wallets from Mnemonic */}
      {/* <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Get Wallets from Mnemonic</h2>
        <input
          type="text"
          placeholder="Mnemonic"
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          onClick={handleGetWalletsFromMnemonic}
          className="w-full bg-yellow-500 text-white py-2 rounded"
        >
          Get Wallets
        </button>
      </div> */}
      {/* Get Wallet from Private Key */}
      {/* <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Get Wallet from Private Key</h2>
        <input
          type="text"
          placeholder="Private Key"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button
          onClick={handleGetWalletFromPrivateKey}
          className="w-full bg-purple-500 text-white py-2 rounded"
        >
          Get Wallet
        </button>
      </div> */}
    </main>
  );
}

export default Dashboard;


// max-w-4xl mx-auto p-4