/**
 * Converts IPFS URL to accessible HTTP URL through reliable gateway.
 * @param url - URL that can be in ipfs://... format or already be HTTP gateway link.
 * @returns - HTTP URL or original URL if it's not IPFS.
 */
export function resolveIpfsUrl(url: string | undefined | null): string {
  if (!url) {
    return "";
  }

  // Use fast and reliable gateway
  const preferredGateway = 'https://nftstorage.link/ipfs/';

  if (url.startsWith('ipfs://')) {
    return `${preferredGateway}${url.replace('ipfs://', '')}`;
  }

  // Return URL as is if it's already HTTP(S) link
  return url;
}