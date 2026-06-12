# Deploy Ritual Agent Arena

## Setup

1. Copy `.env.example` ke `.env` dan isi private key:
```bash
cp .env.example .env
```

2. Deploy contract:
```bash
source .env
forge script script/Deploy.s.sol \
  --rpc-url $RITUAL_RPC \
  --broadcast \
  --private-key $PRIVATE_KEY
```

## Contract

- `RitualAgentArena.sol` — mint agent + battle logic
- Chain ID: 1979
- RPC: https://rpc.ritualfoundation.org