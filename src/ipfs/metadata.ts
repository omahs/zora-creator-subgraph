import {
  Bytes,
  JSONValueKind,
  dataSource,
  json,
} from "@graphprotocol/graph-ts";
import { MetadataInfo } from "../../generated/schema";

export function handleJSONMetadataFetched(content: Bytes): void {
  const metadata = new MetadataInfo(dataSource.stringParam());
  metadata.rawJson = content.toString();
  const jsonType = json.try_fromBytes(content);
  if (
    jsonType.isOk &&
    !jsonType.value.isNull() &&
    jsonType.value.kind === JSONValueKind.OBJECT
  ) {
    const value = jsonType.value.toObject();
    if (value) {
      if (value.get("name")) {
        metadata.name = value.mustGet("name").toString();
      }
      if (value.get("description")) {
        metadata.description = value.mustGet("description").toString();
      }
      if (value.get("image")) {
        metadata.image = value.mustGet("image").toString();
      }
      if (value.get("decimals")) {
        metadata.decimals = value.mustGet("decimals").toString();
      }
      if (value.get("animation_url")) {
        metadata.animationUrl = value.mustGet("animation_url").toString();
      }
    }
  }

  metadata.save();
}
