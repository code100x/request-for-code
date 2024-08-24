import React, { useState, useEffect, useCallback } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './App.css';

function App() {
  const [wallet, setWallet] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [logs, setLogs] = useState([]);
  const [blockchain, setBlockchain] = useState([]);
  const [ws, setWs] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const addLog = useCallback((message) => {
    console.log(`[CLIENT] ${message}`);
    setLogs(prevLogs => [...prevLogs, { message, timestamp: new Date().toISOString() }]);
  }, []);

  useEffect(() => {
    const newWs = new WebSocket('ws://localhost:8080');
    
    newWs.onopen = () => {
      addLog('Connected to central server');
      newWs.send(JSON.stringify({ type: 'REGISTER', role: 'client' }));
    };

    newWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        addLog(`Received message: ${message.type}`);

        switch (message.type) {
          case 'BLOCKCHAIN':
            setBlockchain(message.chain);
            addLog(`Received blockchain with ${message.chain.length} blocks`);
            break;
          case 'PENDING_TRANSACTION':
            addLog(`New pending transaction: ${JSON.stringify(message.transaction)}`);
            break;
          case 'NEW_BLOCK':
            setBlockchain(prevChain => [...prevChain, message.block]);
            addLog(`New block added to blockchain: ${message.block.hash}`);
            break;
          default:
            addLog(`Received unknown message type: ${message.type}`);
        }
      } catch (error) {
        addLog(`Error processing message: ${error.message}`);
        console.error('Full error:', error);
      }
    };

    newWs.onerror = (error) => {
      addLog(`WebSocket error: ${error.message}`);
      console.error('WebSocket error:', error);
    };

    newWs.onclose = (event) => {
      addLog(`WebSocket connection closed: ${event.reason}`);
      console.log('WebSocket close event:', event);
    };

    setWs(newWs);

    return () => {
      if (newWs) newWs.close();
    };
  }, [addLog]);

  async function createWallet() {
    addLog('Creating new wallet...');
    try {
      const keypair = await window.crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        true,
        ["sign", "verify"]
      );
      const publicKey = await getPublicKey(keypair.publicKey);
      const privateKey = await getPrivateKey(keypair.privateKey);
      setWallet({ publicKey, privateKey, keypair });
      addLog('Wallet created successfully');
    } catch (error) {
      addLog(`Error creating wallet: ${error.message}`);
      console.error('Full wallet creation error:', error);
    }
  }

  async function sendTransaction() {
    if (!wallet) {
      addLog('No wallet found. Please create a wallet first.');
      return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog('WebSocket is not connected. Please try again in a moment.');
      return;
    }

    addLog('Preparing transaction...');
    const transaction = {
      fromAddress: wallet.publicKey,
      toAddress: recipientAddress,
      amount: parseFloat(amount)
    };

    try {
      addLog('Signing transaction...');
      const signature = await signTransaction(wallet.keypair.privateKey, transaction);
      transaction.signature = signature;

      addLog(`Transaction created: ${JSON.stringify(transaction)}`);
      addLog(`Signature: ${signature}`);

      ws.send(JSON.stringify({
        type: 'NEW_TRANSACTION',
        transaction: transaction
      }));

      addLog('Transaction sent to network');
      setRecipientAddress('');
      setAmount('');
    } catch (error) {
      addLog(`Error sending transaction: ${error.message}`);
      console.error('Full transaction error:', error);
    }
  }

  async function getPublicKey(publicKey) {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(exported)));
  }

  async function getPrivateKey(privateKey) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(exported)));
  }

  async function signTransaction(privateKey, transaction) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      amount: transaction.amount
    }));
    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: {name: "SHA-256"},
      },
      privateKey,
      data
    );
    return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
  }

  return (
    <div className="App">
      <h1>Simple Bitcoin-like Wallet</h1>
      <div className="main-content">
        <div className="wallet-section">
          <button className="create-wallet-btn" onClick={createWallet}>Create New Wallet</button>
          {wallet && (
            <div className="wallet-info">
              <h2>Wallet Info</h2>
              <p><strong>Public Key:</strong> {wallet.publicKey.slice(0, 20)}...</p>
              <p>
                <strong>Private Key:</strong> 
                {showPrivateKey ? wallet.privateKey.slice(0, 20) + '...' : '••••••••••••••••••••'}
                <button className="toggle-key-btn" onClick={() => setShowPrivateKey(!showPrivateKey)}>
                  {showPrivateKey ? <FaEyeSlash /> : <FaEye />}
                </button>
              </p>
            </div>
          )}
          <div className="transaction-section">
            <h2>Send Transaction</h2>
            <input 
              type="text" 
              placeholder="Recipient Address" 
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
            <input 
              type="number" 
              placeholder="Amount" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button className="send-btn" onClick={sendTransaction}>Send</button>
          </div>
        </div>
        <div className="blockchain-explorer">
          <h2>Blockchain Explorer</h2>
          <div className="blockchain-container">
            {blockchain.map((block, index) => (
              <div key={index} className="block">
                <h3>Block #{block.index}</h3>
                <p><strong>Hash:</strong> {block.hash.slice(0, 15)}...</p>
                <p><strong>Previous Hash:</strong> {block.previousHash.slice(0, 15)}...</p>
                <p><strong>Timestamp:</strong> {new Date(block.timestamp).toLocaleString()}</p>
                <p><strong>Transactions:</strong> {block.transactions.length}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="logs">
        <h2>Logs</h2>
        <div className="logs-container">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;