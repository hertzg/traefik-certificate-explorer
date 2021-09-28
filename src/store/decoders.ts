import {
  array,
  DecoderType,
  dict,
  guard,
  object,
  optional,
  string,
} from "decoders";

const acmeAccountDecoder = object({
  Email: string,
  Registration: object({
    body: object({
      status: string,
      contact: array(string),
    }),
    uri: string,
  }),
  PrivateKey: string,
  KeyType: string,
});

const acmeCertificateDecoder = object({
  domain: object({
    main: string,
    sans: optional(array(string)),
  }),
  certificate: string,
  key: string,
  Store: string,
});

const acmeCertificateResolverDecoder = object({
  Account: acmeAccountDecoder,
  Certificates: array(acmeCertificateDecoder),
});

const acmeCertificateResolverStoreDecoder = dict(
  acmeCertificateResolverDecoder
);

export type AcmeAccount = DecoderType<typeof acmeAccountDecoder>;
export type AcmeCertificate = DecoderType<typeof acmeCertificateDecoder>;

export type AcmeCertificateResolver = DecoderType<
  typeof acmeCertificateResolverDecoder
>;
export type AcmeCertificateResolverStore = DecoderType<
  typeof acmeCertificateResolverStoreDecoder
>;

export const asAcmeCertResolverStore = guard(
  acmeCertificateResolverStoreDecoder
);
