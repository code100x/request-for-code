import { useState } from 'react';
import axios from 'axios';

const Editor = ({ currentWallet, onClose }) => {
    const [recPubId, setRecPubId] = useState('');
    const [amount, setAmount] = useState('');
    const [feePreference, setFeePreference] = useState('low-fee');
    const [bannerMessage, setBannerMessage] = useState(null);
    const WALLET_URL = 'http://localhost:3004';

    const handleSubmitTransaction = async () => {
        const token = localStorage.getItem('token');

        try {
            const response = await axios.post(
                `${WALLET_URL}/wallet/submit-transaction`,
                {
                    sender_pub_id: currentWallet.publicKey,
                    receiver_pub_id: recPubId,
                    amount,
                    privateKey: currentWallet.secretKey,
                    feePreference,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBannerMessage('Transaction submitted successfully!');
            onClose(); // Close editor after successful submission
        } catch (error) {
            setBannerMessage('Error submitting transaction.');
            console.error('Error submitting transaction:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-lg p-6 relative w-96">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                >
                    &times;
                </button>
                {bannerMessage && (
                    <div className="bg-green-100 text-green-800 p-2 rounded mb-4">
                        {bannerMessage}
                    </div>
                )}
                <label htmlFor="receiverKey" className="block text-gray-700">
                    Enter Receiver's Public Key
                </label>
                <input
                    id="receiverKey"
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                    type="text"
                    placeholder="Receiver's public key"
                    value={recPubId}
                    onChange={(e) => setRecPubId(e.target.value)}
                />
                <label htmlFor="amount" className="block text-gray-700">
                    Enter Amount
                </label>
                <input
                    id="amount"
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                    type="text"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <label htmlFor="feePreference" className="block text-gray-700">
                    Fee Preference
                </label>
                <select
                    id="feePreference"
                    value={feePreference}
                    onChange={(e) => setFeePreference(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                >
                    <option value="low-fee">Low Fee</option>
                    <option value="less-dust">Less Dust</option>
                </select>
                <button
                    onClick={handleSubmitTransaction}
                    className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                    Submit Transaction
                </button>
            </div>
        </div>
    );
};

export default Editor;
