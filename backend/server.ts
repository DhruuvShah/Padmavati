import "dotenv/config";
import { createApp } from "./src/app";

const PORT = parseInt(process.env.PORT || "3001");

const app = createApp();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
