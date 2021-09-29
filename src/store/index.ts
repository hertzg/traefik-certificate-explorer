import { readFile } from "fs/promises";
import {
  AcmeCertificate,
  AcmeCertificateResolverStore,
  asAcmeCertResolverStore,
} from "./decoders";

export const loadStore = async (path: string) => {
  let parsedContents: unknown;
  try {
    parsedContents = JSON.parse(await readFile(path, { encoding: "utf8" }));
  } catch (e) {
    throw new Error(`Error reading/parsing acme json store: ${e}`);
  }

  return asAcmeCertResolverStore(parsedContents);
};

export const getCertificates = (store: AcmeCertificateResolverStore) => {
  const resolver = Object.values(store)[0];
  return resolver.Certificates;
};

export const findCertificate = (
  store: AcmeCertificateResolverStore,
  predicate: (
    value: AcmeCertificate,
    index: number,
    obj: AcmeCertificate[]
  ) => unknown
) => getCertificates(store).find(predicate);

const base64Decode = (input: string) =>
  Buffer.from(input, "base64").toString("utf-8");

export const extractFullChainPem = (cert: AcmeCertificate) =>
  base64Decode(cert.certificate);

export const extractPrivateKeyPem = (cert: AcmeCertificate) =>
  base64Decode(cert.key);
