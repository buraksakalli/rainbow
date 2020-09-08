import { combineReducers } from 'redux';

import actionSheetManager from './actionSheetManager';
import addCash from './addCash';
import charts from './charts';
import contacts from './contacts';
import data from './data';
import editOptions from './editOptions';
import explorer from './explorer';
import gas from './gas';
import imageMetadata from './imageMetadata';
import keyboardHeight from './keyboardHeight';
import multicall from './multicall';
import nonce from './nonce';
import openStateSettings from './openStateSettings';
import raps from './raps';
import requests from './requests';
import savings from './savings';
import settings from './settings';
import showcaseTokens from './showcaseTokens';
import uniqueTokens from './uniqueTokens';
import uniswap from './uniswap';
import uniswapLiquidity from './uniswapLiquidity';
import walletconnect from './walletconnect';
import wallets from './wallets';

export default combineReducers({
  actionSheetManager,
  addCash,
  charts,
  contacts,
  data,
  editOptions,
  explorer,
  gas,
  imageMetadata,
  keyboardHeight,
  multicall,
  nonce,
  openStateSettings,
  raps,
  requests,
  savings,
  settings,
  showcaseTokens,
  uniqueTokens,
  uniswap,
  uniswapLiquidity,
  walletconnect,
  wallets,
});
