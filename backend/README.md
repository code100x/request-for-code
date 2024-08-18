# Bitcoin-like Server

This code provides the Backend for a Bitcoin-like server. where it has  central websocket server that all miners connect to to exchange messages. Code that miners can run to be able to create blocks, do proof of work, broadcast the block via the central server. Code that verifies the signature, balances and creates / adds a block. It It able to catch up to the blockchain when the server starts.
## Installation

To set up the development environment, follow these steps:

1. Navigate to the frontend directory:
    ```bash
    cd backend
    ```

2. Install all required dependencies:
    ```bash
   npm install
    ```

3. Start the development server:
    ```bash
    nodemon app.ts
    ```
4. Start the central server:
    ```bash
    cd central-server
    nodemon index.ts    
    ```

5. Start the miner server:
    ```bash
    cd miner-server
    nodemon index.ts    
    ```

6. Setup your frontend directory and start it

7. Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## Testing the Application

Before testing the frontend application, ensure that the backend server is running without any errors.

### Steps to Test

1. Open [http://localhost:3000](http://localhost:3000) in your browser.

2. Open a new tab and enter [http://localhost:3000/all-blocks](http://localhost:3000/all-blocks). You should see a display showing 0 blocks created initially.

3. On the homepage (`/`), create a new wallet and submit a transaction.

4. Return to the "All Blocks" page. You should see that the newly created block has been added successfully.

##