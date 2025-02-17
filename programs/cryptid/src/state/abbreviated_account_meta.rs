use crate::state::account_meta_props::AccountMetaProps;
use anchor_lang::prelude::*;
use std::collections::HashMap;

/// An account for an instruction, similar to Solana's [`AccountMeta`](AccountMeta)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AbbreviatedAccountMeta {
    /// The key of the account
    pub key: u8,
    /// Information about the account
    pub meta: u8,
}

impl AbbreviatedAccountMeta {
    /// Calculates the on-chain size of a [`TransactionAccountMeta`]
    pub const fn calculate_size() -> usize {
        1 //key
            + AccountMetaProps::calculate_size() //meta
    }

    /// Creates a [`TransactionAccountMeta`] from a given [`AccountMeta`]
    pub fn from_solana_account_meta(meta: AccountMeta, accounts: &HashMap<Pubkey, u8>) -> Self {
        Self {
            key: *accounts
                .get(&meta.pubkey)
                .unwrap_or_else(|| panic!("Could not find account `{}` in accounts", meta.pubkey)),
            meta: AccountMetaProps::new(meta.is_signer, meta.is_writable).bits(),
        }
    }

    /// Turns `self` into a [`AccountMeta`]
    pub fn into_solana_account_meta(self, accounts: &[Pubkey]) -> AccountMeta {
        AccountMeta {
            pubkey: accounts[self.key as usize],
            is_signer: AccountMetaProps::from_bits(self.meta)
                .unwrap()
                .contains(AccountMetaProps::IS_SIGNER),
            is_writable: AccountMetaProps::from_bits(self.meta)
                .unwrap()
                .contains(AccountMetaProps::IS_WRITABLE),
        }
    }
}
