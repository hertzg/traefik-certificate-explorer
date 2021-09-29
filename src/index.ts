import express, { NextFunction, Request, Response } from "express";
import {
  extractFullChainPem,
  extractPrivateKeyPem,
  findCertificate,
  getCertificates,
  loadStore,
} from "./store";
import assert from "assert";
import { Certificate } from "@fidm/x509";
import { pick as _pick } from "lodash";
import BJSON from "buffer-json";
import { formatDistance, formatISO9075 } from "date-fns";
import {
  AcmeCertificate,
  AcmeCertificateResolverStore,
} from "./store/decoders";
import { existsSync } from "fs";

const { RESOLVER_PATH = "/data/acme.json" } = process.env;
assert(RESOLVER_PATH, "Missing RESOLVER_PATH env to load from");

const app = express();
app.set("view engine", "pug");
app.use("/public", express.static("public"));

const loadResolverStore = async () => {
  try {
    return loadStore(RESOLVER_PATH);
  } catch (e) {
    console.error(`Unable to read acme store at "${RESOLVER_PATH}"`);
  }
};

declare global {
  namespace Express {
    interface Request {
      acme: AcmeCertificateResolverStore;
    }
  }
}

const useResolverStore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    req.acme = (await loadResolverStore())!;
  } catch (e) {
    res.sendStatus(500);
    return next(e);
  }

  return next();
};

app.use(useResolverStore);

app.get("/", async (req: Request, res) => {
  const certificates = getCertificates(req.acme);

  const index = certificates
    .map((cert: AcmeCertificate, index: number) => {
      const x509 = Certificate.fromPEMs(
        Buffer.from(extractFullChainPem(cert))
      ).find((entry) => !entry.isCA);

      return {
        id: cert.domain.main,
        domain: cert.domain.main,
        sans: cert.domain.sans || [],
        files: [
          {
            href: `/attachment/${cert.domain.main}/fullchain.pem`,
            title: "💾 Full chain",
          },
          {
            href: `/attachment/${cert.domain.main}/key.pem`,
            title: "💾 Private Key",
          },
        ],
        inspect: x509 && {
          validFrom: x509.validFrom,
          validTo: x509.validTo,
          intlValidFrom: formatISO9075(x509.validFrom),
          distanceValidFrom: formatDistance(x509.validFrom, new Date(), {
            includeSeconds: true,
            addSuffix: true,
          }),
          intlValidTo: formatISO9075(x509.validTo),
          distanceValidTo: formatDistance(x509.validTo, new Date(), {
            includeSeconds: true,
            addSuffix: true,
          }),
        },
      };
    })
    .sort((a, b) =>
      a.inspect && b.inspect
        ? b.inspect.validFrom.getTime() - a.inspect.validFrom.getTime()
        : 0
    );

  const data = {
    title: "Index of /",
    index,
  };

  res.format({
    default: () => res.status(406).send("Not Acceptable"),
    html: () => res.render("index", data),
    json: () => res.json({ data }),
  });
});

const ALLOWED_TYPES = ["fullchain", "key"];

app.get("/inspect/:domain/:type", async (req, res) => {
  let { domain, type } = req.params;
  type = type.toLowerCase();

  if (!ALLOWED_TYPES.includes(type)) {
    return res.sendStatus(400);
  }

  const cert = findCertificate(req.acme, (cert) => cert.domain.main === domain);
  if (!cert) {
    return res.sendStatus(404);
  }

  const certificateData =
    type === "fullchain"
      ? extractFullChainPem(cert)
      : extractPrivateKeyPem(cert);
  const inspect = Certificate.fromPEMs(Buffer.from(certificateData));

  const data = {
    cert: {
      id: cert.domain.main,
      domain: cert.domain.main,
      sans: cert.domain.sans || [],
      files: [
        {
          href: `/attachment/${cert.domain.main}/fullchain.pem`,
          title: "Full Chain",
        },
        {
          href: `/attachment/${cert.domain.main}/key.pem`,
          title: "Private Key",
        },
      ],
    },
    inspect: inspect.map((entry) => {
      const picked = _pick(
        entry,
        "validFrom",
        "validTo",
        ["subject", "CN"],
        ["subject", "O"],
        ["subject", "C"],
        "version",
        "serialNumber",
        "signatureAlgorithm",
        "signature",
        "keyUsage",
        "dnsNames",
        "emailAddresses",
        "ipAddresses",
        "uris",
        "isCA",
        ["issuer", "CN"],
        ["issuer", "O"],
        ["issuer", "C"],
        "subjectKeyIdentifier",
        "authorityKeyIdentifier",
        "ocspServer",
        "issuingCertificateURL",
        "maxPathLen",
        "basicConstraintsValid"
      );

      return {
        ...picked,
        keyUsages: entry.getExtension("keyUsage"),
        intlValidFrom: formatISO9075(entry.validFrom),
        distanceValidFrom: formatDistance(entry.validFrom, new Date(), {
          includeSeconds: true,
          addSuffix: true,
        }),
        intlValidTo: formatISO9075(entry.validTo),
        distanceValidTo: formatDistance(entry.validTo, new Date(), {
          includeSeconds: true,
          addSuffix: true,
        }),
      };
    }),
  };

  res.format({
    default: () => res.status(406).send("Not Acceptable"),
    html: () => res.render("inspect", { ...data }),
    json: () => res.type("json").send(BJSON.stringify(data)),
  });
});

const ALLOWED_FORMATS = ["pem", "txt"];
app.get("/attachment/:domain/:type.:format", async (req, res) => {
  let { domain, type, format } = req.params;
  type = type.toLowerCase();
  format = format.toLowerCase();

  if (!ALLOWED_TYPES.includes(type) || !ALLOWED_FORMATS.includes(format)) {
    return res.sendStatus(400);
  }

  const cert = findCertificate(req.acme, (cert) => cert.domain.main === domain);
  if (!cert) {
    return res.sendStatus(404);
  }

  const content =
    type === "fullchain"
      ? extractFullChainPem(cert)
      : extractPrivateKeyPem(cert);

  if (format === "txt") {
    return res.type("text").send(content);
  }

  res.attachment(`${type}.${format}`).send(content);
});

if (!existsSync(RESOLVER_PATH)) {
  console.warn(
    'File "/data/acme.json" does not exists, did you forget to mount certificate resolver store?'
  );
}

console.log(`Starting serving certificates from %j`, RESOLVER_PATH);
const srv = app.listen(8884, () => {
  console.log(`🚀 Traefik certificate explorer started @ %j`, srv.address());
});
