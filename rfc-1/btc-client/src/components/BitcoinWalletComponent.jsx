import { useState } from "react";
import useBitcoinWallet from "../hooks/useBitcoinWallet"; // Adjust the import path as necessary
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";

const BitcoinWalletComponent = () => {
  const {
    mnemonic,
    fromAddress,
    privateKey,
    generateWallet,
    createTransaction,
    message,
    setMessage,
  } = useBitcoinWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");

  function handleShowPrivateKey() {
    setShowPrivateKey(!showPrivateKey);
  }

  function clearMessage() {
    setMessage("");
  }

  async function handleMakeTransaction(e) {
    e.preventDefault();

    if (!toAddress || toAddress.length < 10) {
      setMessage("Please enter a valid recipient address.");
      return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    try {
      await createTransaction(toAddress, amount);
      setToAddress("");
      setAmount("");
    } catch (error) {
      setMessage(`Error creating transaction: ${error.message}`);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col items-center justify-center h-full bg-white shadow-md rounded-lg border border-gray-200">
      <h2 className="text-2xl font-semibold text-indigo-900 text-center mb-4">
        Bitcoin Wallet
      </h2>

      {privateKey ? (
        <div className="space-y-4">
          {mnemonic && (
            <p className="mt-2 p-3 bg-gray-100 rounded-md text-sm text-gray-700 break-all">
              <span className="font-semibold">Mnemonic :</span> {mnemonic}
            </p>
          )}

          {fromAddress && (
            <p className="mt-2 p-3 bg-gray-100 rounded-md text-sm text-gray-700 break-all">
              <span className="font-semibold">Bitcoin Address</span>{" "}
              {fromAddress}
            </p>
          )}

          <div>
            <h3 className="text-lg font-semibold flex items-center">
              Private Key
              <button
                onClick={handleShowPrivateKey}
                className="ml-2 text-gray-600 hover:text-gray-800"
              >
                {showPrivateKey ? (
                  <EyeSlashIcon className="w-5 h-5 inline" />
                ) : (
                  <EyeIcon className="w-5 h-5 inline" />
                )}
              </button>
            </h3>
            {showPrivateKey && (
              <p className="mt-2 p-3 bg-gray-100 rounded-md text-sm text-gray-700 break-all">
                {privateKey}
              </p>
            )}
          </div>

          <div className="mt-6">
            <input
              type="text"
              placeholder="To Address"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="mt-2 p-3 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Amount (BTC)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="any"
              className="mt-2 p-3 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleMakeTransaction}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 w-full"
            >
              Make Transaction
            </button>

            {message && (
              <p className="mt-4 p-2 bg-red-10 text-center rounded-md">
                {message}
                <button
                  onClick={clearMessage}
                  className="ml-2 text-sm text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <button
            onClick={generateWallet}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 w-full"
          >
            Generate Wallet
          </button>
        </div>
      )}
    </div>
  );
};

export default BitcoinWalletComponent;
