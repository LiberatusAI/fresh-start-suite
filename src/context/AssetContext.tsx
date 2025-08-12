
import React, { createContext, useContext, useState } from 'react';
import { CryptoAsset } from '@/types';

type AssetContextType = {
  selectedAssetIds: string[];
  setSelectedAssetIds: (ids: string[]) => void;
  selectedAssets: CryptoAsset[];
  setSelectedAssets: (assets: CryptoAsset[]) => void;
};

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export const AssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<CryptoAsset[]>([]);

  return (
    <AssetContext.Provider 
      value={{ 
        selectedAssetIds, 
        setSelectedAssetIds,
        selectedAssets,
        setSelectedAssets
      }}
    >
      {children}
    </AssetContext.Provider>
  );
};

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
};
