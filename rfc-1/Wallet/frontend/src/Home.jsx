import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async () => {
    try {
      const response = await axios.post('http://localhost:3004/signup', {
        username,
        password,
      });

      if (response.data.res) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', username);
        localStorage.setItem('index', '0');

        const mnemonicResponse = await axios.post('http://localhost:3004/generate-mnemonic');
        localStorage.setItem('mnemonic', mnemonicResponse.data.mnemonic);

        navigate('/dashboard');
      } else {
        alert(response.data.msg);
      }
    } catch (error) {
      console.error('Sign-up error:', error);
      alert('Error signing up. Please try again later.');
    }
  };
  //signin
  const handleSignIn = async () => {
    try {
      const response = await axios.post('http://localhost:3004/signin', {
        username,
        password,
      });

      if (response.data.res) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', username);
        localStorage.setItem('index', '0');

        navigate('/dashboard');
      } else {
        alert(response.data.msg);
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      alert('Error signing in. Please try again later.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Welcome to Wallet</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <button
        onClick={handleSignUp}
        className="w-full bg-blue-500 text-white py-2 rounded mb-4"
      >
        Sign Up
      </button>
      <button
        onClick={handleSignIn}
        className="w-full bg-blue-500 text-white py-2 rounded mb-4"
      >
        Sign In
      </button>
    </div>
  );
}

export default Home;
