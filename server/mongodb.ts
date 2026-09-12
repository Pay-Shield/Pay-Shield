import { MongoClient, Db, Collection } from 'mongodb';
import dns from 'dns';

export interface MongoScenario {
  _id?: any;
  id: string;
  label: string;
  outcomeType: 'SAFE' | 'VERIFY' | 'PAUSED' | 'BLOCKED';
  recipientName: string;
  upiId: string;
  amount: number;
  message: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MongoTransaction {
  _id?: any;
  id: string;
  recipientName: string;
  upiId: string;
  amount: number;
  currency: string;
  timestamp: string;
  createdAt: string; // ISO-8601 for reliable chronological sorting & analytics
  status: 'SAFE' | 'VERIFY' | 'PAUSED' | 'BLOCKED';
  riskScore: number;
  riskLevel: 'SAFE' | 'WARNING' | 'HIGH' | 'CRITICAL';
  riskBreakdown: {
    transactionRisk: number;
    recipientRisk: number;
    behaviorRisk: number;
    socialEngineeringRisk: number;
    networkRisk: number;
  };
  verificationLevel: 'LEVEL_1_UNKNOWN' | 'LEVEL_2_IDENTIFIED' | 'LEVEL_3_VERIFIED' | 'LEVEL_4_TRUSTED';
  reasons: string[];
  message?: string;
  deviceUsed?: string;
  location?: string;
  investigationSteps: Array<{
    step: string;
    status: 'completed' | 'processing' | 'flagged' | 'pending';
    timestamp: string;
    detail: string;
  }>;
  analysisDurationSeconds: number;
  hitlOutcome?: 'pending' | 'confirmed' | 'cancelled';
  auditHash?: string;
  // PayShield's local-LLM reasoning module (Ollama) — bounded ±15 adjustment
  // and narrative on top of the rules engine, not present in every build.
  llmReasoning?: string | null;
  llmScoreAdjustment?: number;
}

const DEFAULT_SEED_TRANSACTIONS: MongoTransaction[] = [
  {
    id: 'TXN-88492-IN',
    recipientName: 'Rahul Sharma',
    upiId: 'rahul@upi',
    amount: 1200,
    currency: '₹',
    timestamp: 'Today, 10:42 AM',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'SAFE',
    riskScore: 8,
    riskLevel: 'SAFE',
    riskBreakdown: {
      transactionRisk: 5,
      recipientRisk: 7,
      behaviorRisk: 10,
      socialEngineeringRisk: 4,
      networkRisk: 12,
    },
    verificationLevel: 'LEVEL_3_VERIFIED',
    reasons: [
      'Frequent recipient with 14 prior successful transfers',
      'Amount matches typical peer-to-peer spending baseline',
      'No social engineering or urgency phrases detected',
    ],
    message: 'Lunch contribution',
    deviceUsed: 'iPhone 15 Pro (Primary Device)',
    location: 'Mumbai, MH, India',
    analysisDurationSeconds: 1.18,
    investigationSteps: [
      { step: 'Transaction created & payload validated', status: 'completed', timestamp: '10:42:01 AM', detail: 'Payload integrity checked. Valid UPI VPA syntax.' },
      { step: 'Recipient trust & history evaluated', status: 'completed', timestamp: '10:42:01 AM', detail: 'Recipient verified in KYC registry. 14 past transactions recorded.' },
      { step: 'Behavioral pattern analyzed', status: 'completed', timestamp: '10:42:02 AM', detail: 'Amount within normal 95th percentile distribution for peer payments.' },
      { step: 'Scam & coercion signals screened', status: 'completed', timestamp: '10:42:02 AM', detail: 'NLP scan found no urgency, impersonation, or blackmail signals.' },
      { step: 'Risk score computed', status: 'completed', timestamp: '10:42:02 AM', detail: 'Aggregated risk score: 8/100 (Safe). Decision: ALLOW.' },
    ],
    hitlOutcome: 'confirmed',
  },
  {
    id: 'TXN-88489-IN',
    recipientName: 'Amazon Pay India',
    upiId: 'merchant@upi',
    amount: 2499,
    currency: '₹',
    timestamp: 'Today, 09:15 AM',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    status: 'SAFE',
    riskScore: 12,
    riskLevel: 'SAFE',
    riskBreakdown: {
      transactionRisk: 10,
      recipientRisk: 4,
      behaviorRisk: 14,
      socialEngineeringRisk: 6,
      networkRisk: 18,
    },
    verificationLevel: 'LEVEL_4_TRUSTED',
    reasons: [
      'Certified e-commerce merchant VPA with trusted cryptographic signature',
      'Regular merchant purchase pattern within historical limits',
    ],
    message: 'Order #402-9182741-29182',
    deviceUsed: 'MacBook Pro M3 (Chrome 124)',
    location: 'Mumbai, MH, India',
    analysisDurationSeconds: 1.05,
    investigationSteps: [
      { step: 'Transaction created & payload validated', status: 'completed', timestamp: '09:15:00 AM', detail: 'Merchant QR scan verified through official gateway.' },
      { step: 'Recipient trust & history evaluated', status: 'completed', timestamp: '09:15:00 AM', detail: 'NPCI certified e-commerce merchant.' },
      { step: 'Behavioral pattern analyzed', status: 'completed', timestamp: '09:15:01 AM', detail: 'Typical morning checkout transaction.' },
      { step: 'Scam & coercion signals screened', status: 'completed', timestamp: '09:15:01 AM', detail: 'Standard merchant reference token.' },
      { step: 'Risk score computed', status: 'completed', timestamp: '09:15:01 AM', detail: 'Aggregated risk score: 12/100. Decision: ALLOW.' },
    ],
    hitlOutcome: 'confirmed',
  },
  {
    id: 'TXN-88461-IN',
    recipientName: 'Unknown Recipient',
    upiId: 'unknown@upi',
    amount: 25000,
    currency: '₹',
    timestamp: 'Yesterday, 06:22 PM',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'PAUSED',
    riskScore: 82,
    riskLevel: 'HIGH',
    riskBreakdown: {
      transactionRisk: 78,
      recipientRisk: 72,
      behaviorRisk: 65,
      socialEngineeringRisk: 91,
      networkRisk: 40,
    },
    verificationLevel: 'LEVEL_1_UNKNOWN',
    reasons: [
      'First-time transfer to an unverified recipient with zero trust history',
      'Transaction amount is 420% above the 30-day median peer payment',
      'High-pressure urgency markers detected in payment remark ("Urgent payment release now")',
      'Recipient handle created less than 48 hours ago',
    ],
    message: 'Urgent payment release now or electricity disconnected',
    deviceUsed: 'iPhone 15 Pro (Primary Device)',
    location: 'Mumbai, MH, India',
    analysisDurationSeconds: 1.42,
    investigationSteps: [
      { step: 'Transaction created & payload validated', status: 'completed', timestamp: '06:22:10 PM', detail: 'Immediate high-value transfer requested.' },
      { step: 'Recipient trust & history evaluated', status: 'flagged', timestamp: '06:22:10 PM', detail: 'Recipient account newly registered (48 hrs ago); 0 shared contacts.' },
      { step: 'Behavioral pattern analyzed', status: 'flagged', timestamp: '06:22:11 PM', detail: 'Abnormal deviation (+420%) compared to user baseline.' },
      { step: 'Scam & coercion signals screened', status: 'flagged', timestamp: '06:22:11 PM', detail: 'Urgency & disconnection threat patterns detected in remark.' },
      { step: 'Risk score computed', status: 'flagged', timestamp: '06:22:11 PM', detail: 'Aggregated risk score: 82/100 (HIGH RISK). Decision: PAUSE.' },
    ],
    hitlOutcome: 'pending',
  },
  {
    id: 'TXN-88390-IN',
    recipientName: 'Crypto Investment Desk',
    upiId: 'invest-guaranteed@okhdfcbank',
    amount: 50000,
    currency: '₹',
    timestamp: 'Sep 09, 03:40 PM',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'BLOCKED',
    riskScore: 94,
    riskLevel: 'CRITICAL',
    riskBreakdown: {
      transactionRisk: 96,
      recipientRisk: 98,
      behaviorRisk: 88,
      socialEngineeringRisk: 95,
      networkRisk: 92,
    },
    verificationLevel: 'LEVEL_1_UNKNOWN',
    reasons: [
      'Recipient VPA matched with active scam registry (31 fraud reports)',
      'Impersonation of licensed financial advisory with fake guaranteed returns',
      'Unusual device geolocation disparity detected',
      'Payment velocity pattern matches known "Pig Butchering" investment fraud',
    ],
    message: 'Guaranteed 40% crypto return deposit',
    deviceUsed: 'iPhone 15 Pro (Primary Device)',
    location: 'Mumbai, MH, India',
    analysisDurationSeconds: 1.34,
    investigationSteps: [
      { step: 'Transaction created & payload validated', status: 'completed', timestamp: '03:40:02 PM', detail: 'Large outward transfer to unverified commercial handle.' },
      { step: 'Recipient trust & history evaluated', status: 'flagged', timestamp: '03:40:02 PM', detail: 'VPA flagged on NPCI scam syndicate blacklist with 31 reports.' },
      { step: 'Behavioral pattern analyzed', status: 'flagged', timestamp: '03:40:03 PM', detail: 'Sudden spike in discretionary transfer limits.' },
      { step: 'Scam & coercion signals screened', status: 'flagged', timestamp: '03:40:03 PM', detail: 'Identified high-yield investment scam wording ("Guaranteed 40%").' },
      { step: 'Risk score computed', status: 'flagged', timestamp: '03:40:03 PM', detail: 'Aggregated risk score: 94/100 (CRITICAL RISK). Decision: BLOCK.' },
    ],
    hitlOutcome: 'cancelled',
  },
  {
    id: 'TXN-88210-IN',
    recipientName: 'Priya Patel',
    upiId: 'priya.freelance@icici',
    amount: 8500,
    currency: '₹',
    timestamp: 'Sep 08, 11:30 AM',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    status: 'VERIFY',
    riskScore: 42,
    riskLevel: 'WARNING',
    riskBreakdown: {
      transactionRisk: 38,
      recipientRisk: 46,
      behaviorRisk: 35,
      socialEngineeringRisk: 28,
      networkRisk: 30,
    },
    verificationLevel: 'LEVEL_2_IDENTIFIED',
    reasons: [
      'First transaction to this verified ICICI account',
      'Recipient has clean banking record but requires one-time confirmation',
      'No scam or pressure keywords detected in transaction context',
    ],
    message: 'Graphic design invoice #12',
    deviceUsed: 'MacBook Pro M3 (Chrome 124)',
    location: 'Mumbai, MH, India',
    analysisDurationSeconds: 1.12,
    investigationSteps: [
      { step: 'Transaction created & payload validated', status: 'completed', timestamp: '11:30:00 AM', detail: 'Standard B2B invoice settlement.' },
      { step: 'Recipient trust & history evaluated', status: 'completed', timestamp: '11:30:00 AM', detail: 'Name matched on bank registry. No prior transaction history.' },
      { step: 'Behavioral pattern analyzed', status: 'completed', timestamp: '11:30:01 AM', detail: 'Amount aligned with general freelance services expenditure.' },
      { step: 'Scam & coercion signals screened', status: 'completed', timestamp: '11:30:01 AM', detail: 'Legitimate invoice reference tags.' },
      { step: 'Risk score computed', status: 'completed', timestamp: '11:30:01 AM', detail: 'Aggregated risk score: 42/100. Decision: VERIFY.' },
    ],
    hitlOutcome: 'pending',
  },
  {
    id: 'TXN-88104-IN',
    recipientName: 'Zomato Online',
    upiId: 'zomato@hdfcbank',
    amount: 680,
    currency: '₹',
    timestamp: 'Sep 07, 08:45 PM',
    createdAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    status: 'SAFE',
    riskScore: 6,
    riskLevel: 'SAFE',
    riskBreakdown: {
      transactionRisk: 4,
      recipientRisk: 3,
      behaviorRisk: 6,
      socialEngineeringRisk: 2,
      networkRisk: 10,
    },
    verificationLevel: 'LEVEL_4_TRUSTED',
    reasons: [
      'Trusted merchant with over 80 verified transactions',
      'Routine food delivery purchase within normal evening hours',
    ],
    message: 'Dinner order #49281',
    deviceUsed: 'iPhone 15 Pro (Primary Device)',
    location: 'Mumbai, MH, India',
    analysisDurationSeconds: 0.98,
    investigationSteps: [
      { step: 'Transaction created & payload validated', status: 'completed', timestamp: '08:45:01 PM', detail: 'Food delivery settlement token validated.' },
      { step: 'Recipient trust & history evaluated', status: 'completed', timestamp: '08:45:01 PM', detail: 'Level 4 Trusted Merchant.' },
      { step: 'Risk score computed', status: 'completed', timestamp: '08:45:02 PM', detail: 'Aggregated risk score: 6/100. Decision: ALLOW.' },
    ],
    hitlOutcome: 'confirmed',
  },
];

function sanitizeMongoUri(rawUri?: string): string | null {
  if (!rawUri) return null;
  let uri = rawUri.trim();

  // If user provided Ubale@2005 in unencoded form
  if (uri.includes('Ubale@2005')) {
    uri = uri.replace('Ubale@2005', 'Ubale2005');
  }

  // Ensure target database is payshield if not specified
  if (uri.includes('.mongodb.net/?') || uri.endsWith('.mongodb.net/')) {
    uri = uri.replace('.mongodb.net/', '.mongodb.net/payshield');
  } else if (uri.endsWith('.mongodb.net')) {
    uri = `${uri}/payshield?retryWrites=true&w=majority`;
  }

  return uri;
}

// Public fallback DNS resolvers. Some networks (VPN clients, security
// software) point Node's own resolver at a local address (e.g. 127.0.0.1)
// that refuses the SRV/TXT lookups `mongodb+srv://` URIs need, even though
// the OS-level resolver (nslookup, browsers, curl) succeeds via its own
// fallback path. Node's `dns` module doesn't share that OS-level fallback,
// so if a DNS-shaped error is what broke the connection, retry once after
// pointing Node's resolver at known-good public servers.
const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

function isDnsResolutionError(err: any): boolean {
  const code = err?.code || err?.cause?.code;
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') return true;
  return /querySrv|queryTxt/i.test(String(err?.message || ''));
}

class MongoService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectingPromise: Promise<Db> | null = null;
  private triedDnsFallback = false;
  // Local fallback storage in case Atlas is temporarily unreachable or MONGODB_URI is unset
  private memoryCache: MongoScenario[] = [];
  private transactionMemoryCache: MongoTransaction[] = [...DEFAULT_SEED_TRANSACTIONS];
  private seedsInitialized = false;

