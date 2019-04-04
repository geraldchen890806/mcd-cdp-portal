import { useContext, useEffect, useState } from 'react';
import { checkEthereumProvider } from 'utils/ethereum';

import { MakerObjectContext } from 'providers/MakerHooksProvider';

function useMaker() {
  const { maker, account } = useContext(MakerObjectContext) || {};
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (maker) {
      maker.authenticate().then(() => {
        setAuthenticated(true);
      });

      return () => {
        setAuthenticated(false);
      };
    }
  }, [maker]);

  function isConnectedToProvider(provider) {
    return (
      maker.service('accounts').hasAccount() &&
      !!provider.address &&
      provider.address === maker.currentAddress()
    );
  }

  const connectMetamask = async () => {
    const networkId = maker.service('web3').networkId();

    const browserProvider = await checkEthereumProvider();

    if (browserProvider.networkId !== networkId)
      throw new Error(
        'browser ethereum provider and URL network param do not match.'
      );

    if (!isConnectedToProvider(browserProvider)) {
      await maker.addAccount('browser', { type: 'browser' });
      await maker.useAccount('browser');
    }

    const connectedAddress = maker.currentAddress();

    return connectedAddress;
  };

  return {
    maker,
    authenticated,
    isConnectedToProvider,
    connectMetamask,
    account
  };
}

export default useMaker;
