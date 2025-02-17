use crate::error::CryptidError;
use anchor_lang::prelude::*;
use bitflags::bitflags;
use num_traits::cast::ToPrimitive;

/// A trait that extracts all accounts from an anchor instruction context, combining
pub trait AllAccounts<'a, 'b, 'c, 'info> {
    fn all_accounts(&self) -> Vec<&AccountInfo<'info>>;
    fn get_accounts_by_indexes(&self, indexes: &[u8]) -> Result<Vec<&AccountInfo<'info>>>;
}

pub fn resolve_by_index<'c, 'info>(
    indexes: &[u8],
    accounts: &Vec<&'c AccountInfo<'info>>,
) -> Result<Vec<&'c AccountInfo<'info>>> {
    let mut resolved_accounts = Vec::new();
    for i in indexes {
        let i = *i as usize;
        if i >= accounts.len() {
            msg!("Account index {} out of bounds", i);
            return err!(CryptidError::IndexOutOfRange);
        }
        resolved_accounts.push(accounts[i]);
    }
    Ok(resolved_accounts)
}

/// A trait that indicates if an account represents a generative account (e.g. a Generative DID or Cryptid account)
/// By Generative, we mean that the account is not on chain, but derived from a public key and has default properties.
pub trait IsGenerative<T> {
    fn is_generative(&self) -> bool;
}

impl<T: AccountSerialize + AccountDeserialize + Owner + Clone> IsGenerative<T> for Account<'_, T> {
    fn is_generative(&self) -> bool {
        // TODO: I just want to check that it is zero. Why is this so hard!?
        self.to_account_info()
            .try_borrow_lamports()
            .unwrap()
            .to_u64()
            .unwrap()
            == 0
            && *self.to_account_info().owner == System::id()
    }
}

/// Verifies that the signer has the permission to sign for the DID
/// If the controller-chain is empty, it expects the signer to be a key on the did itself
/// Otherwise, the signer is a signer on a controller of the DID (either directly or indirectly)
pub fn verify_keys<'info1, 'info2>(
    did: &AccountInfo<'info1>,
    did_account_bump: Option<u8>,
    signer: &Pubkey,
    controlling_did_accounts: Vec<&AccountInfo<'info2>>,
) -> Result<()> {
    let controlling_did_accounts = controlling_did_accounts
        .into_iter()
        .cloned()
        .collect::<Vec<_>>();
    let signer_is_authority = sol_did::integrations::is_authority(
        did,
        did_account_bump,
        controlling_did_accounts.as_slice(),
        signer,
        &[],
        None,
        None,
    )
    .map_err(|error| -> CryptidError {
        msg!("Error executing is_authority: {}", error);
        CryptidError::KeyMustBeSigner
    })?;

    if !signer_is_authority {
        msg!("Signer is not an authority on the DID");
        return err!(CryptidError::KeyMustBeSigner);
    }
    Ok(())
}

bitflags! {
    /// Extra flags passed to execution instructions
    #[derive(AnchorDeserialize, AnchorSerialize)]
    pub struct ExecuteFlags: u8{
        /// Print debug logs, uses a large portion of the compute budget
        const DEBUG = 1 << 0;
    }
}
