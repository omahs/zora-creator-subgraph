import {
  EditionInitialized,
  MediaURIsUpdated,
  DescriptionUpdated,
} from "../../../generated/templates/EditionMetadataRenderer/EditionMetadataRenderer";
import {
  EditionMetadata,
  OnChainMetadataHistory,
  ZoraCreateContract,
} from "../../../generated/schema";
import { getDefaultTokenId } from "../../common/getTokenId";
import { makeTransaction } from "../../common/makeTransaction";
import { EditionMetadataRenderer } from "../../../generated/templates/EditionMetadataRenderer/EditionMetadataRenderer";
import { ERC721Drop as ERC721DropFactory } from "../../../generated/templates/ERC721Drop/ERC721Drop";
import { Address } from "@graphprotocol/graph-ts";
import { METADATA_ERC721_EDITION } from "../../constants/metadataHistoryTypes";
import { getOnChainMetadataKey } from "../../common/getOnChainMetadataKey";

export function handleCreatedEdition(event: EditionInitialized): void {
  const metadataRecord = new EditionMetadata(getOnChainMetadataKey(event));
  metadataRecord.animationURI = event.params.animationURI;
  metadataRecord.description = event.params.description;
  metadataRecord.imageURI = event.params.imageURI;
  metadataRecord.save();

  const metadataRecordCompat = new EditionMetadata(event.params.target.toHex());
  metadataRecordCompat.animationURI = event.params.animationURI;
  metadataRecordCompat.description = event.params.description;
  metadataRecordCompat.imageURI = event.params.imageURI;
  metadataRecordCompat.save();

  const metadataLinkHistory = new OnChainMetadataHistory(
    getOnChainMetadataKey(event)
  );
  metadataLinkHistory.rendererAddress = event.address;
  metadataLinkHistory.createdAtBlock = event.block.number;
  metadataLinkHistory.editionMetadata = metadataRecord.id;
  metadataLinkHistory.tokenAndContract = getDefaultTokenId(event.params.target);

  const txn = makeTransaction(event);
  metadataLinkHistory.txn = txn;
  metadataLinkHistory.block = event.block.number;
  metadataLinkHistory.address = event.address;
  metadataLinkHistory.timestamp = event.block.timestamp;

  metadataLinkHistory.knownType = METADATA_ERC721_EDITION;
  metadataLinkHistory.save();

  updateContractURI(event.params.target);
}

export function handleUpdateMediaURIs(event: MediaURIsUpdated): void {
  const metadataRenderer = EditionMetadataRenderer.bind(event.address);
  const tokenInfo = metadataRenderer.tokenInfos(event.params.target);

  const newMetadata = new EditionMetadata(getOnChainMetadataKey(event));
  newMetadata.animationURI = event.params.animationURI;
  newMetadata.description = tokenInfo.getDescription();
  newMetadata.imageURI = event.params.imageURI;
  newMetadata.save();

  const metadataRecordCompat = new EditionMetadata(event.params.target.toHex());
  metadataRecordCompat.animationURI = event.params.animationURI;
  metadataRecordCompat.description = tokenInfo.getDescription();
  metadataRecordCompat.imageURI = event.params.imageURI;
  metadataRecordCompat.save();

  const metadataLinkHistory = new OnChainMetadataHistory(
    getOnChainMetadataKey(event)
  );
  metadataLinkHistory.rendererAddress = event.address;
  metadataLinkHistory.createdAtBlock = event.block.number;
  metadataLinkHistory.editionMetadata = newMetadata.id;
  metadataLinkHistory.tokenAndContract = getDefaultTokenId(event.params.target);
  metadataLinkHistory.txn = makeTransaction(event);
  metadataLinkHistory.knownType = METADATA_ERC721_EDITION;
  metadataLinkHistory.save();

  updateContractURI(event.params.target);
}

export function handleUpdateDescription(event: DescriptionUpdated): void {
  const metadataRenderer = EditionMetadataRenderer.bind(event.address);

  const tokenInfo = metadataRenderer.tokenInfos(event.params.target);

  const newMetadata = new EditionMetadata(getOnChainMetadataKey(event));
  newMetadata.description = event.params.newDescription;
  newMetadata.imageURI = tokenInfo.getImageURI();
  newMetadata.animationURI = tokenInfo.getAnimationURI();
  newMetadata.save();

  const metadataRecordCompat = new EditionMetadata(event.params.target.toHex());
  metadataRecordCompat.description = event.params.newDescription;
  metadataRecordCompat.imageURI = tokenInfo.getImageURI();
  metadataRecordCompat.animationURI = tokenInfo.getAnimationURI();
  metadataRecordCompat.save();

  const metadataLinkHistory = new OnChainMetadataHistory(
    getOnChainMetadataKey(event)
  );
  metadataLinkHistory.rendererAddress = event.address;
  metadataLinkHistory.createdAtBlock = event.block.number;
  metadataLinkHistory.editionMetadata = newMetadata.id;
  metadataLinkHistory.tokenAndContract = getDefaultTokenId(event.params.target);

  const txn = makeTransaction(event);
  metadataLinkHistory.txn = txn;
  metadataLinkHistory.address = event.address;
  metadataLinkHistory.block = event.block.number;
  metadataLinkHistory.timestamp = event.block.timestamp;

  metadataLinkHistory.knownType = METADATA_ERC721_EDITION;
  metadataLinkHistory.save();

  updateContractURI(event.params.target);
}

function updateContractURI(target: Address): void {
  // update contract uri from drop string
  const contract = ZoraCreateContract.load(target.toHex());
  if (contract) {
    const erc721Drop = ERC721DropFactory.bind(target);
    if (erc721Drop) {
      contract.contractURI = erc721Drop.contractURI();
      contract.save();
    }
  }
}
