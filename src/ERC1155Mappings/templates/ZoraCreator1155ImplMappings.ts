import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ZoraCreateContract,
  ZoraCreateToken,
  ZoraCreatorPermission,
  RoyaltyConfig,
  Token1155Holder,
  OnChainMetadataHistory,
} from "../../../generated/schema";
import { MetadataInfo as MetadataInfoTemplate } from "../../../generated/templates";
import {
  ContractRendererUpdated,
  OwnershipTransferred,
  TransferBatch,
  TransferSingle,
  UpdatedPermissions,
  UpdatedRoyalties,
  UpdatedToken,
  URI,
  ContractMetadataUpdated,
  SetupNewToken,
  ZoraCreator1155Impl,
} from "../../../generated/templates/ZoraCreator1155Impl/ZoraCreator1155Impl";
import { Upgraded } from "../../../generated/ZoraNFTCreatorFactory1155/ZoraCreator1155FactoryImpl";
import { getIPFSHostFromURI } from "../../common/getIPFSHostFromURI";
import { getOnChainMetadataKey } from "../../common/getOnChainMetadataKey";
import { getPermissionsKey } from "../../common/getPermissionsKey";
import { getToken1155HolderId } from "../../common/getToken1155HolderId";
import { getTokenId } from "../../common/getTokenId";
import { hasBit } from "../../common/hasBit";
import { makeTransaction } from "../../common/makeTransaction";
import { TOKEN_STANDARD_ERC1155 } from "../../constants/tokenStandard";
import { getContractId } from "../../common/getContractId";

export function handleUpgraded(event: Upgraded): void {
  const impl = ZoraCreator1155Impl.bind(event.address);
  const contract = ZoraCreateContract.load(event.address.toHex());
  if (!impl || !contract) {
    return;
  }

  contract.mintFeePerQuantity = impl.mintFee();
  contract.contractVersion = impl.contractVersion();
  contract.contractStandard = TOKEN_STANDARD_ERC1155;

  contract.save();
}

export function handleContractRendererUpdated(
  event: ContractRendererUpdated
): void {
  const token = ZoraCreateContract.load(event.address.toHex());
  if (!token) {
    return;
  }

  token.rendererContract = event.params.renderer;
  token.save();
}

export function handleURI(event: URI): void {
  const id = getTokenId(event.address, event.params.id);
  const token = ZoraCreateToken.load(id);
  if (!token) {
    return;
  }

  const ipfsHostPath = getIPFSHostFromURI(event.params.value);
  if (ipfsHostPath !== null) {
    token.metadata = ipfsHostPath;
    MetadataInfoTemplate.create(ipfsHostPath);
  }
  token.uri = event.params.value;
  token.save();

  const history = new OnChainMetadataHistory(getOnChainMetadataKey(event));

  const txn = makeTransaction(event);
  history.txn = txn;
  history.block = event.block.number;
  history.timestamp = event.block.timestamp;
  history.address = event.address;

  history.tokenAndContract = id;
  history.rendererAddress = Bytes.fromHexString(
    "0x0000000000000000000000000000000000000000"
  );
  history.createdAtBlock = event.block.number;
  history.directURI = event.params.value;
  if (ipfsHostPath !== null) {
    history.directURIMetadata = ipfsHostPath;
  }
  history.knownType = "DIRECT_URI";
  history.save();
}

export function handleUpdatedPermissions(event: UpdatedPermissions): void {
  const id = getPermissionsKey(
    event.params.user,
    event.address,
    event.params.tokenId
  );
  let permissions = ZoraCreatorPermission.load(id);
  if (!permissions) {
    permissions = new ZoraCreatorPermission(id);
  }

  permissions.block = event.block.number;
  permissions.timestamp = event.block.timestamp;

  permissions.isAdmin = hasBit(1, event.params.permissions);
  permissions.isMinter = hasBit(2, event.params.permissions);
  permissions.isSalesManager = hasBit(3, event.params.permissions);
  permissions.isMetadataManager = hasBit(4, event.params.permissions);
  permissions.isFundsManager = hasBit(5, event.params.permissions);

  permissions.user = event.params.user;
  permissions.txn = makeTransaction(event);
  permissions.tokenId = event.params.tokenId;

  permissions.tokenId = event.params.tokenId;
  if (event.params.tokenId.equals(BigInt.zero())) {
    permissions.contract = getContractId(event.address);
  } else {
    permissions.tokenAndContract = getTokenId(
      event.address,
      event.params.tokenId
    );
  }

  permissions.save();
}

