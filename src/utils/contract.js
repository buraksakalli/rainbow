import { captureException } from '@sentry/react-native';
import { ethers } from 'ethers';
import { toHex, web3Provider } from '../handlers/web3';
import { loadWallet } from '../model/wallet';
import { ethUnits } from '../references';
import erc20ABI from '../references/erc20-abi.json';
import logger from 'logger';

const estimateApproveWithExchange = async (spender, exchange) => {
  try {
    logger.sentry('exchange estimate approve', { exchange, spender });
    const gasLimit = await exchange.estimate.approve(
      spender,
      ethers.constants.MaxUint256
    );
    return gasLimit ? gasLimit.toString() : ethUnits.basic_approval;
  } catch (error) {
    logger.sentry('error estimateApproveWithExchange');
    captureException(error);
    return ethUnits.basic_approval;
  }
};

const estimateApprove = (tokenAddress, spender) => {
  const exchange = new ethers.Contract(tokenAddress, erc20ABI, web3Provider);
  return estimateApproveWithExchange(spender, exchange);
};

const approve = async (
  tokenAddress,
  spender,
  gasLimit,
  gasPrice,
  wallet = null
) => {
  const walletToUse = wallet || (await loadWallet());
  if (!walletToUse) return null;
  const exchange = new ethers.Contract(tokenAddress, erc20ABI, walletToUse);
  const approval = await exchange.approve(
    spender,
    ethers.constants.MaxUint256,
    {
      gasLimit: gasLimit ? toHex(gasLimit) : undefined,
      gasPrice: gasPrice ? toHex(gasPrice) : undefined,
    }
  );
  return {
    approval,
    creationTimestamp: Date.now(),
  };
};

const getRawAllowance = async (owner, token, spender) => {
  const { address: tokenAddress } = token;
  const tokenContract = new ethers.Contract(
    tokenAddress,
    erc20ABI,
    web3Provider
  );
  const allowance = await tokenContract.allowance(owner, spender);
  return allowance.toString();
};

export default {
  approve,
  estimateApprove,
  getRawAllowance,
};
