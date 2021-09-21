import { readFile } from "fs/promises";

export interface AcmeStore {
  [key: string]: {
    Account: AcmeAccount;
    Certificates: AcmeCertificate[];
  };
}

export interface AcmeAccount {
  Email: string;
  Registration: {
    body: {
      status: string;
      contact: string[];
    };
    uri: string;
  };
  PrivateKey: string;
  KeyType: string;
}

export interface AcmeCertificate {
  domain: {
    main: string;
    sans?: string[];
  };
  certificate: string;
  key: string;
  Store: "default";
}

export const loadStore = async (path: string) =>
  JSON.parse(await readFile(path, { encoding: "utf8" })) as AcmeStore;

export const getCertificates = (store: AcmeStore) => {
  const resolver = Object.values(store)[0];
  return resolver.Certificates;
};

export const findCertificate = (
  store: AcmeStore,
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
