import { get, toLower } from 'lodash';
import { greaterThan } from '../helpers/utilities';
import store from '../redux/store';
import { dataAddNewTransaction } from '../redux/data';
import { rapsAddOrUpdate } from '../redux/raps';
import { contractUtils, gasUtils } from '../utils';

const NOOP = () => undefined;

const unlock = async (wallet, currentRap, index, parameters) => {
  const { dispatch } = store;
  const { assetToUnlock, contractAddress } = parameters;
  const { accountAddress } = store.getState().settings;
  console.log(
    '[unlock] begin unlock rap for',
    assetToUnlock,
    'on',
    contractAddress
  );

  const needsUnlocking = await assetNeedsUnlocking(
    accountAddress,
    assetToUnlock,
    contractAddress
  );

  console.log('[unlock] does this thing need unlocking?', needsUnlocking);
  currentRap.actions[index].transaction.confirm = true;
  dispatch(rapsAddOrUpdate(currentRap.id, currentRap));
  if (!needsUnlocking) return;

  console.log('[unlock] unlock needed');
  const { gasPrices } = store.getState().gas;
  const { address: assetAddress } = assetToUnlock;

  // unlocks should always use fast gas
  const fastGasPrice = get(gasPrices, `[${gasUtils.FAST}]`);
  const gasLimit = await contractUtils.estimateApprove(
    assetAddress,
    contractAddress
  );

  const { approval } = await contractUtils.approve(
    assetAddress,
    contractAddress,
    gasLimit,
    get(fastGasPrice, 'value.amount'),
    wallet
  );

  // update rap for hash
  currentRap.actions[index].transaction.hash = approval.hash;
  console.log('[unlock] adding a new txn for the approval', approval.hash);
  dispatch(rapsAddOrUpdate(currentRap.id, currentRap));

  console.log('[unlock] add a new txn');
  dispatch(
    dataAddNewTransaction(
      {
        amount: 0,
        asset: assetToUnlock,
        from: wallet.address,
        hash: approval.hash,
        nonce: get(approval, 'nonce'),
        to: get(approval, 'to'),
      },
      true
    )
  );
  console.log('[unlock] calling callback');
  currentRap.callback();
  currentRap.callback = NOOP;

  console.log('[unlock] APPROVAL SUBMITTED, HASH', approval.hash);
  console.log('[unlock] WAITING TO BE MINED...');
  try {
    await approval.wait();
    // update rap for confirmed status
    currentRap.actions[index].transaction.confirmed = true;
    dispatch(rapsAddOrUpdate(currentRap.id, currentRap));
    console.log('[unlock] APPROVAL READY, LETS GOOO');
  } catch (error) {
    console.log('[unlock] error waiting for approval', error);
    currentRap.actions[index].transaction.confirmed = false;
    dispatch(rapsAddOrUpdate(currentRap.id, currentRap));
  }
  console.log('[unlock] returning', currentRap, approval);
  return { rap: currentRap, txn: approval };
};

const assetNeedsUnlocking = async (
  accountAddress,
  assetToUnlock,
  contractAddress
) => {
  const { address } = assetToUnlock;
  const _address = toLower(_address);
  const _contractAddress = toLower(_contractAddress);
  console.log('checking asset needs unlocking');
  const isInputEth = address === 'eth';
  if (isInputEth) {
    return false;
  }
  const allowance = await contractUtils.getAllowance(
    accountAddress,
    assetToUnlock,
    contractAddress
  );
  return !greaterThan(allowance, 0);
};

export default unlock;