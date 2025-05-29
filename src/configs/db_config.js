
import mongoose from 'mongoose'
import dotenv from "dotenv";
dotenv.config();
// db config ;
const dbConfig = async () => {
    try {
        let db = mongoose.connect(process.env.MONGODB_URL)
        console.log("DB CONNCTED")
    } catch (error) {
        console.log("error", error);
    }
}

export default dbConfig