import { useContext } from 'react';

import { DEFAULT_NETWORK } from '@config';
import { useToasts } from '@features/Toasts';
import { ProviderHandler } from '@services/EthService';
import { StoreContext, useAssets, useNetworks } from '@services/Store';
import { ISignedTx, ITxConfig, ITxHash, ITxReceipt, ITxType, NetworkId } from '@types';
import { makePendingTxReceipt, makeTxConfigFromSignedTx, TUseStateReducerFactory } from '@utils';

const broadcastTxInitialState: State = {
  network: DEFAULT_NETWORK,
  txReceipt: undefined,
  txConfig: undefined,
  signedTx: ''
};

interface State {
  network: NetworkId;
  txConfig: ITxConfig | undefined;
  txReceipt: ITxReceipt | undefined;
  signedTx: ISignedTx;
}

const BroadcastTxConfigFactory: TUseStateReducerFactory<State> = ({ state, setState }) => {
  const { networks, getNetworkById } = useNetworks();
  const { assets } = useAssets();
  const { displayToast, toastTemplates } = useToasts();
  const { accounts } = useContext(StoreContext);

  const handleNetworkChanged = (network: NetworkId) => {
    setState((prevState: State) => ({
      ...prevState,
      network
    }));
  };

  const handleSendClicked = (signedTx: ISignedTx, cb: any) => {
    const { network } = state;
    const txConfig = makeTxConfigFromSignedTx(signedTx, assets, networks, accounts, {
      network: getNetworkById(network)
    } as ITxConfig);

    setState((prevState: State) => ({
      ...prevState,
      txConfig,
      signedTx
    }));

    cb();
  };

  const handleConfirmClick = async (cb: any) => {
    try {
      const { txConfig, signedTx } = state;
      if (!txConfig) {
        throw new Error();
      }
      const provider = new ProviderHandler(txConfig.network);
      const response = await provider.sendRawTx(signedTx);
      const pendingTxReceipt = makePendingTxReceipt(response.hash as ITxHash)(
        ITxType.STANDARD,
        txConfig
      );
      setState((prevState: State) => ({
        ...prevState,
        txReceipt: pendingTxReceipt
      }));
      cb();
    } catch (err) {
      console.debug(`[BroadcastTx] ${err}`);
      displayToast(toastTemplates.failedTransaction);
    }
  };

  const handleResetFlow = (cb: any) => {
    setState(broadcastTxInitialState);
    cb();
  };

  return {
    handleNetworkChanged,
    handleSendClicked,
    handleConfirmClick,
    handleResetFlow,
    broadcastTxState: state
  };
};

export { broadcastTxInitialState, BroadcastTxConfigFactory };