export function handleUpdatedRoyalties(event: UpdatedRoyalties): void {
  const id = event.params.tokenId.equals(BigInt.zero())
    ? event.address.toHex()
    : getTokenId(event.address, event.params.tokenId);
  let royalties = new RoyaltyConfig(id);
  if (!royalties) {
    royalties = new RoyaltyConfig(id);
  }

  royalties.tokenId = event.params.tokenId;
  royalties.user = event.params.user;
  royalties.royaltyBPS = event.params.configuration.royaltyBPS;
  royalties.royaltyRecipient = event.params.configuration.royaltyRecipient;
  royalties.royaltyMintSchedule =
    event.params.configuration.royaltyMintSchedule;

  if (event.params.tokenId.equals(BigInt.zero())) {
    royalties.contract = getContractId(event.address);
  } else {
    royalties.tokenAndContract = getTokenId(
      event.address,
      event.params.tokenId
    );
  }

  royalties.save();
}

function _updateHolderTransfer(
  blockNumber: BigInt,
  contractAddress: Address,
  from: Address,
  to: Address,
  id: BigInt,
  value: BigInt
): BigInt {
  let tokenHolderCountChange = new BigInt(0);
  if (!to.equals(Address.zero())) {
    const holderId = getToken1155HolderId(to, contractAddress, id);
    let holder = Token1155Holder.load(holderId);
    if (!holder) {
      holder = new Token1155Holder(holderId);
      holder.balance = value;
      holder.tokenAndContract = getTokenId(contractAddress, id);
      holder.user = to;
      tokenHolderCountChange = tokenHolderCountChange.plus(new BigInt(1));
    } else {
      holder.balance = holder.balance.plus(value);
    }
    holder.lastUpdatedBlock = blockNumber;
    holder.save();
  } else {
    const fromHolder = Token1155Holder.load(
      getToken1155HolderId(from, contractAddress, id)
    );
    if (fromHolder) {
      fromHolder.balance = fromHolder.balance.minus(value);
      fromHolder.lastUpdatedBlock = blockNumber;
      fromHolder.save();
      if (fromHolder.balance.equals(BigInt.zero())) {
        tokenHolderCountChange = tokenHolderCountChange.minus(new BigInt(1));
      }
    }
  }
  return tokenHolderCountChange;
}

export function handleUpdatedToken(event: UpdatedToken): void {
  const id = getTokenId(event.address, event.params.tokenId);
  let token = ZoraCreateToken.load(id);
  if (!token) {
    token = new ZoraCreateToken(id);
    token.holders1155Number = new BigInt(0);
    token.tokenStandard = TOKEN_STANDARD_ERC1155;
    token.address = event.address;
    token.createdAtBlock = event.block.number;
    token.totalMinted = BigInt.zero();
  }

  const txn = makeTransaction(event);
  token.txn = txn;
  token.block = event.block.number;
  token.timestamp = event.block.timestamp;

  token.contract = getContractId(event.address);
  token.tokenId = event.params.tokenId;
  token.uri = event.params.tokenData.uri;
  token.maxSupply = event.params.tokenData.maxSupply;
  token.totalMinted = event.params.tokenData.totalMinted;
  token.totalSupply = event.params.tokenData.totalMinted;

  token.save();
}

// update the minted number and mx number
export function handleTransferSingle(event: TransferSingle): void {
  const newHolderNumber = _updateHolderTransfer(
    event.block.number,
    event.address,
    event.params.from,
    event.params.to,
    event.params.id,
    event.params.value
  );

  const token = ZoraCreateToken.load(
    getTokenId(event.address, event.params.id)
  );
  if (event.params.from.equals(Address.zero())) {
    if (token) {
      token.totalSupply = token.totalSupply.plus(event.params.value);
      token.totalMinted = token.totalMinted.plus(event.params.value);
      token.holders1155Number = token.holders1155Number.plus(newHolderNumber);
    }
  } else if (event.params.to.equals(Address.zero())) {
    if (token) {
      token.totalSupply = token.totalSupply.minus(event.params.value);
      token.holders1155Number = token.holders1155Number.plus(newHolderNumber);
    }
  } else if (newHolderNumber.gt(new BigInt(0))) {
    if (token) {
      token.holders1155Number = token.holders1155Number.plus(newHolderNumber);
    }
  }

  if (token) {
    token.save();
  }
}

