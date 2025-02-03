export interface VaultSecret {
  path: string;
  data: Record<string, any>;
}

export interface VaultResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface WalletSecret {
  name: string;
  privateKey: string;
}

export interface WalletResponse {
  success: boolean;
  data?: {
    privateKey?: string;
    createdAt?: string;
  };
  error?: string;
}

// dynamic payloads
interface MissingField {
  unique: boolean;
  name: string;
  verify: boolean;
  label: string;
  type: string;
  enabled: boolean;
  required: boolean;
}

interface VerifiedCredential {
  chain: string;
  address: string;
  nameService: Record<string, unknown>;
  walletName: string;
  signInEnabled: boolean;
  format: string;
  id: string;
  publicIdentifier: string;
  lastSelectedAt: string;
  walletProvider: string;
}

interface WebhookEventData {
  missingFields: MissingField[];
  lastVerifiedCredentialId: string;
  metadata: Record<string, unknown>;
  mfaBackupCodeAcknowledgement: null;
  lastVisit: string;
  sessionId: string;
  projectEnvironmentId: string;
  lists: unknown[];
  newUser: boolean;
  scope: string;
  verifiedCredentials: VerifiedCredential[];
  id: string;
  firstVisit: string;
}

export interface WebhookEvent {
  eventId: string;
  webhookId: string;
  environmentId: string;
  data: WebhookEventData;
  environmentName: string;
  messageId: string;
  eventName: string;
  userId: string;
  timestamp: string;
}
