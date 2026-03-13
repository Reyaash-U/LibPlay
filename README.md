# LibPlay

A Next.js library media management application backed by MongoDB.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MongoDB connection string (see below) |
| `DATABASE_NAME` | MongoDB database name (default: `libplay`) |
| `DATABASE_PASSWORD` | Optional – if `DATABASE_URL` contains the `<db_password>` placeholder, set the password here instead of embedding it in the URL |
| `JWT_SECRET` | Secret key for signing JWT tokens – use a long, random string in production |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (for media uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Same as `CLOUDINARY_CLOUD_NAME`, exposed to the browser |

#### MongoDB options

**Local MongoDB:**
```
DATABASE_URL="mongodb://127.0.0.1:27017/libplay"
```

**MongoDB Atlas:**
1. Create a free cluster at <https://www.mongodb.com/cloud/atlas>.
2. Under **Network Access**, add your IP address (or `0.0.0.0/0` for development).
3. Create a database user and copy the connection string.
4. Paste it into `.env.local`:
```
DATABASE_URL="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
```
Or use the placeholder approach:
```
DATABASE_URL="mongodb+srv://<username>:<db_password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
DATABASE_PASSWORD="your-atlas-password"
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Seed the database (optional)

With the dev server running:

```bash
npm run db:seed
```
