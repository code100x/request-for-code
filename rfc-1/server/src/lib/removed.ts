// let firsRunned = false;
// const firstTransaction = () => {
//   if (firsRunned) return;
//   firsRunned = true;
//   const baseTransaction = {
//     amount: 100,
//     from: Keypair.fromSecretKey(
//       bs58.decode(process.env.SECRET_KEY || "")
//     ).publicKey.toBase58(),
//     to: secAccount.publicKey,
//     timestamp: Date.now(),
//   };

//   const transaction = {
//     ...baseTransaction,
//     signature: bs58.encode(
//       nacl.sign.detached(
//         decodeUTF8(JSON.stringify(baseTransaction)),
//         bs58.decode(process.env.SECRET_KEY || "")
//       )
//     ),
//   };
//   io.to("miners").emit("transaction", transaction);
// };
