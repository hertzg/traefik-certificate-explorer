## Traefik v2 Certificate (let's encrypt) Explorer

Traefik has a nice feature of
[generating certificates for the host on the fly using lets encrypt](https://doc.traefik.io/traefik/https/acme/).
All the generated certificates are stored in `acme.json` format. This app uses
(only reads) that file to provide a visual representation of the certificates &
private keys and provides an easy way to inspect and export a PEM format for use
in other paces.

**HINT**: Sending `Accept: application/json` header will return `JSON`
representation of the page.

## Quick Start

```shell
$ docker run -p 8884:8884 -v /path/to/your/acme.json:/data/acme.json hertzg/traefik-certificate-explorer
```

UI/UX is very rough, just enough to be usable for now (PRs are welcome).

![Screenshot of the index page with all certificates](docs/screens/index.png?raw=true)

## JSON responses

To receive a JSON response you use the same URL's while browsing, but send
`Accept: application/json` header.

```shell
hertz@potato:~$ curl -H "Accept: application/json" -vvv http://localhost:8884/
> GET / HTTP/1.1
> Host: localhost:8884
> User-Agent: curl/7.68.0
> Accept: application/json
>

< HTTP/1.1 200 OK
< X-Powered-By: Express
< Vary: Accept
< Content-Type: application/json; charset=utf-8
< Content-Length: 19757
< Date: Wed, 29 Sep 2021 00:16:34 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5

# .. body containing JSON ..
```
