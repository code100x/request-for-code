# Bitcoin-like Server Project

## Overview

This project implements a simplified Bitcoin-like server, designed to simulate key aspects of the Bitcoin network. The project consists of a central WebSocket server and multiple miner servers. Each miner maintains its own transaction pool, mines blocks at regular intervals, and interacts with the central server to receive new transactions.

## Architecture

The project consists of the following components:

1. **Central Server** (`centralServer.js`)
   - Acts as the central hub for broadcasting transactions to all connected miners.
   - Manages WebSocket connections and ensures that all miners receive the latest transactions.
   - Facilitates decentralized block mining by keeping miners in sync with the transaction pool.

2. **Miner Server** (`minerServer.js`)
   - Each miner operates independently, maintaining its own transaction pool.
   - Mines blocks at a fixed interval (e.g., every 30 seconds).
   - Interacts with the central server to receive new transactions and broadcast mined blocks.

3. **Blockchain Utilities** (`blockchainUtils.js`)
   - Contains utility functions for blockchain operations, including block creation, transaction handling, and validation.
   - Ensures consistent and reliable blockchain functionality across all servers.

## Usage

Use the `fund-wallets.txt` file to view the initial accounts created to send transactions.

### API Endpoints

The following APIs are exposed via an Express server:

- **Send Transaction**: Allows sending transactions to a recipient.
  - **Endpoint**: `POST /sendTransaction`
  - **Request Body**:
    - `recipient` (string): The recipient's address (40 characters).
    - `amount` (number): The amount to send (must be greater than 0).
    - `privateKey` (string): The private key for signing the transaction (64 characters).
  - **Response**: `Transaction processed` if successful, with error messages for invalid inputs.

- **Get Balances**: Retrieves the balance of all accounts.
  - **Endpoint**: `GET /getBalances`
  - **Response**: A JSON object containing all account balances.

- **Get Block Height**: Retrieves the current block height of the blockchain.
  - **Endpoint**: `GET /getBlockHeight`
  - **Response**: A JSON object with the current block height.

- **Get Balance**: Retrieves the balance of a specific address.
  - **Endpoint**: `GET /getBalance/:address`
  - **Response**: A JSON object with the balance of the specified address.

### Running the Servers

To run the project, follow these steps:

1. **Start the Central Server**:
   ```bash
   node centralServer.js

2. **Start the Miner Servers**:
   ```bash
   node minerServer.js
   ```

3. **Access the API Endpoints**:
    - Send transactions to the central server using the provided APIs.
    - View the balances of all accounts using the `/getBalances` endpoint.
    - Monitor the block height using the `/getBlockHeight` endpoint.