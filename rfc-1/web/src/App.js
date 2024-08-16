import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState('0');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [ws, setWs] = useState(null);

  useEffect(() => {
      const initialize = async () => {
        const newWs = new WebSocket('ws://localhost:8080');
        newWs.onopen = () => {
          console.log('Connected to central server');
        };
        newWs.onmessage = async (event) => {
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            try {
              const data = JSON.parse(text);
              if (data.type === 'NEW_BLOCK') {
                console.log('New block received:', data.block);
              }
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          } else {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'NEW_BLOCK') {
                console.log('New block received:', data.block);
              }
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          }
        };
        setWs(newWs);
    
        const savedWallet = localStorage.getItem('wallet');
        if (savedWallet) {
          const walletData = JSON.parse(savedWallet);
          setWallet(walletData);
        }
      };
      initialize();
  }, []);

  const createWallet = () => {
    const newWallet = ethers.Wallet.createRandom();
    const walletData = {
      address: newWallet.address,
      privateKey: newWallet.privateKey,
    };
    setWallet(walletData);
    localStorage.setItem('wallet', JSON.stringify(walletData));
  };

  const sendTransaction = () => {
    if (!wallet || !recipient || !amount || !ws) return;

    const transaction = {
      from: wallet.address,
      to: recipient,
      amount: parseFloat(amount),
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify({ type: 'NEW_TRANSACTION', transaction }));
    alert('Transaction sent to miners');
  };

  return (
    <div className="App">
      <h1>Simple Web 3 Wallet</h1>
      {wallet ? (
        <div>
          <p>Address: {wallet.address}</p>
          <p>Balance: {balance} Coins</p>
          <h2>Send Transaction</h2>
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={sendTransaction}>Send</button>
        </div>
      ) : (
        <button onClick={createWallet}>Create Wallet</button>
      )}
    </div>
  );
}

export default App;