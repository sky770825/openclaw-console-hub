# Skill: Proxy Web Fetch

## Description
Fetches the content of a URL, automatically using a proxy if the `HTTPS_PROXY` or `HTTP_PROXY` environment variables are set.

## Usage
- `fetch <url>`: Fetches the content from the specified URL. If `HTTPS_PROXY` or `HTTP_PROXY` environment variables are set, it will automatically use the proxy for the request.

## Example
`fetch https://example.com`

To use a proxy, set the environment variables before running the script:
```bash
export HTTPS_PROXY=http://your-proxy-address:port
armory/proxy-web-fetch/fetch.sh https://example.com
```
