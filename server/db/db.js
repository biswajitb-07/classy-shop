import mongoose from "mongoose";

const dropLegacySupportConversationIndex = async () => {
  try {
    const collection = mongoose.connection.db.collection("supportconversations");
    const indexes = await collection.indexes();
    const legacyUserIndex = indexes.find(
      (index) => index.name === "user_1" && index.unique,
    );

    if (legacyUserIndex) {
      await collection.dropIndex("user_1");
      console.log(
        "Dropped legacy unique index supportconversations.user_1 for multi-chat support.",
      );
    }
  } catch (error) {
    if (error?.codeName !== "NamespaceNotFound") {
      console.error("Failed to update support conversation indexes:", error);
    }
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/falcon`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await dropLegacySupportConversationIndex();
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

export default connectDB;
