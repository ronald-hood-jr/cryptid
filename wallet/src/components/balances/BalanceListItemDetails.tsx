import {useIsProdNetwork, useSolanaExplorerUrlSuffix} from "../../utils/connection";
import React, {useState} from "react";
import {useWallet} from "../../utils/wallet";
import {useAsyncData} from "../../utils/fetch-loop";
import {showSwapAddress, showTokenInfoDialog} from "../../utils/config";
import {swapApiRequest} from "../../utils/swap/api";
import {useIsExtensionWidth} from "../../utils/utils";
import LoadingIndicator from "../LoadingIndicator";
import {Typography} from "@material-ui/core";
import Link from "@material-ui/core/Link";
import ExportAccountDialog from "../ExportAccountDialog";
import Button from "@material-ui/core/Button";
import InfoIcon from "@material-ui/icons/InfoOutlined";
import ReceiveIcon from "@material-ui/icons/WorkOutline";
import SendIcon from "@material-ui/icons/Send";
import DeleteIcon from "@material-ui/icons/Delete";
import SendDialog from "../SendDialog";
import DepositDialog from "../DepositDialog";
import TokenInfoDialog from "../TokenInfoDialog";
import CloseTokenAccountDialog from "../CloseTokenAccountButton";
import {makeStyles} from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  address: {
    textOverflow: 'ellipsis',
    overflowX: 'hidden',
  },
  itemDetails: {
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-evenly',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  viewDetails: {
    '&:hover': {
      cursor: 'pointer',
    },
  },
}));

export function BalanceListItemDetails({
                                  publicKey,
                                  serumMarkets,
                                  balanceInfo,
                                  isAssociatedToken,
                                }) {
  const urlSuffix = useSolanaExplorerUrlSuffix();
  const classes = useStyles();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [tokenInfoDialogOpen, setTokenInfoDialogOpen] = useState(false);
  const [exportAccDialogOpen, setExportAccDialogOpen] = useState(false);
  const [
    closeTokenAccountDialogOpen,
    setCloseTokenAccountDialogOpen,
  ] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const wallet = useWallet();
  const isProdNetwork = useIsProdNetwork();
  const [swapInfo] = useAsyncData(async () => {
    if (!showSwapAddress || !isProdNetwork) {
      return null;
    }
    return await swapApiRequest(
      'POST',
      'swap_to',
      {
        blockchain: 'sol',
        coin: balanceInfo.mint?.toBase58(),
        address: publicKey.toBase58(),
      },
      { ignoreUserErrors: true },
    );
  }, [
    'swapInfo',
    isProdNetwork,
    balanceInfo.mint?.toBase58(),
    publicKey.toBase58(),
  ]);
  const isExtensionWidth = useIsExtensionWidth();

  if (!balanceInfo) {
    return <LoadingIndicator delay={0} />;
  }

  let { mint, tokenName, tokenSymbol, owner, amount } = balanceInfo;

  // Only show the export UI for the native SOL coin.
  const exportNeedsDisplay =
    mint === null && tokenName === 'SOL' && tokenSymbol === 'SOL';

  const market = tokenSymbol
    ? serumMarkets[tokenSymbol.toUpperCase()]
      ? serumMarkets[tokenSymbol.toUpperCase()].publicKey
      : undefined
    : undefined;
  const isSolAddress = publicKey.equals(owner);
  const additionalInfo = isExtensionWidth ? undefined : (
    <>
      <Typography variant="body2">
        Token Name: {tokenName ?? 'Unknown'}
      </Typography>
      <Typography variant="body2">
        Token Symbol: {tokenSymbol ?? 'Unknown'}
      </Typography>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          {!isSolAddress && isAssociatedToken === false && (
            <div style={{ display: 'flex' }}>
              This is an auxiliary token account.
            </div>
          )}
          <Typography variant="body2">
            <Link
              href={
                `https://solscan.io/account/${publicKey.toBase58()}` + urlSuffix
              }
              target="_blank"
              rel="noopener"
            >
              View on Solscan
            </Link>
          </Typography>
          {market && (
            <Typography variant="body2">
              <Link
                href={`https://dex.projectserum.com/#/market/${market}`}
                target="_blank"
                rel="noopener"
              >
                View on Serum
              </Link>
            </Typography>
          )}
          {swapInfo && swapInfo.coin.erc20Contract && (
            <Typography variant="body2">
              <Link
                href={
                  `https://etherscan.io/token/${swapInfo.coin.erc20Contract}` +
                  urlSuffix
                }
                target="_blank"
                rel="noopener"
              >
                View on Ethereum
              </Link>
            </Typography>
          )}
          {!isSolAddress && (
            <Typography variant="body2">
              <Link
                className={classes.viewDetails}
                onClick={() => setShowDetails(!showDetails)}
              >
                View Details
              </Link>
            </Typography>
          )}
          {showDetails &&
          (mint ? (
            <Typography variant="body2" className={classes.address}>
              Mint Address: {mint.toBase58()}
            </Typography>
          ) : null)}
          {!isSolAddress && showDetails && (
            <Typography variant="body2" className={classes.address}>
              {isAssociatedToken ? 'Associated' : ''} Token Metadata:{' '}
              {publicKey.toBase58()}
            </Typography>
          )}
        </div>
        {exportNeedsDisplay && wallet.allowsExport && (
          <div>
            <Typography variant="body2">
              <Link href={'#'} onClick={(e) => setExportAccDialogOpen(true)}>
                Export
              </Link>
            </Typography>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {wallet.allowsExport && (
        <ExportAccountDialog
          onClose={() => setExportAccDialogOpen(false)}
          open={exportAccDialogOpen}
        />
      )}
      <div className={classes.itemDetails}>
        <div className={classes.buttonContainer}>
          {!publicKey.equals(owner) && showTokenInfoDialog ? (
            <Button
              variant="outlined"
              color="default"
              startIcon={<InfoIcon />}
              onClick={() => setTokenInfoDialogOpen(true)}
            >
              Token Info
            </Button>
          ) : null}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ReceiveIcon />}
            onClick={() => setDepositDialogOpen(true)}
          >
            Receive
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => setSendDialogOpen(true)}
          >
            Send
          </Button>
          {localStorage.getItem('warning-close-account') &&
          mint &&
          amount === 0 ? (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => setCloseTokenAccountDialogOpen(true)}
            >
              Delete
            </Button>
          ) : null}
        </div>
        {additionalInfo}
      </div>
      <SendDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        balanceInfo={balanceInfo}
        publicKey={publicKey}
      />
      <DepositDialog
        open={depositDialogOpen}
        onClose={() => setDepositDialogOpen(false)}
        balanceInfo={balanceInfo}
        publicKey={publicKey}
        swapInfo={swapInfo}
        isAssociatedToken={isAssociatedToken}
      />
      <TokenInfoDialog
        open={tokenInfoDialogOpen}
        onClose={() => setTokenInfoDialogOpen(false)}
        balanceInfo={balanceInfo}
        publicKey={publicKey}
      />
      <CloseTokenAccountDialog
        open={closeTokenAccountDialogOpen}
        onClose={() => setCloseTokenAccountDialogOpen(false)}
        balanceInfo={balanceInfo}
        publicKey={publicKey}
      />
    </>
  );
}
