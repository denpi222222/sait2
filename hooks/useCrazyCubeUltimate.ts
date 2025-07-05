import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import CrazyCubeUltimateABI_JSON from '../contracts/abi/CrazyCubeUltimate.json'; // Импорт ABI
import { NFT_CONTRACT_ADDRESS, MAIN_CHAIN_ID } from '../config/wagmi'; // Адрес контракта и ID сети

// В Wagmi v2 ABI передается как массив. Если ваш JSON файл это объект с полем 'abi', используйте CrazyCubeUltimateABI_JSON.abi
// Если JSON файл это непосредственно массив ABI, то используйте CrazyCubeUltimateABI_JSON
// Эта строка пытается обработать оба случая.
const contractAbi = (CrazyCubeUltimateABI_JSON as any).abi || CrazyCubeUltimateABI_JSON;

export function useCrazyCubeUltimate() {
  const { address: accountAddress, chainId } = useAccount();
  const isConnectedToCorrectChain = chainId === MAIN_CHAIN_ID;

  // --- Функции для чтения данных с контракта ---

  // Получение общего количества NFT (totalSupply)
  const { 
    data: totalSupply, 
    isLoading: isLoadingTotalSupply, 
    error: errorTotalSupply, 
    refetch: refetchTotalSupply 
  } = useReadContract({
    abi: contractAbi,
    address: NFT_CONTRACT_ADDRESS,
    functionName: 'totalSupply',
    chainId: MAIN_CHAIN_ID,
    query: {
      enabled: isConnectedToCorrectChain, // Запрос активен, если подключены к правильной сети
    },
  });

  // Получение баланса NFT для текущего аккаунта (balanceOf)
  const { 
    data: balanceOf, 
    isLoading: isLoadingBalanceOf, 
    error: errorBalanceOf, 
    refetch: refetchBalanceOf 
  } = useReadContract({
    abi: contractAbi,
    address: NFT_CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: accountAddress ? [accountAddress] : undefined, // Аргумент - адрес аккаунта
    chainId: MAIN_CHAIN_ID,
    query: {
      enabled: isConnectedToCorrectChain && !!accountAddress, // Активен, если есть адрес и правильная сеть
    },
  });

  // --- Функции для записи данных (отправки транзакций) ---
  const { data: hash, error: writeContractError, isPending: isSubmittingTx, writeContractAsync } = useWriteContract();

  // Функция для сжигания NFT (burnNFT)
  const burnNFT = async (tokenId: bigint) => {
    if (!isConnectedToCorrectChain) {
      alert('Пожалуйста, подключитесь к сети ApeChain.');
      console.error('Not connected to the correct chain (ApeChain).');
      return;
    }
    if (!writeContractAsync) {
        console.error('writeContractAsync function is not available');
        alert('Ошибка: функция отправки транзакции недоступна.');
        return;
    }
    try {
      const txHash = await writeContractAsync({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: 'burnNFT',
        args: [tokenId],
        chainId: MAIN_CHAIN_ID,
      });
      return txHash;
    } catch (err) {
      console.error('Ошибка при сжигании NFT:', err);
      alert(`Ошибка при сжигании NFT: ${ (err as Error).message }`);
      throw err;
    }
  };

  // Функция для активации NFT (activateNFT)
  const activateNFT = async (tokenId: bigint) => {
    if (!isConnectedToCorrectChain) {
      alert('Пожалуйста, подключитесь к сети ApeChain.');
      console.error('Not connected to the correct chain (ApeChain).');
      return;
    }
     if (!writeContractAsync) {
        console.error('writeContractAsync function is not available');
        alert('Ошибка: функция отправки транзакции недоступна.');
        return;
    }
    try {
      const txHash = await writeContractAsync({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: 'activateNFT',
        args: [tokenId],
        chainId: MAIN_CHAIN_ID,
      });
      return txHash;
    } catch (err) {
      console.error('Ошибка при активации NFT:', err);
      alert(`Ошибка при активации NFT: ${ (err as Error).message }`);
      throw err;
    }
  };
  
  // --- Отслеживание статуса транзакции ---
  const { isLoading: isConfirmingTx, isSuccess: isTxConfirmed, error: txConfirmationError } = useWaitForTransactionReceipt({ 
    hash,
  });

  return {
    // Данные и статусы чтения
    totalSupply,
    isLoadingTotalSupply,
    errorTotalSupply,
    refetchTotalSupply,

    balanceOf,
    isLoadingBalanceOf,
    errorBalanceOf,
    refetchBalanceOf,

    // Функции записи
    burnNFT,
    activateNFT,
    
    // Статусы записи
    isSubmittingTx,    // true, когда транзакция отправляется в кошелек
    writeContractError, // Ошибка при отправке транзакции
    hash,               // Хэш транзакции после отправки

    // Статусы подтверждения транзакции
    isConfirmingTx,     // true, когда ожидается майнинг транзакции
    isTxConfirmed,      // true, когда транзакция подтверждена
    txConfirmationError,// Ошибка во время подтверждения транзакции
  };
}
