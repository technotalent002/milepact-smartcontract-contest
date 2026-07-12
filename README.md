# MilePact Cofounder Contract Test

Lean technical cofounder test project for the MilePact escrow contract.

This project intentionally contains only:

- Foundry smart contracts and tests
- A Next.js + Tailwind dashboard
- Local Anvil defaults hardcoded in source

It intentionally does not use:

- `.env` files
- MongoDB
- Auth/session logic
- Marketplace seed data

## Run Locally

Terminal 1:

```bash
npm run local:chain
```

Terminal 2:

```bash
npm run contracts:deploy:local
```

Copy `USDC_ADDRESS` and `ESCROW_ADDRESS` from the deploy output into the dashboard.

Terminal 3:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## MetaMask Accounts

Client:

```text
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Freelancer:

```text
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private key: 0x59c6995e998f97a5a0044966f09453855e1a9b30e13edd40ec36b1e1a9b30e13
```

## Expected Flow

1. Connect client wallet.
2. Create agreement.
3. Switch to freelancer wallet.
4. Counter-sign.
5. Switch to client wallet.
6. Approve USDC.
7. Fund escrow.
8. Switch to freelancer wallet.
9. Mark delivered.
10. Switch to client wallet.
11. Release funds.

## Verification

```bash
npm run contracts:test
npm run build
```
