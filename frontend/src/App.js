import React, { useState } from 'react';
import './App.css'; 
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 

const formatMnemonic = (mnemonic) => {
  const words = mnemonic.split(' ');
  const groups = [];
  
  for (let i = 0; i < words.length; i += 4) {
    groups.push(words.slice(i, i + 4).join(' '));
  }

  return groups.map((group, index) => (
    <div key={index} className="mnemonic-group">
      {group}
    </div>
  ));
};

const App = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transaction, setTransaction] = useState('');
  const [amount, setAmount] = useState('');

  const createWallet = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/create-wallet');
      const data = await response.json();
      setWallet(data);
      setError('');
    } catch (error) {
      toast.error('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchUTXOs = async (address) => {
    try {
      const response = await fetch(`http://localhost:5000/utxos/${address}`);
      const utxos = await response.json();
      console.log(utxos);
      return utxos;
    } catch (error) {
      toast.error('Error fetching UTXOs');
      return [];
    }
  };

  const selectUTXOs = (utxos, amount) => {
    let selectedUTXOs = [];
    let total = 0;
  
    for (const utxo of utxos) {
      selectedUTXOs.push(utxo);
      total += utxo.amount;
      if (total >= amount) break; 
    }
  
    if (total < amount) {
      throw new Error('Insufficient funds');
    }
  
    return selectedUTXOs;
  };
  
  const sendTransaction = async () => {
    if (wallet) {
      try {
       
        const utxos = await fetchUTXOs(wallet.address);

        if (utxos.length === 0) {
          toast.error('No UTXOs found. This wallet does not have any funds.');
          return;
        }

      
        const selectedUTXOs = selectUTXOs(utxos, parseFloat(amount));

        const inputs = selectedUTXOs.map(utxo => ({
          txId: utxo.txId,
          index: utxo.index,
          amount: utxo.amount,
          address: wallet.address
        }));

        const transactionData = {
          from: wallet.address,
          to: transaction,
          amount: parseFloat(amount),
          inputs,
          outputs: [
            { address: transaction, amount: parseFloat(amount) }
          ]
        };

        const response = await fetch('http://localhost:5000/send-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        });

        const result = await response.json();
        if (result.success) {
          toast.success('Transaction sent!');
        } else {
          toast.error('Transaction failed: ' + result.message);
        }

        setTransaction('');
        setAmount('');
      } catch (error) {
        toast.error('Error sending transaction');
      }
    }
  };
  
  return (
    <div className="App">
      <h1> Welcome To Ub3 Blockchain</h1>

      {!wallet ? (
        <div>
          <button 
            onClick={createWallet} 
            disabled={loading} 
            className="create-wallet-button"
          >
            {loading ? 'Creating...' : 'Create Wallet'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <div className="wallet-details">
          <h2>Wallet Created</h2>
          <p><strong>Address:</strong> {wallet.address}</p>
          <p><strong>Secret Key:</strong> {wallet.key}</p>
          <p><strong>Mnemonic Phrase:</strong></p>
          <div className="mnemonic">
            {formatMnemonic(wallet.mnemonic)}
          </div>

          <h3>Send Transaction</h3>
          <input
            type="text"
            value={transaction}
            onChange={(e) => setTransaction(e.target.value)}
            placeholder="Recipient Address"
            className="input-field"
          />
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="input-field"
          />
          <button 
            onClick={sendTransaction}
            className="send-transaction-button"
          >
            Send Transaction
          </button>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default App;