  private async connectOnce(uri: string): Promise<Db> {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    this.client = client;
    this.db = client.db('payshield');
    return this.db;
  }

  private async getDb(): Promise<Db> {
    if (this.db) return this.db;
    if (this.connectingPromise) return this.connectingPromise;

    const uri = sanitizeMongoUri(process.env.MONGODB_URI);
    if (!uri) {
      console.warn('⚠️ MONGODB_URI is not set in environment. Using in-memory cache instead of MongoDB Atlas.');
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    this.connectingPromise = (async () => {
      try {
        console.log('Connecting to MongoDB Atlas Cluster via MONGODB_URI...');
        const db = await this.connectOnce(uri);
        console.log('✅ Connected successfully to MongoDB Atlas (payshield DB)');
        return db;
      } catch (err: any) {
        if (!this.triedDnsFallback && isDnsResolutionError(err)) {
          this.triedDnsFallback = true;
          console.warn(
            `⚠️ MongoDB Atlas DNS lookup failed via the configured resolver (${err.message}) — retrying with public DNS servers (${FALLBACK_DNS_SERVERS.join(', ')})...`
          );
          dns.setServers(FALLBACK_DNS_SERVERS);
          try {
            const db = await this.connectOnce(uri);
            console.log('✅ Connected successfully to MongoDB Atlas (payshield DB) after DNS fallback');
            return db;
          } catch (retryErr: any) {
            console.error('⚠️ MongoDB Atlas connection failed even after DNS fallback:', retryErr.message);
            this.connectingPromise = null;
            throw retryErr;
          }
        }

        console.error('⚠️ MongoDB Atlas initial connection failed:', err.message);
        this.connectingPromise = null;
        throw err;
      }
    })();

    return this.connectingPromise;
  }

  private async getCollection(): Promise<Collection<MongoScenario>> {
    const db = await this.getDb();
    return db.collection<MongoScenario>('test_scenarios');
  }

  public async getScenarios(): Promise<MongoScenario[]> {
    try {
      const col = await this.getCollection();
      const docs = await col
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      // Map to safe objects
      const scenarios = docs.map((doc) => ({
        id: doc.id || String(doc._id),
        label: doc.label,
        outcomeType: doc.outcomeType,
        recipientName: doc.recipientName,
        upiId: doc.upiId,
        amount: doc.amount,
        message: doc.message,
        description: doc.description || '',
        createdAt: doc.createdAt || new Date().toISOString(),
        updatedAt: doc.updatedAt || new Date().toISOString(),
      }));
      this.memoryCache = scenarios;
      return scenarios;
    } catch (err: any) {
      console.warn('Falling back to memory cache due to MongoDB Atlas error:', err.message);
      return this.memoryCache;
    }
  }

  public async createScenario(
    data: Omit<MongoScenario, 'id' | 'createdAt' | 'updatedAt' | '_id'> & { id?: string }
  ): Promise<MongoScenario> {
    const now = new Date().toISOString();
    const id = data.id || `scen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const scenario: MongoScenario = {
      id,
      label: data.label.trim(),
      outcomeType: data.outcomeType || 'VERIFY',
      recipientName: data.recipientName.trim(),
      upiId: data.upiId.trim(),
      amount: Number(data.amount) || 0,
      message: (data.message || '').trim(),
      description: (data.description || '').trim(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const col = await this.getCollection();
      await col.insertOne({ ...scenario });
    } catch (err: any) {
      console.warn('Could not write scenario directly to MongoDB Atlas, saving to memory fallback:', err.message);
    }

    // Keep memory cache updated
    this.memoryCache = [scenario, ...this.memoryCache.filter((s) => s.id !== id)];
    return scenario;
  }

  public async deleteScenario(id: string): Promise<boolean> {
    let deleted = false;
    try {
      const col = await this.getCollection();
      const res = await col.deleteOne({ id });
      deleted = res.deletedCount > 0;
    } catch (err: any) {
      console.warn('Could not delete scenario directly from MongoDB Atlas:', err.message);
    }

    this.memoryCache = this.memoryCache.filter((s) => s.id !== id);
    return deleted || true;
  }

  public async checkStatus(): Promise<{
    connected: boolean;
    database: string;
    collection: string;
    count: number;
    error?: string;
  }> {
    try {
      const col = await this.getCollection();
      const count = await col.countDocuments();
      return {
        connected: true,
        database: 'payshield',
        collection: 'test_scenarios',
        count,
      };
    } catch (err: any) {
      return {
        connected: false,
        database: 'payshield',
        collection: 'test_scenarios',
        count: this.memoryCache.length,
        error: err.message,
      };
    }
  }

  // ============================================================================
  // Transactions Management (MongoDB Atlas 'transactions' Collection)
  // ============================================================================

  private async getTransactionCollection(): Promise<Collection<MongoTransaction>> {
    const db = await this.getDb();
    const col = db.collection<MongoTransaction>('transactions');
    await this.ensureTransactionSeeds(col);
    return col;
  }

  private async ensureTransactionSeeds(col: Collection<MongoTransaction>): Promise<void> {
    if (this.seedsInitialized) return;
    try {
      const count = await col.countDocuments();
      if (count === 0) {
        console.log('🌱 Seeding MongoDB Atlas transactions collection with initial baseline records...');
        await col.insertMany(DEFAULT_SEED_TRANSACTIONS.map((t) => ({ ...t })));
        console.log(`✅ Seeded ${DEFAULT_SEED_TRANSACTIONS.length} initial transactions into MongoDB Atlas`);
      }
      this.seedsInitialized = true;
    } catch (err: any) {
      console.warn('Could not auto-seed transactions in Atlas, using in-memory baseline:', err.message);
      this.seedsInitialized = true;
    }
  }

  public async getTransactions(options?: {
    search?: string;
    status?: string;
    amountFilter?: string;
    riskSort?: string;
    limit?: number;
  }): Promise<MongoTransaction[]> {
    const search = options?.search?.toLowerCase().trim();
    const status = options?.status?.toUpperCase();
    const amountFilter = options?.amountFilter;
    const riskSort = options?.riskSort;
    const limit = options?.limit || 100;

    try {
      const col = await this.getTransactionCollection();
      const query: any = {};

      if (status && status !== 'ALL') {
        query.status = status;
      }

      if (amountFilter === 'under1k') {
        query.amount = { $lt: 1000 };
      } else if (amountFilter === '1k-10k') {
        query.amount = { $gte: 1000, $lte: 10000 };
      } else if (amountFilter === 'above10k') {
        query.amount = { $gt: 10000 };
      }

      if (search) {
        query.$or = [
          { recipientName: { $regex: search, $options: 'i' } },
          { upiId: { $regex: search, $options: 'i' } },
          { id: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } },
        ];
      }

      const sortSpec: any = {};
      if (riskSort === 'desc') {
        sortSpec.riskScore = -1;
      } else if (riskSort === 'asc') {
        sortSpec.riskScore = 1;
      } else {
        sortSpec.createdAt = -1;
      }

      const docs = await col.find(query).sort(sortSpec).limit(limit).toArray();

      const sanitized: MongoTransaction[] = docs.map((doc) => ({
        id: doc.id || String(doc._id),
        recipientName: doc.recipientName,
        upiId: doc.upiId,
        amount: Number(doc.amount) || 0,
        currency: doc.currency || '₹',
        timestamp: doc.timestamp || 'Just now',
        createdAt: doc.createdAt || new Date().toISOString(),
        status: doc.status,
        riskScore: Number(doc.riskScore) || 0,
        riskLevel: doc.riskLevel,
        riskBreakdown: doc.riskBreakdown || {
          transactionRisk: 0,
          recipientRisk: 0,
          behaviorRisk: 0,
          socialEngineeringRisk: 0,
          networkRisk: 0,
        },
        verificationLevel: doc.verificationLevel || 'LEVEL_1_UNKNOWN',
        reasons: doc.reasons || [],
        message: doc.message,
        deviceUsed: doc.deviceUsed,
        location: doc.location,
        investigationSteps: doc.investigationSteps || [],
        analysisDurationSeconds: Number(doc.analysisDurationSeconds) || 1.0,
        hitlOutcome: doc.hitlOutcome,
        llmReasoning: doc.llmReasoning,
        llmScoreAdjustment: doc.llmScoreAdjustment,
      }));

      // Merge into local cache
      sanitized.forEach((t) => {
        const idx = this.transactionMemoryCache.findIndex((x) => x.id === t.id);
        if (idx >= 0) this.transactionMemoryCache[idx] = t;
        else this.transactionMemoryCache.unshift(t);
      });

      return sanitized;
    } catch (err: any) {
      console.warn('Falling back to local cache for getTransactions:', err.message);

      let list = [...this.transactionMemoryCache];

      if (status && status !== 'ALL') {
        list = list.filter((t) => t.status === status);
      }

      if (amountFilter === 'under1k') {
        list = list.filter((t) => t.amount < 1000);
      } else if (amountFilter === '1k-10k') {
        list = list.filter((t) => t.amount >= 1000 && t.amount <= 10000);
      } else if (amountFilter === 'above10k') {
        list = list.filter((t) => t.amount > 10000);
      }

      if (search) {
        list = list.filter(
          (t) =>
            t.recipientName.toLowerCase().includes(search) ||
            t.upiId.toLowerCase().includes(search) ||
            t.id.toLowerCase().includes(search) ||
            (t.message && t.message.toLowerCase().includes(search))
        );
      }

      if (riskSort === 'desc') {
        list.sort((a, b) => b.riskScore - a.riskScore);
      } else if (riskSort === 'asc') {
        list.sort((a, b) => a.riskScore - b.riskScore);
      } else {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return list.slice(0, limit);
    }
  }

  public async getFlaggedTransactions(options?: {
    status?: string;
    limit?: number;
  }): Promise<MongoTransaction[]> {
    const status = options?.status?.toUpperCase();
    const limit = options?.limit || 100;

    try {
      const col = await this.getTransactionCollection();
      const query: any = {};

      if (status && ['VERIFY', 'PAUSED', 'BLOCKED'].includes(status)) {
        query.status = status;
      } else {
        query.status = { $in: ['VERIFY', 'PAUSED', 'BLOCKED'] };
      }

      const docs = await col
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      const sanitized: MongoTransaction[] = docs.map((doc) => ({
        id: doc.id || String(doc._id),
        recipientName: doc.recipientName,
        upiId: doc.upiId,
        amount: Number(doc.amount) || 0,
        currency: doc.currency || '₹',
        timestamp: doc.timestamp || 'Just now',
        createdAt: doc.createdAt || new Date().toISOString(),
        status: doc.status,
        riskScore: Number(doc.riskScore) || 0,
        riskLevel: doc.riskLevel,
        riskBreakdown: doc.riskBreakdown || {
          transactionRisk: 0,
          recipientRisk: 0,
          behaviorRisk: 0,
          socialEngineeringRisk: 0,
          networkRisk: 0,
        },
        verificationLevel: doc.verificationLevel || 'LEVEL_1_UNKNOWN',
        reasons: doc.reasons || [],
        message: doc.message,
        deviceUsed: doc.deviceUsed,
        location: doc.location,
        investigationSteps: doc.investigationSteps || [],
        analysisDurationSeconds: Number(doc.analysisDurationSeconds) || 1.0,
        hitlOutcome: doc.hitlOutcome,
        llmReasoning: doc.llmReasoning,
        llmScoreAdjustment: doc.llmScoreAdjustment,
      }));

      return sanitized;
    } catch (err: any) {
      console.warn('Falling back to local cache for getFlaggedTransactions:', err.message);
      let list = this.transactionMemoryCache.filter((t) =>
        ['VERIFY', 'PAUSED', 'BLOCKED'].includes(t.status)
      );
      if (status && ['VERIFY', 'PAUSED', 'BLOCKED'].includes(status)) {
        list = list.filter((t) => t.status === status);
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list.slice(0, limit);
    }
  }

  public async saveTransaction(txn: MongoTransaction): Promise<MongoTransaction> {
    const record: MongoTransaction = {
      ...txn,
      createdAt: txn.createdAt || new Date().toISOString(),
      currency: txn.currency || '₹',
    };

    try {
      const col = await this.getTransactionCollection();
      await col.updateOne({ id: record.id }, { $set: record }, { upsert: true });
    } catch (err: any) {
      console.warn('Failed to upsert transaction directly in Atlas, saving to local cache:', err.message);
    }

    // Update memory cache
    const existingIdx = this.transactionMemoryCache.findIndex((t) => t.id === record.id);
    if (existingIdx >= 0) {
      this.transactionMemoryCache[existingIdx] = record;
    } else {
      this.transactionMemoryCache.unshift(record);
    }

    return record;
  }

  public async updateTransactionStatus(
    id: string,
    status: 'SAFE' | 'VERIFY' | 'PAUSED' | 'BLOCKED',
    hitlOutcome?: 'pending' | 'confirmed' | 'cancelled'
  ): Promise<MongoTransaction | null> {
    const updateDoc: any = { status };
    if (hitlOutcome) {
      updateDoc.hitlOutcome = hitlOutcome;
    }

    try {
      const col = await this.getTransactionCollection();
      await col.updateOne({ id }, { $set: updateDoc });
    } catch (err: any) {
      console.warn('Failed to update transaction status in Atlas:', err.message);
    }

    const cached = this.transactionMemoryCache.find((t) => t.id === id);
    if (cached) {
      cached.status = status;
      if (hitlOutcome) cached.hitlOutcome = hitlOutcome;
      return cached;
    }
    return null;
  }

  public async getDashboardSummary(): Promise<{
    totalTransactions: number;
    screenedVolume: number;
    flaggedCount: number;
    pausedCount: number;
    blockedCount: number;
    verifyCount: number;
    safeCount: number;
    averageRiskScore: number;
    savedFromScams: number;
    riskDistribution: {
      lowRisk: number;
      mediumRisk: number;
      highRisk: number;
      criticalRisk: number;
    };
    recentFlagged: MongoTransaction[];
    recentTransactions: MongoTransaction[];
    activityData: {
      '7D': Array<{ date: string; volume: number; safe: number; blocked: number; count: number; threats: number }>;
      '30D': Array<{ date: string; volume: number; safe: number; blocked: number; count: number; threats: number }>;
      '90D': Array<{ date: string; volume: number; safe: number; blocked: number; count: number; threats: number }>;
    };
  }> {
    const all = await this.getTransactions({ limit: 500 });

    let screenedVolume = 0;
    let safeCount = 0;
    let verifyCount = 0;
    let pausedCount = 0;
    let blockedCount = 0;
    let totalRisk = 0;

    let lowRisk = 0;
    let mediumRisk = 0;
    let highRisk = 0;
    let criticalRisk = 0;

    for (const t of all) {
      screenedVolume += t.amount;
      totalRisk += (t.riskScore || 0);
      if (t.status === 'SAFE') safeCount++;
      else if (t.status === 'VERIFY') verifyCount++;
      else if (t.status === 'PAUSED') pausedCount++;
      else if (t.status === 'BLOCKED') blockedCount++;

      if (t.riskScore < 25) lowRisk++;
      else if (t.riskScore < 60) mediumRisk++;
      else if (t.riskScore < 85) highRisk++;
      else criticalRisk++;
    }

    const flaggedCount = verifyCount + pausedCount + blockedCount;
    const averageRiskScore = all.length > 0 ? Math.round(totalRisk / all.length) : 0;
    const savedFromScams = all
      .filter((t) => t.status === 'BLOCKED' || t.status === 'PAUSED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const flaggedList = all.filter((t) => ['VERIFY', 'PAUSED', 'BLOCKED'].includes(t.status));

    // Generate dynamic activity buckets for charts
    const now = Date.now();
    const generateActivity = (days: number) => {
      const result: Array<{ date: string; volume: number; safe: number; blocked: number; count: number; threats: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * 24 * 3600 * 1000);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const dateKey = d.toISOString().split('T')[0];

        // Sum matching transactions
        const dayMatches = all.filter((t) => {
          const tDate = (t.createdAt || '').split('T')[0];
          return tDate === dateKey;
        });

        const safeMatches = dayMatches.filter((t) => t.status === 'SAFE');
        const threatMatches = dayMatches.filter((t) => t.status !== 'SAFE');

        const dayVolume = dayMatches.reduce((acc, curr) => acc + curr.amount, 0);
        const safeVol = safeMatches.reduce((acc, curr) => acc + curr.amount, 0);
        const blockedVol = threatMatches.reduce((acc, curr) => acc + curr.amount, 0);

        result.push({
          date: dayLabel,
          volume: dayVolume,
          safe: safeVol,
          blocked: blockedVol,
          count: dayMatches.length,
          threats: threatMatches.length,
        });
      }
      return result;
    };

    return {
      totalTransactions: all.length,
      screenedVolume,
      flaggedCount,
      pausedCount,
      blockedCount,
      verifyCount,
      safeCount,
      averageRiskScore,
      savedFromScams,
      riskDistribution: {
        lowRisk,
        mediumRisk,
        highRisk,
        criticalRisk,
      },
      recentFlagged: flaggedList.slice(0, 10),
      recentTransactions: all.slice(0, 10),
      activityData: {
        '7D': generateActivity(7),
        '30D': generateActivity(30),
        '90D': generateActivity(90),
      },
    };
  }
}

export const mongoService = new MongoService();
