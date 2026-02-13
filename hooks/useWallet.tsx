
import { useState, useEffect, useCallback, useRef } from 'react';
import sdk from '@farcaster/frame-sdk';

const BASE_CHAIN_ID = '0x2105'; // 8453
const BASE_CHAIN_CONFIG = {
  chainId: BASE_CHAIN_ID,
  chainName: 'Base',
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
};

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  // Helper to get the best available provider
  const getProvider = useCallback(() => {
    // Explicitly check for Farcaster provider first
    return sdk?.wallet?.ethProvider || window.ethereum;
  }, []);

  const checkIfWalletIsConnected = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;
    
    try {
      // Check for already authorized accounts
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        return accounts[0];
      }
    } catch (err) {
      console.warn("Check connection error:", err);
    }
    return null;
  }, [getProvider]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initial check
    checkIfWalletIsConnected();
    
    const provider = getProvider();
    if (provider && provider.on) {
       const handleAccountsChanged = (accounts: string[]) => {
         setAddress(accounts[0] || null);
       };
       const handleChainChanged = () => {
         // Re-check address instead of full reload for smoother experience
         checkIfWalletIsConnected();
       };

       provider.on('accountsChanged', handleAccountsChanged);
       provider.on('chainChanged', handleChainChanged);

       return () => {
         if (provider.removeListener) {
            provider.removeListener('accountsChanged', handleAccountsChanged);
            provider.removeListener('chainChanged', handleChainChanged);
         }
       };
    }
  }, [checkIfWalletIsConnected, getProvider]);
  
  const connect = async () => {
     setIsConnecting(true);
     setError(null);
     
     const provider = getProvider();

     if (!provider) {
        setError('No wallet found. Open in a crypto-enabled browser.');
        setIsConnecting(false);
        return;
     }
     
     try {
        // Request accounts - in Farcaster this typically triggers the native login flow
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
        }
        
        // Ensure user is on Base
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        if (currentChainId !== BASE_CHAIN_ID) {
           try {
              await provider.request({
                 method: 'wallet_switchEthereumChain',
                 params: [{ chainId: BASE_CHAIN_ID }],
              });
           } catch (switchError: any) {
              if (switchError.code === 4902) {
                 await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [BASE_CHAIN_CONFIG],
                 });
              }
           }
        }
     } catch (err: any) {
        console.error("Connect error:", err);
        setError(err.message || 'Failed to connect');
     } finally {
        setIsConnecting(false);
     }
  };

  const disconnect = () => {
    setAddress(null);
  };
  
  return { address, connect, disconnect, isConnecting, error };
}
