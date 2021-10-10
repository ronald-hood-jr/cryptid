import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useCryptid} from '../utils/Cryptid/cryptid';
import {PublicKey, Transaction} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  Button,
  CardContent,
  FormControlLabel,
  Typography,
  Card,
  Switch,
  SnackbarContent,
  CardActions,
} from '@material-ui/core';
import {makeStyles} from '@material-ui/core/styles';
import {useLocalStorageState} from '../utils/utils';
import WarningIcon from '@material-ui/icons/Warning';
import SignTransactionFormContent from '../components/SignTransactionFormContent';
import SignFormContent from '../components/SignFormContent';
import {CryptidSummary} from "../components/Cryptid/CryptidSummary";
import IdentitySelector from "../components/selectors/IdentitySelector";
import {CheckCircleIcon, XCircleIcon} from "@heroicons/react/solid";
import {CryptidButton} from "../components/balances/CryptidButton";

type ID = any;

type RequestMessage = {
  id: ID,
} & ({
  method: 'connect'
} | {
  method: 'signTransaction',
  params: { transaction: string }
} | {
  method: 'signAllTransactions',
  params: { transactions: string[] },
} | {
  method: 'sign',
  params: { data: any, display: string },
})

type ResponseMessage = {
  error: string,
  id?: ID,
} | {
  method: 'disconnected',
} | {
  method: 'connected',
  params: { publicKey: string, autoApprove: boolean },
} | {
  result: { transaction: string },
} | {
  result: { transactions: string[] },
}
type Opener = {
  postMessage: (message: ResponseMessage & { jsonrpc: '2.0' }, to: string) => void;
}

