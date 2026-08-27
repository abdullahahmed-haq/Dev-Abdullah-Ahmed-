import { env } from 'cloudflare:workers'

import { CloudflareR2ObjectStore } from '../release/r2-object-store'
import type { ObjectStore } from '../release/types'

interface PortfolioBindings {
  PORTFOLIO_RELEASES: ConstructorParameters<typeof CloudflareR2ObjectStore>[0]
}

export function getReleaseStore(): ObjectStore {
  return new CloudflareR2ObjectStore((env as unknown as PortfolioBindings).PORTFOLIO_RELEASES)
}
