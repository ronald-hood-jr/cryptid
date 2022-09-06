extern crate core;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub mod error;
pub mod instructions;
pub mod state;
pub mod util;

use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use anchor_lang::prelude::*;
use instructions::*;

#[program]
pub mod cryptid_anchor {
    use super::*;
    pub use instructions::ApproveExecution;

    pub fn direct_execute<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DirectExecute<'info>>,
        controller_chain: Vec<u8>,
        instructions: Vec<AbbreviatedInstructionData>,
        cryptid_account_bump: u8,
        flags: u8,
    ) -> Result<()> {
        instructions::direct_execute(
            ctx,
            controller_chain,
            instructions,
            cryptid_account_bump,
            flags,
        )
    }

    pub fn propose_transaction<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ProposeTransaction<'info>>,
        instructions: Vec<AbbreviatedInstructionData>,
        _num_accounts: u8,
    ) -> Result<()> {
        instructions::propose_transaction(ctx, instructions)
    }

    pub fn execute_transaction<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteTransaction<'info>>,
        controller_chain: Vec<u8>,
        middleware_account: Option<Pubkey>,
        cryptid_account_bump: u8,
        flags: u8,
    ) -> Result<()> {
        instructions::execute_transaction(
            ctx,
            controller_chain,
            middleware_account,
            cryptid_account_bump,
            flags,
        )
    }

    pub fn approve_execution<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ApproveExecution<'info>>,
    ) -> Result<()> {
        instructions::approve_execution(ctx)
    }
}
