export const formatAddress = (address: string, num: number = 6) => {
  return `${address.slice(0, num)}...${address.slice(-num)}`;
};
