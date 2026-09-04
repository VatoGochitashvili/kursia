import { getSettings } from "@/lib/settings";
import type { PaymentProvider, ProviderDescriptor } from "./types";
import { SandboxPaymentProvider } from "./sandbox";
import { ManualPaymentProvider } from "./manual";
import { BogPaymentProvider } from "./bog";
import { TbcPaymentProvider } from "./tbc";

export * from "./types";
export { SandboxPaymentProvider } from "./sandbox";

/**
 * Provider registry. Adding a Georgian acquirer means writing one class and
 * adding one line here — no checkout, webhook or fulfilment code changes.
 */
const FACTORIES: Record<string, () => PaymentProvider> = {
  sandbox: () => new SandboxPaymentProvider(),
  manual: () => new ManualPaymentProvider(),
  bog: () => new BogPaymentProvider(),
  tbc: () => new TbcPaymentProvider(),
};

const cache = new Map<string, PaymentProvider>();

export function getProvider(id: string): PaymentProvider {
  const cached = cache.get(id);
  if (cached) return cached;
  const factory = FACTORIES[id];
  if (!factory) throw new Error(`Unknown payment provider "${id}"`);
  const provider = factory();
  cache.set(id, provider);
  return provider;
}

export const providerExists = (id: string) => id in FACTORIES;

/** Providers enabled in settings AND holding valid credentials. */
export async function availableProviders(): Promise<ProviderDescriptor[]> {
  const settings = await getSettings();
  const out: ProviderDescriptor[] = [];
  for (const id of settings.paymentProviders) {
    if (!providerExists(id)) continue;
    try {
      const d = getProvider(id).descriptor();
      if (d.configured) out.push(d);
    } catch {
      // Constructor throws when credentials are missing — treat as unavailable
      // rather than breaking the checkout page for every other provider.
    }
  }
  return out;
}

/** The provider to use when the buyer did not pick one. */
export async function resolveProviderId(requested?: string): Promise<string> {
  const providers = await availableProviders();
  if (providers.length === 0) {
    throw new Error(
      "No payment provider is configured. Set PAYMENT_PROVIDERS and the matching credentials — see .env.example.",
    );
  }
  if (requested && providers.some((p) => p.id === requested)) return requested;
  const settings = await getSettings();
  if (providers.some((p) => p.id === settings.defaultPaymentProvider)) {
    return settings.defaultPaymentProvider;
  }
  return providers[0]!.id;
}
