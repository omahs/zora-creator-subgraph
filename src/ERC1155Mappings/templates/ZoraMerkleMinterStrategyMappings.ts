import { BigInt } from "@graphprotocol/graph-ts";
import {
  SalesConfigMerkleMinterStrategy,
  SalesStrategyConfig,
} from "../../../generated/schema";
import { SaleSet } from "../../../generated/templates/ZoraCreatorMerkleMinterStrategy/ZoraCreatorMerkleMinterStrategy";
import { getSalesConfigKey } from "../../common/getSalesConfigKey";
import { makeTransaction } from "../../common/makeTransaction";

export function handleMerkleMinterStrategySaleSet(event: SaleSet): void {
  // todo rename sender to mediaContract
  const id = getSalesConfigKey(event.address, event.params.sender, event.params.tokenId)
  let sale = new SalesConfigMerkleMinterStrategy(id);
  sale.presaleStart = event.params.merkleSaleSettings.presaleStart;
  sale.presaleEnd = event.params.merkleSaleSettings.presaleEnd;
  sale.fundsRecipient = event.params.merkleSaleSettings.fundsRecipient;
  sale.merkleRoot = event.params.merkleSaleSettings.merkleRoot;
  const txn = makeTransaction(event);
  sale.txn = txn;

  sale.save();

  // add join
  const saleJoin = new SalesStrategyConfig(id);
  if (event.params.tokenId.equals(BigInt.zero())) {
    saleJoin.contract = event.params.sender.toHex();
  } else {
    saleJoin.tokenAndContract = `${event.params.sender.toHex()}-${event.params.tokenId.toString()}`;
  }
  saleJoin.presale = id;
  saleJoin.type = "presale";
  saleJoin.txn = txn;
  saleJoin.save();
}
