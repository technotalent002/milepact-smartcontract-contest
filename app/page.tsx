"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodePacked,
  formatUnits,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseUnits,
  toBytes
} from "viem";
import { erc20Abi, escrowAbi } from "@/lib/abi";
import { CLIENT_ADDRESS, DEFAULT_AMOUNT_USDC, DEFAULT_METADATA_HASH, FREELANCER_ADDRESS, localAnvil } from "@/lib/config";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type Agreement = {
  id: bigint;
  client: `0x${string}`;
  freelancer: `0x${string}`;
  usdc: `0x${string}`;
  amount: bigint;
  metadataHash: string;
  deliveryHash: string;
  deadline: bigint;
  deliveredAt: bigint;
  state: number;
  counterSigned: boolean;
};

const states = ["Proposed", "Active", "Funded", "Delivered", "Disputed", "Released", "Refunded"];
const publicClient = createPublicClient({ chain: localAnvil, transport: http(localAnvil.rpcUrls.default.http[0]) });

function ethereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
}

function normalizeAgreement(data: unknown): Agreement {
  const value = data as readonly [
    bigint,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    bigint,
    string,
    string,
    bigint,
    bigint,
    number,
    boolean
  ];

  return {
    id: value[0],
    client: value[1],
    freelancer: value[2],
    usdc: value[3],
    amount: value[4],
    metadataHash: value[5],
    deliveryHash: value[6],
    deadline: value[7],
    deliveredAt: value[8],
    state: value[9],
    counterSigned: value[10]
  };
}

function short(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "-";
}

