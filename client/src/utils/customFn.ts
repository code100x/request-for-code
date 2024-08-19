export const formatAddress = (address: string, num: number = 6) => {
  return `${address.slice(0, num)}...${address.slice(-num)}`;
};

export const formatAmount = (amount: number) => {
  return (amount / 100000000).toFixed(2);
};
