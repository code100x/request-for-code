function App() {
  function clickHandler(){
    
  }
  return (
    <main className="flex justify-center h-screen item-center pt-36 bg-slate-700">
      <div className="text-center">
        <div className="text-6xl text-yellow-400">coin name airdrop/faucet server</div>
        <div className="text-2xl text-red-500">Need some coins to test the server, We are here for you</div>
        <div className="flex justify-center">
          <input className="border py-2 w-full mx-32" type="text" placeholder="your public key" />
        </div>
        <div>
          <div className="text-xl text-white">airdrop 10 coin to your wallet??</div>
          <button onClick={clickHandler} className="px-4 py-2 border bg-white rounded-md hover:bg-gray-100 font-medium" >YES Please</button>
        </div>
      </div>
    </main>
  )
}

export default App