export default function Dashboard() {
  const [account, setAccount] = useState<`0x${string}` | "">("");
  const [escrowAddress, setEscrowAddress] = useState("");
  const [usdcAddress, setUsdcAddress] = useState("");
  const [freelancer, setFreelancer] = useState(FREELANCER_ADDRESS);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT_USDC);
  const [metadataHash, setMetadataHash] = useState(DEFAULT_METADATA_HASH);
  const [agreementId, setAgreementId] = useState("0");
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState("Ready. Start Anvil, deploy contracts, paste addresses, then connect MetaMask.");

  useEffect(() => {
    setEscrowAddress(window.localStorage.getItem("milepact:test:escrow") || "");
    setUsdcAddress(window.localStorage.getItem("milepact:test:usdc") || "");
  }, []);

  useEffect(() => {
    if (escrowAddress) window.localStorage.setItem("milepact:test:escrow", escrowAddress);
    if (usdcAddress) window.localStorage.setItem("milepact:test:usdc", usdcAddress);
  }, [escrowAddress, usdcAddress]);

  const walletClient = useMemo(() => {
    const provider = ethereum();
    if (!provider) return null;
    return createWalletClient({ chain: localAnvil, transport: custom(provider) });
  }, [account]);

  const addressesReady = isAddress(escrowAddress) && isAddress(usdcAddress);
  const selectedRole = account && account.toLowerCase() === CLIENT_ADDRESS.toLowerCase() ? "Client" : account && account.toLowerCase() === FREELANCER_ADDRESS.toLowerCase() ? "Freelancer" : "Observer";

  async function addLocalChain() {
    const provider = ethereum();
    if (!provider) throw new Error("MetaMask is not available.");
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x7a69",
          chainName: localAnvil.name,
          nativeCurrency: localAnvil.nativeCurrency,
          rpcUrls: localAnvil.rpcUrls.default.http,
          blockExplorerUrls: []
        }
      ]
    });
    setStatus("Local Anvil is configured in MetaMask.");
  }

  async function connectWallet() {
    const provider = ethereum();
    if (!provider) throw new Error("Install MetaMask to use the dashboard.");
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
    setAccount(accounts[0] || "");
    setStatus(accounts[0] ? `Connected ${short(accounts[0])}` : "No account returned by wallet.");
  }

  async function write(label: string, fn: (account: `0x${string}`) => Promise<`0x${string}`>) {
    try {
      if (!walletClient || !account) throw new Error("Connect MetaMask first.");
      if (!addressesReady) throw new Error("Paste valid Escrow and USDC addresses from the deploy output.");
      setStatus(`${label} submitted...`);
      const hash = await fn(account);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(`${label} confirmed.`);
      await readAgreement();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `${label} failed.`);
    }
  }

  async function createAgreement() {
    await write("Create agreement", async (activeAccount) => {
      const nextId = await publicClient.readContract({
        address: getAddress(escrowAddress),
        abi: escrowAbi,
        functionName: "nextAgreementId"
      });
      setAgreementId(String(nextId));
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
      return walletClient!.writeContract({
        account: activeAccount,
        address: getAddress(escrowAddress),
        abi: escrowAbi,
        functionName: "createAgreement",
        args: [getAddress(freelancer), getAddress(usdcAddress), parseUnits(amount, 6), metadataHash, deadline]
      });
    });
  }

  async function counterSign() {
    await write("Counter-sign", async (activeAccount) => {
      const id = BigInt(agreementId || "0");
      const digest = keccak256(encodePacked(["address", "uint256", "string"], [getAddress(escrowAddress), id, "COUNTERSIGN"]));
      const signature = await walletClient!.signMessage({ account: activeAccount, message: { raw: toBytes(digest) } });
      return walletClient!.writeContract({
        account: activeAccount,
        address: getAddress(escrowAddress),
        abi: escrowAbi,
        functionName: "counterSign",
        args: [id, signature]
      });
    });
  }

  async function approveUSDC() {
    await write("Approve USDC", async (activeAccount) =>
      walletClient!.writeContract({
        account: activeAccount,
        address: getAddress(usdcAddress),
        abi: erc20Abi,
        functionName: "approve",
        args: [getAddress(escrowAddress), parseUnits(amount, 6)]
      })
    );
  }

  async function fund() {
    await write("Fund escrow", async (activeAccount) =>
      walletClient!.writeContract({
        account: activeAccount,
        address: getAddress(escrowAddress),
        abi: escrowAbi,
        functionName: "fund",
        args: [BigInt(agreementId || "0")]
      })
    );
  }

  async function deliver() {
    await write("Mark delivered", async (activeAccount) =>
      walletClient!.writeContract({
        account: activeAccount,
        address: getAddress(escrowAddress),
        abi: escrowAbi,
        functionName: "markDelivered",
        args: [BigInt(agreementId || "0"), `local://delivery-${Date.now()}`]
      })
    );
  }

  async function release() {
    await write("Release funds", async (activeAccount) =>
      walletClient!.writeContract({
        account: activeAccount,
        address: getAddress(escrowAddress),
        abi: escrowAbi,
        functionName: "approveAndRelease",
        args: [BigInt(agreementId || "0")]
      })
    );
  }

  async function readAgreement() {
    try {
      if (!addressesReady) throw new Error("Paste valid contract addresses first.");
      const data = await publicClient.readContract({
        address: getAddress(escrowAddress),
        abi: escrowAbi,
        functionName: "agreements",
        args: [BigInt(agreementId || "0")]
      });
      const next = normalizeAgreement(data);
      setAgreement(next);
      setStatus(`Loaded agreement ${next.id.toString()}.`);
    } catch (error) {
      setAgreement(null);
      setStatus(error instanceof Error ? error.message : "Could not read agreement.");
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[360px_1fr]">
      <section className="panel rounded-lg p-5 lg:sticky lg:top-6 lg:h-fit">
        <p className="kicker">MilePact technical test</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-white">Escrow contract cockpit</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          A lean test project for technical cofounders: Foundry contracts, deterministic Anvil accounts, and one Next.js dashboard. No MongoDB, no auth, no environment files.
        </p>

        <div className="mt-5 grid gap-2 text-sm">
          <code className="rounded-md border border-white/10 bg-black/25 p-3">npm run local:chain</code>
          <code className="rounded-md border border-white/10 bg-black/25 p-3">npm run contracts:deploy:local</code>
          <code className="rounded-md border border-white/10 bg-black/25 p-3">npm run dev</code>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="chip">Client {short(CLIENT_ADDRESS)}</span>
          <span className="chip">Freelancer {short(FREELANCER_ADDRESS)}</span>
          <span className="chip">Chain {localAnvil.id}</span>
        </div>
      </section>

      <section className="grid gap-5">
        <div className="panel rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="kicker">Connection</p>
              <h2 className="mt-1 text-xl font-black">Wallet and deployment</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-outline" onClick={addLocalChain}>Add Local Anvil</button>
              <button className="btn btn-primary" onClick={connectWallet}>{account ? short(account) : "Connect MetaMask"}</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Escrow address
              <input className="input mt-1" value={escrowAddress} onChange={(event) => setEscrowAddress(event.target.value)} placeholder="Paste ESCROW_ADDRESS" />
            </label>
            <label className="text-sm text-slate-300">
              MockUSDC address
              <input className="input mt-1" value={usdcAddress} onChange={(event) => setUsdcAddress(event.target.value)} placeholder="Paste USDC_ADDRESS" />
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
            <p>Status: <span className="text-white">{status}</span></p>
            <p className="mt-1">Connected role: <span className="text-white">{selectedRole}</span></p>
            {txHash && <p className="mt-1 break-all">Last tx: <span className="text-emerald-200">{txHash}</span></p>}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
          <section className="panel rounded-lg p-5">
            <p className="kicker">Lifecycle</p>
            <h2 className="mt-1 text-xl font-black">Run the escrow path</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                Freelancer wallet
                <input className="input mt-1" value={freelancer} onChange={(event) => setFreelancer(event.target.value)} />
              </label>
              <label className="text-sm text-slate-300">
                Amount USDC
                <input className="input mt-1" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label className="text-sm text-slate-300 md:col-span-2">
                Metadata hash
                <input className="input mt-1" value={metadataHash} onChange={(event) => setMetadataHash(event.target.value)} />
              </label>
              <label className="text-sm text-slate-300">
                Agreement id
                <input className="input mt-1" value={agreementId} onChange={(event) => setAgreementId(event.target.value)} />
              </label>
              <button className="btn btn-outline self-end" onClick={readAgreement}>Read agreement</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button className="btn btn-primary" onClick={createAgreement}>1. Create</button>
              <button className="btn btn-outline" onClick={counterSign}>2. Counter-sign</button>
              <button className="btn btn-outline" onClick={approveUSDC}>3. Approve USDC</button>
              <button className="btn btn-primary" onClick={fund}>4. Fund</button>
              <button className="btn btn-outline" onClick={deliver}>5. Deliver</button>
              <button className="btn btn-primary" onClick={release}>6. Release</button>
            </div>
          </section>

          <section className="panel rounded-lg p-5">
            <p className="kicker">Agreement readout</p>
            <h2 className="mt-1 text-xl font-black">Contract state</h2>
            {agreement ? (
              <div className="mt-5 grid gap-3 text-sm">
                <Metric label="State" value={states[agreement.state] || `State ${agreement.state}`} />
                <Metric label="Amount" value={`${formatUnits(agreement.amount, 6)} USDC`} />
                <Metric label="Client" value={agreement.client} />
                <Metric label="Freelancer" value={agreement.freelancer} />
                <Metric label="Counter-signed" value={agreement.counterSigned ? "Yes" : "No"} />
                <Metric label="Delivery" value={agreement.deliveryHash || "-"} />
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed border-white/15 p-4 text-sm leading-6 text-slate-400">
                No agreement loaded yet. Create an agreement or paste an id and click read.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-white">{value}</p>
    </div>
  );
}
