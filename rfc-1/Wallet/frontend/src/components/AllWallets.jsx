import { useState, useEffect } from "react";
import axios from 'axios';
import Editor from './Editor';

const AllWallets = ({ allwallets }) => {
    const [currentWallet, setCurrentWallet] = useState(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [refresh, setRefresh] = useState(false);

    const openEditor = (wallet) => {
        setCurrentWallet(wallet);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
    };

    const reloadBalances = () => {
        setRefresh(!refresh);
    };

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-6">
            {allwallets.map((wallet, index) => (
                <Wallet key={index} wallet={wallet} openEditor={openEditor} refresh={refresh} />
            ))}
            {editorOpen && currentWallet && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="relative bg-white p-6 rounded shadow-lg">
                        <button
                            onClick={closeEditor}
                            className="absolute top-0 right-0 mt-2 mr-2 text-gray-700 hover:text-gray-900"
                        >
                            &times;
                        </button>
                        <Editor 
                            currentWallet={currentWallet} 
                            onClose={() => {
                                closeEditor();
                                reloadBalances();
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const Wallet = ({ wallet, openEditor, refresh }) => {
    const NODE_URL = "http://localhost:3002";
    const [balance, setBalance] = useState(null);
    const [showPvt, setShowPvt] = useState(false);
    const [receiveMessage, setReceiveMessage] = useState('');

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const response = await axios.post(`${NODE_URL}/total-balance`, {
                    sender_pub_id: wallet.publicKey,
                });
                setBalance(response.data.totalBalance);
            } catch (error) {
                console.error('Error fetching balance:', error);
            }
        };

        fetchBalance();
    }, [wallet.publicKey, refresh]);

    const handleReceiveClick = () => {
        setReceiveMessage('Send your public key to the sender');
    };

    return (
        <div className="bg-white shadow-lg rounded-lg p-6 border">
            <div>
                <div className="text-gray-700 font-semibold">Balance:</div>
                <div className="text-gray-900">
                    {balance !== null ? `${balance} BTC` : 'Loading...'}
                </div>
            </div>
            <div className="mb-4">
                <div className="text-gray-700 font-semibold">Public Key:</div>
                <div className="text-gray-900 font-mono break-all">{wallet.publicKey}</div>
            </div>
            <div className="mb-4">
                <div className="text-gray-700 font-semibold">Private Key:</div>
                <div className="items-center">
                    {showPvt ? (
                        <div className="text-gray-900 font-mono break-all">{wallet.secretKey}</div>
                    ) : (
                        <div className="text-gray-500 font-mono">********</div>
                    )}
                    <div>
                        {!showPvt && <button
                            onClick={() => setShowPvt(true)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Reveal Private Key
                        </button>}
                        {showPvt && <button
                            onClick={() => setShowPvt(false)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Hide Private Key
                        </button>}
                    </div>
                </div>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={handleReceiveClick}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Receive
                </button>
                <button
                    onClick={() => openEditor(wallet)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Send
                </button>
            </div>
            {receiveMessage && (
                <div className="mt-4 text-green-600">
                    {receiveMessage}
                </div>
            )}
        </div>
    );
};

export default AllWallets;
