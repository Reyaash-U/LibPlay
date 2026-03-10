import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/libplay";

async function main() {
  console.log("🌱 Seeding database with raw MongoDB driver...");

  const client = new MongoClient(uri);

  try {
    await client.connect();
    // Just hardcode the DB name to be safe
    const db = client.db("libplay");

    const usersCollection = db.collection("users");

    // Clear existing users
    await usersCollection.deleteMany({});
    console.log("Cleared existing users.");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const usersToInsert = [
      {
        email: "staff@library.com",
        name: "Library Staff",
        password: hashedPassword,
        role: "STAFF",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: "staff2@library.com",
        name: "Staff Member 2",
        password: hashedPassword,
        role: "STAFF",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: "librarian@library.com",
        name: "Head Librarian",
        password: hashedPassword,
        role: "LIBRARIAN",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: "display@library.com",
        name: "Display Screen",
        password: hashedPassword,
        role: "DISPLAY",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await usersCollection.insertMany(usersToInsert);

    const check = await usersCollection.find({}).toArray();
    console.log("Database now contains users:", check);

    console.log("✅ Created users:");
    console.log(`   Staff: staff@library.com (password: password123)`);
    console.log(`   Staff: staff2@library.com (password: password123)`);
    console.log(`   Librarian: librarian@library.com (password: password123)`);
    console.log(`   Display: display@library.com (password: password123)`);
    console.log("");
    console.log("🎉 Seeding complete!");

  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}