export default function PopupPage({opener}: { opener: Opener }) {
  const origin = useMemo(() => {
    let params = new URLSearchParams(window.location.hash.slice(1));
    const origin = params.get('origin');
    if (!origin) {
      throw new Error('No origin');
    }
    return origin;
  }, []);
  const {selectedCryptidAccount} = useCryptid();

  const [connectedAccount, setConnectedAccount] = useState<PublicKey | null>(null);
  const hasConnectedAccount = useMemo(() => {
    return !!connectedAccount;
  }, [connectedAccount]);
  const [requests, setRequests] = useState<RequestMessage[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const postMessage = useCallback((
    (message: ResponseMessage) => {
      opener.postMessage({jsonrpc: '2.0', ...message}, origin);
    }
  ), [opener, origin]);

  useEffect(() => {
    if (hasConnectedAccount) {
      function unloadHandler() {
        postMessage({method: 'disconnected'});
      }
      window.addEventListener('beforeunload', unloadHandler);
      return () => {
        unloadHandler();
        window.removeEventListener('beforeunload', unloadHandler);
      };
    }
  }, [hasConnectedAccount, postMessage, origin]);

  useEffect(() => {
    if (
      selectedCryptidAccount &&
      connectedAccount &&
      (!selectedCryptidAccount.address || !connectedAccount.equals(selectedCryptidAccount.address))) {
      setConnectedAccount(null);
    }
  }, [connectedAccount, selectedCryptidAccount]);

  useEffect(() => {
    function messageHandler(e: MessageEvent<RequestMessage>) {
      if (e.origin === origin && e.source === window.opener) {
        if (
          e.data.method !== 'signTransaction' &&
          e.data.method !== 'signAllTransactions' &&
          e.data.method !== 'sign'
        ) {
          postMessage({error: 'Unsupported method', id: e.data.id});
        }

        setRequests((requests) => [...requests, e.data]);
      }
    }
    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [origin, postMessage]);

  const request = requests.length > 0 ? requests[0] : null;
  const popRequest = () => setRequests((requests) => requests.slice(1));

  const {payloads, messageDisplay}: {
    payloads: (Buffer | Uint8Array)[],
    messageDisplay: 'tx' | 'utf8' | 'hex'
  } = useMemo(() => {
    if (!request || request.method === 'connect') {
      return {payloads: [], messageDisplay: 'tx'};
    }
    switch (request.method) {
      case 'signTransaction':
        return {
          payloads: [bs58.decode(request.params.transaction)],
          messageDisplay: 'tx',
        };
      case 'signAllTransactions':
        return {
          payloads: request.params.transactions.map((t) => bs58.decode(t)),
          messageDisplay: 'tx',
        };
      case 'sign':
        if (!(request.params.data instanceof Uint8Array)) {
          throw new Error('Data must be instance of Uint8Array');
        }
        return {
          payloads: [request.params.data],
          messageDisplay: request.params.display === 'utf8' ? 'utf8' : 'hex',
        };
    }
  }, [request]);

  if (hasConnectedAccount && requests.length === 0) {
    focusParent();

    return (
      <Typography>
        Please keep this window open in the background.
      </Typography>
    );
  }

  const mustConnect =
    !connectedAccount || (
      selectedCryptidAccount &&
      selectedCryptidAccount.address &&
      !connectedAccount.equals(selectedCryptidAccount.address)
    );

  if (mustConnect) {
    function connect(autoApprove: boolean) {
      if (!selectedCryptidAccount || !selectedCryptidAccount.address) {
        throw new Error('No selected address');
      }
      setConnectedAccount(selectedCryptidAccount.address);
      postMessage({
        method: 'connected',
        params: {publicKey: selectedCryptidAccount.address.toBase58(), autoApprove},
      });
      setAutoApprove(autoApprove);
      focusParent();
    }

    return <ApproveConnectionForm origin={origin} onApprove={connect} autoApprove={autoApprove}
                                  setAutoApprove={setAutoApprove}/>;
  }

  if (!request) {
    throw new Error('No request');
  }
  if (!(request.method === 'signTransaction' ||
    request.method === 'signAllTransactions' ||
    request.method === 'sign')) {
    throw new Error('Unknown method');
  }
  if (!selectedCryptidAccount) {
    throw new Error('No selected cryptid account');
  }

  async function onApprove() {
    popRequest();
    if (!request) {
      throw new Error('onApprove: No request');
    }
    switch (request.method) {
      case 'sign':
        throw new Error('onApprove: Not supported');
      case 'signTransaction':
        await sendTransaction(payloads[0]);
        break;
      case 'signAllTransactions':
        await sendTransactions(payloads);
        break;
      default:
        throw new Error('onApprove: Unexpected method: ' + request.method);
    }
  }

  async function sendTransaction(transactionBuffer: Buffer | Uint8Array) {
    const transaction = Transaction.from(transactionBuffer);
    if (!request) {
      throw new Error('sendTransaction: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendTransaction: no selected cryptid account');
    }
    postMessage({
      result: {
        transaction: await selectedCryptidAccount
          .signTransaction(transaction)
          .then((signedTx) => signedTx.serialize({verifySignatures: false}))
          .then(bs58.encode),
      },
      id: request.id,
    });
  }

  async function sendTransactions(transactionBuffers: (Buffer | Uint8Array)[]) {
    if (!request) {
      throw new Error('sendTransactions: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendTransactions: no selected cryptid account');
    }
    const signedTransactions = transactionBuffers
      .map(Transaction.from)
      .map((tx) => selectedCryptidAccount
        .signTransaction(tx)
        .then((signedTx) => signedTx.serialize({verifySignatures: false}))
        .then(bs58.encode),
      );
    postMessage({
      result: {
        transactions: await Promise.all(signedTransactions),
      },
      id: request.id,
    });
  }

  function sendReject() {
    if (!request) {
      throw new Error('sendTransactions: no request');
    }
    popRequest();
    postMessage({
      error: 'Transaction cancelled',
      id: request.id,
    });
  }

  return (
    <ApproveSignatureForm
      key={request.id}
      autoApprove={autoApprove}
      origin={origin}
      payloads={payloads}
      messageDisplay={messageDisplay}
      onApprove={onApprove}
      onReject={sendReject}
    />
  );
}

function focusParent() {
  try {
    window.open('', 'parent');
  } catch (err) {
    console.log('err', err);
  }
}

const useStyles = makeStyles((theme) => ({
  connection: {
    // marginTop: theme.spacing(3),
    // marginBottom: theme.spacing(3),
    // textAlign: 'center',
    // fontSize: 24,
  },
  transaction: {
    wordBreak: 'break-all',
  },
  approveButton: {
    backgroundColor: '#43a047',
    color: 'white',
  },
  actions: {
    justifyContent: 'space-between',
  },
  snackbarRoot: {
    backgroundColor: theme.palette.background.paper,
  },
  warningMessage: {
    margin: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  warningIcon: {
    marginRight: theme.spacing(1),
    fontSize: 24,
  },
  warningTitle: {
    color: theme.palette.warning.light,
    fontWeight: 600,
    fontSize: 16,
    alignItems: 'center',
    display: 'flex',
  },
  warningContainer: {
    marginTop: theme.spacing(1),
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

function ApproveConnectionForm({
                                 origin,
                                 onApprove,
                                 autoApprove,
                                 setAutoApprove,
                               }: { origin: string, onApprove: (boolean) => void, autoApprove: boolean, setAutoApprove: (boolean) => void }) {
  const classes = useStyles();
  let [dismissed, setDismissed] = useLocalStorageState('dismissedAutoApproveWarning', false);
  let {selectedCryptidAccount} = useCryptid();
  return (
    <>
      {selectedCryptidAccount && <CryptidSummary cryptidAccount={selectedCryptidAccount}/>}
      {/*Workaround for https://github.com/tailwindlabs/headlessui/issues/30  and https://github.com/mui-org/material-ui/issues/2623*/}
      <Card style={{overflow: 'visible'}}>
        <CardContent>
          <Typography variant="h6" component="h1" gutterBottom>
            Connect identity {selectedCryptidAccount?.alias} 
            {selectedCryptidAccount?.isControlled && `(controlled by ${selectedCryptidAccount?.controlledBy})`}{' '}
            with {origin}?
          </Typography>
          <div className={classes.connection}>
            {(() => {
              if (!selectedCryptidAccount) {
                return (<Typography variant="h6">
                  No selected Cryptid account.
                </Typography>);
              } else {
                return (
                  <div className="justify-center align-middle h-32 flex">
                    <IdentitySelector isSignerWindow={true}/>
                  </div>
                );
              }
            })()}

          </div>
          {/*<Typography>Only connect with sites you trust.</Typography>*/}
          {/*<Divider className={classes.divider} />*/}
        </CardContent>
        <CardActions className='justify-end'>
          <CryptidButton label='Deny' Icon={XCircleIcon} onClick={window.close}/>
          <CryptidButton label='Allow' Icon={CheckCircleIcon} disabled={!selectedCryptidAccount || !selectedCryptidAccount.activeSigningKey} onClick={() => onApprove(autoApprove)}/>
        </CardActions>
      </Card>
    </>
  );
}

type ApproveSignerFormProps = {
  origin: string,
  payloads: (Buffer | Uint8Array)[],
  messageDisplay: 'tx' | 'utf8' | 'hex',
  onApprove: () => void,
  onReject: () => void,
  autoApprove: boolean,
};
function ApproveSignatureForm({
                                origin,
                                payloads,
                                messageDisplay,
                                onApprove,
                                onReject,
                                autoApprove,
                              }: ApproveSignerFormProps) {
  const classes = useStyles();

  const isMultiTx = messageDisplay === 'tx' && payloads.length > 1;
  const mapTransactionToMessageBuffer = (tx) => Transaction.from(tx).serializeMessage();

  const buttonRef = useRef<any>();

  if (autoApprove) {
    onApprove();
    return (<></>);
  }

  const renderFormContent = () => {
    if (messageDisplay === 'tx') {
      return (
        <SignTransactionFormContent
          autoApprove={autoApprove}
          origin={origin}
          messages={payloads.map(mapTransactionToMessageBuffer)}
          onApprove={onApprove}
          buttonRef={buttonRef}
        />
      );
    } else {
      return <SignFormContent
        origin={origin}
        message={mapTransactionToMessageBuffer(payloads[0])}
        messageDisplay={messageDisplay}
        buttonRef={buttonRef}
      />;
    }
  };

  return (
    <Card>
      {renderFormContent()}
      <CardActions className='justify-end'>
        <CryptidButton label='Cancel' Icon={XCircleIcon} onClick={onReject}/>
        <CryptidButton label={'Approve' + (isMultiTx ? ' All' : '')} Icon={CheckCircleIcon} onClick={onApprove}/>
      </CardActions>
    </Card>
  );
}
