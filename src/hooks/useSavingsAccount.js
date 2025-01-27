import { concat, find, isEmpty } from 'lodash';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useAccountSettings from '../hooks/useAccountSettings';
import useAppState from '../hooks/useAppState';
import { savingsLoadState } from '../redux/savings';
import { DAI_ADDRESS } from '../references';
import usePrevious from './usePrevious';

export default function useSavingsAccount(includeDefaultDai) {
  const { justBecameActive } = useAppState();
  const { accountAddress } = useAccountSettings();
  const previousAccount = usePrevious(accountAddress);
  const dispatch = useDispatch();
  const { accountTokens, daiMarketData } = useSelector(({ savings }) => ({
    accountTokens: savings.accountTokens,
    daiMarketData: savings.daiMarketData,
  }));

  const accountHasCDAI = find(
    accountTokens,
    token => token.underlying.address === DAI_ADDRESS
  );

  let tokens = accountTokens;

  const shouldAddDai =
    includeDefaultDai && !accountHasCDAI && !isEmpty(daiMarketData);
  if (shouldAddDai) {
    tokens = concat(accountTokens, {
      ...daiMarketData,
    });
  }

  useEffect(() => {
    if (justBecameActive) {
      dispatch(savingsLoadState());
    }
  }, [dispatch, justBecameActive]);

  // Reload on address change
  useEffect(() => {
    if (previousAccount && previousAccount !== accountAddress) {
      dispatch(savingsLoadState());
    }
  }, [dispatch, accountAddress, previousAccount]);

  return tokens;
}
