import { useState, useEffect } from "react";
import { getAvatarUrl } from "../functions/getAvatarUrl";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BigNumber } from "bignumber.js";

export const useCashApp = () => {
  const [avatar, setAvatar] = useState("");
  const [userAddress, setUserAddress] = useState(
    "11111111111111111111111111111111"
  );
  const [amount, setAmount] = useState(0);
  const [receiver, setReceiver] = useState("");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [newTransactionModalOpen, setNewTransactionModalOpen] = useState(false);

  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const useLocalStroage = (stroageKey, fallbackState) => {
    const [value, setValue] = useState(
      JSON.parse(localStorage.getItem(stroageKey)) ?? fallbackState
    );

    useEffect(() => {
      localStorage.setItem(stroageKey, JSON.stringify(value));
    }, [value, setValue]);

    return [value, setValue];
  };

  const [transactions, setTransactions] = useLocalStroage("transactions", []);

  // Get Avatar based on the userAddress
  useEffect(() => {
    if (connected && publicKey) {
      setAvatar(getAvatarUrl(publicKey.toString()));
      setUserAddress(publicKey.toString());
    }
  }, [connected, publicKey]);

  //? Create the transaction to send to our wallet and we sign it from there
  const makeTransaction = async (fromWallet, toWallet, amount, reference) => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    const connection = new Connection(endpoint);

    //? Get a recent blockhash to include in the transaction
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: fromWallet, // Buyer pays the transacion fee...
    });

    //? Create the instruction to send SOL from owner to receipent
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromWallet,
      toPubkey: toWallet,
      lamports: amount.multipliedBy(LAMPORTS_PER_SOL).toNumber(),
    });

    transferInstruction.keys.push({
      pubkey: reference,
      isSigner: false,
      isWritable: false,
    });

    transaction.add(transferInstruction);

    return transaction;
  };

  //? Create function to RUN the transaction. This will be added to the button
  const doTransaction = async ({ amount, receiver, transactionPurpose }) => {
    try {
      const fromWallet = publicKey;
      const toWallet = new PublicKey(receiver);
      const bnAmount = new BigNumber(amount);
      const reference = Keypair.generate().publicKey;
      const transacion = await makeTransaction(
        fromWallet,
        toWallet,
        bnAmount,
        reference
      );

      const txnHash = await sendTransaction(transacion, connection);
      await connection.confirmTransaction(txnHash, "processed");
      console.log(txnHash);
    } catch (error) {
      console.error("Transaction failed:", error);
    }

    //? Create transaction history object
    const newID = (transacions.length + 1).toString()
    const newTransaction = {
      id: newID,
      from: {
        name: publicKey,
        handle: publicKey,
        avatar: avatar,
        verified: true,
      },

      to: {
        name: receiver,
        handle: '-',
        avatar: getAvatarUrl(receiver.toString()),
        verified: false,
      },
      description: transactionPurpose,
      transactionDate: new Date(), 
      status: "Completed",
      amount: amount,
      source: "-",
      identifier: '-',
    }
    setNewTransactionModalOpen(false)
    setTransactions([newTransaction, ...transactions])
  };

  return {
    connected,
    publicKey,
    avatar,
    userAddress,
    doTransaction,
    amount,
    setAmount,
    receiver,
    setReceiver,
    transactionPurpose,
    setTransactionPurpose,
    transactions,
    setTransactions,
    newTransactionModalOpen,
    setNewTransactionModalOpen,
  };
};
