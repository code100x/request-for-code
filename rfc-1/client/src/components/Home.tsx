import React, { useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const Title = styled.h1`
  color: #333;
`;

const Button = styled.button`
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  margin: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #0056b3;
  }
`;

const WalletInfo = styled.pre`
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin-top: 20px;
  width: 100%;
  max-width: 600px;
  word-wrap: break-word;
  color: black;
`;

const Home: React.FC = () => {
    const [wallet, setWallet] = useState<any>(null);
    const [transaction, setTransaction] = useState<any>({});

    const createWallet = async () => {
        try {
            const response = await axios.post('http://localhost:3000/createWallet');
            setWallet(response.data);
        } catch (error) {
            console.error('Error creating wallet:', error);
        }
    };

    const createTransaction = () => {
        // Here you create the transaction object
        const newTransaction = {
            fromAddress: wallet?.address,
            toAddress: 'recipientAddressHere', // Replace with actual recipient address
            amount: 100, // Replace with the actual amount
            timestamp: Date.now(),
        };
        setTransaction(newTransaction);
    };

    const signTransaction = async () => {
        if (!transaction) {
            console.error('Transaction is not created yet');
            return;
        }
        try {
            console.log("Signing transaction:", transaction);
            const response = await axios.post('http://localhost:3000/signTransaction', { transaction, privateKey: wallet.privateKey });
            setTransaction(response.data); // Store the signed transaction
        } catch (error) {
            console.error('Error signing transaction:', error);
        }
    };

    const sendTransaction = async () => {
        try {
            console.log(transaction)
            await axios.post('http://localhost:3000/sendTransaction', { transaction });
            alert('Transaction sent successfully!');
        } catch (error) {
            console.error('Error sending transaction:', error);
        }
    };

    return (
        <Container>
            <Title>Bitcoin-like App</Title>
            <div>
                <Button onClick={createWallet}>Create Wallet</Button>
                <Button onClick={createTransaction}>Create Transaction</Button>
                <Button onClick={signTransaction}>Sign Transaction</Button>
                <Button onClick={sendTransaction}>Send Transaction</Button>
            </div>

            {wallet && (
                <WalletInfo>
                    <h2>Wallet</h2>
                    {JSON.stringify(wallet, null, 2)}
                </WalletInfo>
            )}

            {transaction && (
                <WalletInfo>
                    <h2>Transaction</h2>
                    {JSON.stringify(transaction, null, 2)}
                </WalletInfo>
            )}
        </Container>
    );
};

export default Home;
