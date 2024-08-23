import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Transaction.css'; // Assuming you have an external CSS file for custom styles

export default function Transactions() {

    const [privateKey, setPrivateKey] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [address, setAddress] = useState('');
    const [transaction, setTransaction] = useState({ from: '', to: '', amount: 0 });
    const [signTransactionHash, setSignTransactionHash] = useState('');
    const [blockchain, setBlockchain] = useState([]);

    useEffect(() => {
        fetchBlockchain();
        const interval = setInterval(fetchBlockchain, 1000); // Poll every 5 seconds
        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    const fetchBlockchain = async () => {
        try {
            const response = await axios.get('http://localhost:8081/blockchain');
            setBlockchain(response.data);
        } catch (error) {
            console.error('Error fetching blockchain:', error);
        }
    };

    const handleGenerateWallet = async () => {
        try {
            const response = await axios.get('http://localhost:8081/genWallet');
            const { privateKey, publicKey, address } = response.data;
            setPrivateKey(privateKey);
            setPublicKey(publicKey);
            setAddress(address);
            setTransaction({ ...transaction, from: address }); // Set the from address
        } catch (error) {
            console.error('Error generating wallet:', error);
        }
    }

    const handleSignAndSubmitTransaction = async () => {
        try {
            // Sign the transaction
            const signResponse = await axios.post('http://localhost:8081/signTransaction', {
                privateKey: privateKey,
                transaction: {
                    from: transaction.from,
                    to: transaction.to,
                    amount: transaction.amount
                }
            });
            const signature = signResponse.data.signature;
            console.log(signature);
            setSignTransactionHash(signature);

            // Submit the transaction
            const submitResponse = await axios.post('http://localhost:8081/transaction', {
                from: transaction.from,
                to: transaction.to,
                amount: transaction.amount,
                signature: signature,
                publicKey: publicKey
            });
            console.log(submitResponse.data);

            // Fetch the latest blockchain after submitting the transaction
            fetchBlockchain();
        } catch (error) {
            console.error(error);
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="transactions-container">

            <h2>Blockchain</h2>
            <div className="blockchain-container">
                {blockchain.map((block, index) => (
                    <div key={index} className="block">
                        <h3>Block {block.index}</h3>
                        <p><strong>Nonce:</strong> {block.nonce}</p>
                        <p>
                            <strong>Transaction : </strong>
                            {block.transactions.reduce((total, tx) => total + tx.amount, 0)} BTC
                        </p>
                        <p><strong>Timestamp:</strong> {new Date(block.timestamp).toLocaleString()}</p>
                        <p><strong>Previous Hash:</strong> {block.previousHash.length > 12 ? `${block.previousHash.substring(0, 12)}...` : block.previousHash}</p>
                        <p><strong>Hash:</strong>{block.hash.length > 12 ? `${block.hash.substring(0, 12)}...` : block.hash} </p>
                    </div>
                ))}
            </div>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="wallet-container col-md-6">
                        <h2>Bitcoin Wallet</h2>
                        <button onClick={handleGenerateWallet} className="generate-wallet-btn btn btn-primary">Generate Wallet</button>
                        <div className="transaction-form mt-4">
                            <input
                                type='text'
                                className="form-control mb-2"
                                placeholder='To Address'
                                value={transaction.to}
                                onChange={(e) => setTransaction({ ...transaction, to: e.target.value })}
                            />
                            <input
                                type='number'
                                className="form-control mb-2"
                                placeholder='Amount (BTC)'
                                value={transaction.amount}
                                onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })}
                            />
                            <button onClick={handleSignAndSubmitTransaction} className="sign-transaction-btn btn btn-success">Sign and Submit Transaction</button>
                        </div>
                    </div>
                    <div className="submit-transaction-container col-md-6 mt-4 mt-md-0">
                        <div className="wallet-details">
                            <div className="key-item">
                                <div className="key-field" onClick={() => copyToClipboard(privateKey)}>
                                    <p><strong>Private Key:</strong> {privateKey.substring(0, 12)}...{privateKey.substring(privateKey.length - 12, privateKey.length)}</p>
                                </div>
                            </div>
                            <div className="key-item">
                                <div className="key-field" onClick={() => copyToClipboard(publicKey)}>
                                    <p><strong>Public Key:</strong> {publicKey.substring(0, 12)}...{publicKey.substring(publicKey.length - 12, publicKey.length)}</p>
                                </div>
                            </div>
                            <div className="key-item">
                                <div className="key-field" onClick={() => copyToClipboard(address)}>
                                    <p><strong>Address:</strong> {address}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
