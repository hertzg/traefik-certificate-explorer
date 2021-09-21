import express from "express";
import {extractFullChainPem, extractPrivateKeyPem, findCertificate, getCertificates, loadStore,} from "./store";
import assert from "assert";

const {RESOLVER_PATH = undefined} = process.env;
assert(RESOLVER_PATH, "Missing RESOLVER_PATH env to load from");

const app = express();
app.set("view engine", "pug");
app.use("/public", express.static("public"));

const loadResolverStore = async () => loadStore(RESOLVER_PATH);

app.get("/", async (req, res) => {
  const store = await loadResolverStore();
  const certificates = getCertificates(store);

  const index = certificates.map((cert, index) => ({
    id: cert.domain.main,
    domain: cert.domain.main,
    sans: cert.domain.sans || [],
    files: [
      {
        href: `/attachment/${cert.domain.main}/fullchain.pem`,
        title: "Certificate",
      },
      {
        href: `/attachment/${cert.domain.main}/key.pem`,
        title: "Private Key",
      },
    ],
  }));

  const data = {
    title: "Index of /",
    index,
  };

  res.format({
    default: () => res.status(406).send("Not Acceptable"),
    html: () => res.render("index", data),
    json: () => res.json({data}),
  });
});

const ALLOWED_TYPES = ["fullchain", "key"];
const ALLOWED_FORMATS = ["pem", "txt"];

app.get("/attachment/:domain/:type.:format", async (req, res) => {
  let {domain, type, format} = req.params;
  type = type.toLowerCase();
  format = format.toLowerCase();

  if (!ALLOWED_TYPES.includes(type) || !ALLOWED_FORMATS.includes(format)) {
    return res.sendStatus(400);
  }

  const store = await loadResolverStore();
  const cert = findCertificate(store, (cert) => cert.domain.main === domain);
  if (!cert) {
    return res.sendStatus(404);
  }

  let content;
  switch (type) {
    case "fullchain":
      content = extractFullChainPem(cert);
      break;
    case "key":
      content = extractPrivateKeyPem(cert);
      break;
  }
  assert(content);

  if (format === "txt") {
    return res.type("text").send(content);
  }

  res.attachment(`${type}.${format}`).send(content);
});

const srv = app.listen(8088, () => {
  console.log(`🚀 Traefik certificate explorer started @ %j`, srv.address())
});
