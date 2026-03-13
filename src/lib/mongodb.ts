import { MongoClient, Db, ObjectId } from "mongodb";

// Re-export ObjectId so routes only need to import from here
export { ObjectId };

let _warnedAboutMissingUrl = false;

function buildMongoUri(): string {
  const rawUri = process.env.DATABASE_URL;
  const rawPassword = process.env.DATABASE_PASSWORD;

  if (!rawUri) {
    if (!_warnedAboutMissingUrl) {
      _warnedAboutMissingUrl = true;
      console.warn(
        "[mongodb] DATABASE_URL is not set. Falling back to mongodb://localhost:27017/libplay. " +
          "Copy .env.example to .env.local and set DATABASE_URL to your MongoDB connection string."
      );
    }
    return "mongodb://localhost:27017/libplay";
  }

  if (rawUri.includes("<db_password>")) {
    if (!rawPassword) {
      throw new Error(
        "DATABASE_PASSWORD is required when DATABASE_URL contains <db_password>."
      );
    }
    return rawUri.replace("<db_password>", encodeURIComponent(rawPassword));
  }

  return rawUri;
}

const DB_NAME = process.env.DATABASE_NAME || "libplay";

const CLIENT_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 20000,
  maxPoolSize: 10,
};

// In development, cache the client on the global object so it survives hot-reloads.
// In production, keep a module-level singleton.
// Both caches are cleared on connection failure so the next request creates a fresh client.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

let _productionClient: MongoClient | undefined;

function getClient(): MongoClient {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(buildMongoUri(), CLIENT_OPTIONS);
    }
    return global._mongoClient;
  }

  if (!_productionClient) {
    _productionClient = new MongoClient(buildMongoUri(), CLIENT_OPTIONS);
  }
  return _productionClient;
}

export async function getDb(): Promise<Db> {
  const client = getClient();
  try {
    // connect() is idempotent and safe to call multiple times
    await client.connect();
    return client.db(DB_NAME);
  } catch (error: unknown) {
    // Reset the cached client so the next request creates a fresh one and can
    // recover automatically once the database becomes reachable again.
    if (process.env.NODE_ENV === "development") {
      global._mongoClient = undefined;
    } else {
      _productionClient = undefined;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to connect to MongoDB. ${message}. Verify DATABASE_URL, Atlas network access, and outbound TCP access to port 27017.`
    );
  }
}
