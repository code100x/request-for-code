# Bitcoin-like Server Frontend

This code provides the frontend interface for a Bitcoin-like server. It allows users to create wallets and initiate transactions. Transactions are sent to a miner server in real-time, where blocks are created, validated, and added to the blockchain.

## Installation

To set up the development environment, follow these steps:

1. Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2. Install all required dependencies:
    ```bash
    npm install
    ```

3. Start the development server:
    ```bash
    npm run dev
    ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## Testing the Application

Before testing the frontend application, ensure that the backend server is running without any errors.

### Steps to Test

1. Open [http://localhost:3000](http://localhost:3000) in your browser.

2. Open a new tab and enter [http://localhost:3000/all-blocks](http://localhost:3000/all-blocks). You should see a display showing 0 blocks created initially.

3. On the homepage (`/`), create a new wallet and submit a transaction.

4. Return to the "All Blocks" page. You should see that the newly created block has been added successfully.

##