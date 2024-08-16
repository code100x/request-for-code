document.getElementById('create-wallet').addEventListener('click', async () => {
    const response = await fetch('/create-wallet');
    const wallet = await response.json();
    document.getElementById('wallet-info').textContent = `Public Key:\n${wallet.publicKey}\n\nPrivate Key:\n${wallet.privateKey}`;
    document.getElementById('transaction-section').style.display = 'block';
});

document.getElementById('sign-transaction').addEventListener('click', async () => {
    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('amount').value;
    const privateKey = document.getElementById('wallet-info').textContent.split('\n\n')[1].split('\n')[1];
    const transaction = { from: 'You', to: recipient, amount };
    const response = await fetch('/sign-txn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey, transaction })
    });
    const signedTxn = await response.json();
    document.getElementById('transaction-info').textContent = `Signed Transaction:\n${JSON.stringify(signedTxn, null, 2)}`;
});
