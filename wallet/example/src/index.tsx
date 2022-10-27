import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {App} from './App';
import reportWebVitals from './reportWebVitals';
import {initialize} from '../../cryptid-wallet';
import { CryptidWallet } from '../../cryptid-wallet/lib/types/window';

//import {CryptidWallet} from '../../cryptid/src/wallet';
//import { Cryptid } from '../../cryptid/src/window';
//import {registerWallet} from '../../cryptid/src/';
//import { PublicKey } from '@solana/web3.js';
//let params: Cryptid= {
// @TODO remove from page before committing
//  publicKey: new PublicKey("rpNmfXLpNLtqUPST6W4GY6Afmbf7mzjtn82obJf9BKR"),
//} 
//const cryptid = new CryptidWallet(params);
//const cryptid: CryptidWallet = {};
//initialize();
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
  //Object.defineProperty(window,)
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