// update the minted number and max number
export function handleTransferBatch(event: TransferBatch): void {
  if (event.params.from.equals(Address.zero())) {
    for (let i = 0; i < event.params.ids.length; i++) {
      const newTokenHolderBalance = _updateHolderTransfer(
        event.block.number,
        event.address,
        event.params.from,
        event.params.to,
        event.params.ids[i],
        event.params.values[i]
      );
      const tokenId = getTokenId(event.address, event.params.ids[i]);
      const token = ZoraCreateToken.load(tokenId);
      if (token) {
        token.holders1155Number = token.holders1155Number.plus(
          newTokenHolderBalance
        );
        token.totalSupply = token.totalSupply.plus(event.params.values[i]);
        token.totalMinted = token.totalMinted.plus(event.params.values[i]);
        token.save();
      }
    }
  } else if (event.params.to.equals(Address.zero())) {
    for (let i = 0; i < event.params.ids.length; i++) {
      const newTokenHolderBalance = _updateHolderTransfer(
        event.block.number,
        event.address,
        event.params.from,
        event.params.to,
        event.params.ids[i],
        event.params.values[i]
      );
      const tokenId = getTokenId(event.address, event.params.ids[i]);
      const token = ZoraCreateToken.load(tokenId);
      if (token) {
        token.holders1155Number = token.holders1155Number.plus(
          newTokenHolderBalance
        );
        token.totalSupply = token.totalSupply.minus(event.params.values[i]);
        token.save();
      }
    }
  } else {
    for (let i = 0; i < event.params.ids.length; i++) {
      const newTokenHolderBalance = _updateHolderTransfer(
        event.block.number,
        event.address,
        event.params.from,
        event.params.to,
        event.params.ids[i],
        event.params.values[i]
      );
      const tokenId = getTokenId(event.address, event.params.ids[i]);
      const token = ZoraCreateToken.load(tokenId);
      if (token) {
        token.holders1155Number = token.holders1155Number.plus(
          newTokenHolderBalance
        );
        token.save();
      }
    }
  }
}

// Update ownership field when transferred
export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  const createContract = ZoraCreateContract.load(event.address.toHex());
  if (createContract) {
    createContract.owner = event.params.newOwner;
    createContract.txn = makeTransaction(event);
    createContract.save();
  }
}

export function handleContractMetadataUpdated(
  event: ContractMetadataUpdated
): void {
  const createContract = ZoraCreateContract.load(event.address.toHex());
  if (createContract) {
    createContract.contractURI = event.params.uri;
    createContract.name = event.params.name;
    const ipfsHostPath = getIPFSHostFromURI(event.params.uri);
    if (ipfsHostPath !== null) {
      createContract.metadata = ipfsHostPath;
      MetadataInfoTemplate.create(ipfsHostPath);
    }
    createContract.save();
  }
}

export function handleSetupNewToken(event: SetupNewToken): void {
  const token = new ZoraCreateToken(
    getTokenId(event.address, event.params.tokenId)
  );

  token.holders1155Number = new BigInt(0);
  token.createdAtBlock = event.block.number;
  token.tokenId = event.params.tokenId;
  token.uri = event.params.newURI;
  token.maxSupply = event.params.maxSupply;

  const txn = makeTransaction(event);
  token.txn = txn;
  token.block = event.block.number;
  token.address = event.address;
  token.timestamp = event.block.timestamp;

  token.contract = getContractId(event.address);
  token.tokenStandard = TOKEN_STANDARD_ERC1155;

  const ipfsHostPath = getIPFSHostFromURI(event.params.newURI);
  if (ipfsHostPath !== null) {
    token.metadata = ipfsHostPath;
    MetadataInfoTemplate.create(ipfsHostPath);
  }
  token.totalMinted = BigInt.zero();
  token.totalSupply = BigInt.zero();
  token.save();
}
