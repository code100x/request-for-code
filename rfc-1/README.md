Create a simple Bitcoin like server that has the following components - 

1. Central server - A central websocket server that all miners connect to to exchange messages
2. Miner server - 
 - Code that miners can run to be able to create blocks, do proof of work, broadcast the block via the central server. 
 - Code that verifies the signature, balances and creates / adds a block
 - Code should reject smaller blockchains/erronours blocks
 - Should be able to catch up to the blockchain when the server starts
3. Frontend -
 - Lets the user create a BTC wallet
 - Lets the user sign a txn, send it over to one of the miner servers


Tech stack - Preferably Node.js/Golang for the servers


## Bounties
1. Simple Servers without UTXOs (in memory balances) - $200
2. UTXOs for ins and outs - $200 (for point 1) + $200
